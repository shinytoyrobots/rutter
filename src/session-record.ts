import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { config } from "./config.js";
import { atomicWrite } from "./fs-safe.js";
import { RefSchema, type VersionedRef } from "./refs.js";
import { WorkspaceSchema } from "./workspace.js";

/**
 * The on-disk format of a session record and the operations over it. One file
 * per day at `_librarian/sessions/<YYYY-MM-DD>.md`; a day accretes one entry per
 * Claude Code session. The typed frontmatter is the source of truth; the
 * markdown body is a regenerated human-legible view.
 *
 * The frontmatter schema is intentionally mdbase-shaped (SR-100): a collection
 * id, a typed `day`, a list of typed session entries, and an aggregate typed
 * `refs` list -- so adopting mdbase at H2 is a drop-in, not a migration.
 */

export const COLLECTION = "librarian.sessions";
/**
 * The record format version. It stays at `@1` across spec v3.1.0: `workspace` is
 * an ADDITIVE-OPTIONAL field, so every record written before v3.1.0 still
 * validates unchanged and there is no migration to run (SCN-005/AC-additive-optional,
 * COR-R-021; dissent-2026-07-25-0002 was checked against this change and not
 * reactivated). Bumping this id is what a *breaking* shape change would look like.
 */
export const SCHEMA_ID = "session-record@1";

export const SessionEntrySchema = z.object({
  id: z.string(), // capture timestamp compacted, unique within the day
  session_id: z.string().optional(), // Claude Code session id, when the hook has it
  time: z.string(), // ISO-8601 instant of capture
  summary: z.string(), // the one curated, inert line
  refs: z.array(RefSchema), // versioned identities this session touched
  // Where the session happened (SCN-005). Optional in both directions: absent on
  // pre-v3.1.0 entries, and omitted on any capture whose cwd was unavailable.
  workspace: WorkspaceSchema.optional(),
});
export type SessionEntry = z.infer<typeof SessionEntrySchema>;

