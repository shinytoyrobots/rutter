import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { config } from "./config.js";
import { atomicWrite } from "./fs-safe.js";
import { RefSchema, type VersionedRef } from "./refs.js";

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
export const SCHEMA_ID = "session-record@1";

export const SessionEntrySchema = z.object({
  id: z.string(), // capture timestamp compacted, unique within the day
  session_id: z.string().optional(), // Claude Code session id, when the hook has it
  time: z.string(), // ISO-8601 instant of capture
  summary: z.string(), // the one curated, inert line
  refs: z.array(RefSchema), // versioned identities this session touched
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
 * Add one session entry to its day's record, preserving every prior entry
 * (INV-3: records are only appended, never destroyed). The read-merge-write is
 * published atomically via temp-then-rename (see fs-safe.atomicWrite), so a
 * pre-existing record is replaced by a superset, never truncated in place.
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
    return `- ${time} - ${s.summary}${provenance ? ` (refs: ${provenance})` : ""}`;
  });
  return `# Sessions - ${record.day}\n\n${lines.join("\n")}\n`;
}