export const RecordSchema = z.object({
  collection: z.literal(COLLECTION),
  schema: z.string(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessions: z.array(SessionEntrySchema).min(1),
  refs: z.array(RefSchema), // aggregate of every session's refs (COR-R-016)
});
export type SessionRecord = z.infer<typeof RecordSchema>;

/** Absolute path of the record file for a given `YYYY-MM-DD` day. */
export function recordPath(day: string): string {
  return path.join(config.sessionsDir, `${day}.md`);
}

/**
 * Parse and validate a record file. Returns `null` (never throws) for a missing
 * or malformed file, so a single corrupt record can't take down librarian-recent
 * or the search path (keeps the error off stdout too -- INV-5).
 */
export function readRecord(day: string): SessionRecord | null {
  return parseRecordFile(recordPath(day));
}

function parseRecordFile(abs: string): SessionRecord | null {
  let raw: string;
  try {
    raw = fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = matter(raw);
    const result = RecordSchema.safeParse(parsed.data);
    return result.success ? result.data : null;
  } catch {
    return null; // malformed YAML -- treat as absent rather than crash
  }
}

/** Every valid record on disk, unordered (recent.ts imposes the ordering). */
export function readAllRecords(): SessionRecord[] {
  let files: string[];
  try {
    files = fs.readdirSync(config.sessionsDir);
  } catch {
    return []; // no sessions dir yet -- the legitimate empty state
  }
  const records: SessionRecord[] = [];
  for (const name of files) {
    if (!name.endsWith(".md")) continue;
    const record = parseRecordFile(path.join(config.sessionsDir, name));
    if (record) records.push(record);
  }
  return records;
}

/**
 * Normalized dedupe key for one entry (SR-013). Built ONLY from already-inert,
 * server-derived fields -- the toInertLine'd summary and the resolved ref PATHS
 * (normalized by the server, never trusted from the client) -- so the comparison
 * is on normalized content, never on raw input. Paths are sorted so ordering
 * cannot defeat the match. The session id is part of the key, so the same
 * directive in two different sessions is (correctly) not a duplicate.
 *
 * TWO fields are deliberately NOT part of this key, for the same reason: identity
 * is the *directive*, not the world around it.
 *   - Workspace provenance (SR-018): a Stop firing whose cwd drifted (a rename, a
 *     subdirectory, or no cwd at all) is still the same directive (COR-R-022).
 *   - A ref's CONTENT HASH (SR-024, added v3.3.0): a Stop firing after Robin edited
 *     a referenced note *again* is still the same directive. Keying on the hash was
 *     the second of two leaks behind the replicative-entries finding -- it produced
 *     pairs of entries with byte-identical summaries whose only difference was a
 *     hash that moved (observed 2026-07-27 at 07:20/07:26 and 07:32/07:35), which
 *     carries no recall meaning. Hashes are still RECORDED on the entry; they are
 *     just inert for identity. Note this narrowing is strictly safe: it can only
 *     ever merge entries whose summaries are already identical, so no distinct
 *     recalled meaning can be lost. It does mean the retained hash is the
 *     FIRST-read one -- correct, since a versioned ref records what Robin saw when
 *     the directive was written, and the no-op writes nothing by definition.
 */
function contentKey(sessionId: string, summary: string, refs: VersionedRef[]): string {
  const refKey = refs.map((r) => r.path).sort();
  // JSON-encode the tuple so field boundaries are unambiguous: no crafted
  // session id or summary can smuggle a separator to collide two distinct
  // directives into one key (or split one into two) -- fail-closed on identity.
  return JSON.stringify([sessionId, summary, refKey]);
}

/**
 * SR-013 idempotence guard: is an entry with this entry's session id AND
 * identical normalized content already recorded ANYWHERE in
 * `_librarian/sessions/`? The scan spans every day's record, not just the
 * entry's own day, because a session can straddle the UTC midnight boundary --
 * the first capture may live in a previous day's file, and dedupe must still
 * find it. An entry with NO session id has no dedupe key (SR-013 is scoped to
 * carrier-of-session-id captures), so it is never treated as a duplicate and
 * keeps plain append behavior -- matching the direct-CLI test-payload path.
 */
export function isDuplicateEntry(entry: SessionEntry): boolean {
  if (!entry.session_id) return false; // no dedupe key -> append (SR-013 scope)
  const key = contentKey(entry.session_id, entry.summary, entry.refs);
  for (const record of readAllRecords()) {
    for (const s of record.sessions) {
      if (s.session_id === entry.session_id && contentKey(s.session_id, s.summary, s.refs) === key) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Add one session entry to its day's record, preserving every prior entry
 * (INV-3: records are only appended, never destroyed). The read-merge-write is
 * published atomically via temp-then-rename (see fs-safe.atomicWrite), so a
 * pre-existing record is replaced by a superset, never truncated in place.
 *
 * Idempotence/revision (SR-013/SR-014) is decided by the caller before this is
 * reached (see capture.ts): an unchanged directive never gets here, a changed
 * one appends a fresh entry alongside the untouched earlier ones.
 */
export function appendSession(day: string, entry: SessionEntry): void {
  const existing = readRecord(day);
  const sessions = existing ? [...existing.sessions, entry] : [entry];
  const record: SessionRecord = {
    collection: COLLECTION,
    schema: SCHEMA_ID,
    day,
    sessions,
    refs: aggregateRefs(sessions),
  };
  atomicWrite(recordPath(day), serializeRecord(record));
}

/**
 * Union of all sessions' refs, de-duplicated by path+hash. Entries are CLONED so
 * the aggregate never shares object identity with `sessions[].refs`; otherwise
 * the YAML serialiser would emit anchors/aliases (&ref/*ref) for the shared
 * objects, which is valid but noisy and surprising to re-readers.
 */
function aggregateRefs(sessions: SessionEntry[]): VersionedRef[] {
  const seen = new Map<string, VersionedRef>();
  for (const s of sessions) {
    for (const ref of s.refs) seen.set(`${ref.path}@${ref.hash}`, { path: ref.path, hash: ref.hash });
  }
  return [...seen.values()];
}

/** Frontmatter (typed source of truth) + a regenerated human-readable body. */
export function serializeRecord(record: SessionRecord): string {
  const body = renderBody(record);
  // gray-matter serialises the data through js-yaml, which quotes/escapes every
  // string value -- so a summary that looks like YAML (`---`, `admin: true`) is
  // stored as an inert scalar and cannot inject frontmatter (SEC-A-001..003).
  // `lineWidth: -1` disables folding so long content-hashes stay on one line.
  return matter.stringify(body, record, { lineWidth: -1 } as Parameters<typeof matter.stringify>[2]);
}

function renderBody(record: SessionRecord): string {
  const lines = record.sessions.map((s) => {
    const time = s.time.slice(11, 19); // HH:MM:SS of the ISO instant
    const provenance = s.refs.map((r) => `${r.path}@${r.hash.slice(0, 14)}`).join(", ");
    // The project is shown when the entry carries provenance and simply omitted
    // when it does not -- no placeholder for pre-v3.1.0 entries (SR-019's
    // quiet-when-absent rule, applied to the human-readable view too).
    const project = s.workspace ? ` [${s.workspace.project}]` : "";
    return `- ${time}${project} - ${s.summary}${provenance ? ` (refs: ${provenance})` : ""}`;
  });
  return `# Sessions - ${record.day}\n\n${lines.join("\n")}\n`;
}
