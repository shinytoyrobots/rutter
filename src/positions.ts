import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { config } from "./config.js";
import { atomicWrite } from "./fs-safe.js";
import { RefSchema, type VersionedRef } from "./refs.js";
import { WorkspaceSchema } from "./workspace.js";
import { PositionKindSchema } from "./position-directive.js";

/**
 * The on-disk format of a position-event stream and the operations over it
 * (SCN-010, decision-graph Phase A). Deliberately mirrors session-record.ts's
 * shape one-for-one -- same collection/schema/read/append pattern, one file per
 * calendar MONTH instead of per day (positions are rare; ~1 per session against
 * ~19.3 session outcomes/day) -- so a reader who already knows session-record.ts
 * already knows this module, and Phase B's read path has the same seam to build
 * against that recent.ts already builds against session-record.ts.
 *
 * This file is the ONLY place a position event is durably written (INV-2,
 * confined under `_librarian/positions/` per fs-safe's write-root guard) and the
 * only place SR-050's append-only guarantee (INV-3: a `retire` is a new event,
 * never a rewrite) is enforced.
 */

export const COLLECTION = "librarian.positions";
/**
 * gen-4/var-1-graft Fix 3 (chavruta stability-bias condition for shipping this
 * feature "hot" -- SERVER_INSTRUCTIONS teaching clients to emit the directive
 * -- rather than dark): the wire-format encoding this lineage chose (a
 * distinct `librarian-position` HTML-comment tag, plain-text grammar; see
 * decision-ledger.md D2) is NOT yet ratified by `/flow-spec` over the
 * alternative lineage's shared-tag/JSON-payload choice. Tagging the schema id
 * itself as `-provisional`, before the first real event exists, means any
 * future reader (or spec amendment) can tell FROM THE DATA ALONE which
 * encoding generation produced a given stream file, without guessing from
 * content. Drop the suffix only once a spec amendment ratifies (or replaces)
 * this lineage's wire-format choice -- do not treat this rename as a green
 * light to ship hot on its own; that is a separate decision.
 */
export const SCHEMA_ID = "position-event@1-provisional";

export const PositionEventSchema = z.object({
  id: z.string(), // capture timestamp compacted, unique within the month
  session_id: z.string().optional(),
  time: z.string(), // ISO-8601 instant of capture
  kind: PositionKindSchema,
  topic_key: z.string(), // free-form kebab-case, client-chosen (SR-053: reported, never enforced)
  stance: z.string(), // byte-verbatim (after SR-101 inert-line normalization; see position.ts)
  revises: z.string().optional(), // explicit supersession pointer (SR-052), stored verbatim
  refs: z.array(RefSchema),
  workspace: WorkspaceSchema.optional(),
});
export type PositionEvent = z.infer<typeof PositionEventSchema>;

export const PositionStreamSchema = z.object({
  collection: z.literal(COLLECTION),
  schema: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  events: z.array(PositionEventSchema).min(1),
  refs: z.array(RefSchema), // aggregate of every event's refs, mirrors SessionRecord.refs
});
export type PositionStream = z.infer<typeof PositionStreamSchema>;

/** UTC calendar month (`YYYY-MM`) of an instant; matches session-record's UTC-day convention. */
export function isoMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Absolute path of the stream file for a given `YYYY-MM` month. */
export function positionsPath(month: string): string {
  return path.join(config.positionsDir, `${month}.md`);
}

/**
 * Parse and validate one month's stream file. Returns `null` (never throws) for
 * a missing or malformed file -- same "absent is the legitimate empty state"
 * contract as `session-record.readRecord` -- so a corrupt stream can't take
 * down capture or a future read path.
 */
export function readPositionStream(month: string): PositionStream | null {
  return parseStreamFile(positionsPath(month));
}

function parseStreamFile(abs: string): PositionStream | null {
  let raw: string;
  try {
    raw = fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = matter(raw);
    const result = PositionStreamSchema.safeParse(parsed.data);
    return result.success ? result.data : null;
  } catch {
    return null; // malformed YAML -- treat as absent rather than crash
  }
}

/** Every valid month's stream on disk, unordered. */
export function readAllPositionStreams(): PositionStream[] {
  let files: string[];
  try {
    files = fs.readdirSync(config.positionsDir);
  } catch {
    return []; // no positions dir yet -- the legitimate empty state
  }
  const streams: PositionStream[] = [];
  for (const name of files) {
    if (!name.endsWith(".md")) continue;
    const stream = parseStreamFile(path.join(config.positionsDir, name));
    if (stream) streams.push(stream);
  }
  return streams;
}

/**
 * Normalized dedupe key for one event (SR-049). Built only from already-inert,
 * server-derived fields, the same discipline session-record.ts's `contentKey`
 * uses: kind, topic key, the inert stance, sorted resolved ref PATHS (a ref's
 * content hash stays inert per SR-024's rule, reused here), and -- v4.0.0,
 * flow-panel divergence 1 -- the `revises` field, present-or-absent AND its
 * value, because `revises` is client-authored directive content the same way
 * `stance` is, not derived metadata a client never chose (see
 * decision-ledger.md D1). Two directives differing ONLY in `revises` are
 * therefore NOT duplicates and both append.
 *
 * Workspace provenance is deliberately excluded, mirroring SR-018: identity is
 * the *directive*, never the world around it.
 */
function contentKey(
  sessionId: string,
  kind: string,
  topicKey: string,
  stance: string,
  refs: VersionedRef[],
  revises: string | undefined
): string {
  const refKey = refs.map((r) => r.path).sort();
  return JSON.stringify([sessionId, kind, topicKey, stance, refKey, revises ?? null]);
}

/**
 * SR-049 idempotence guard: is an event with this event's session id AND
 * identical normalized content already recorded ANYWHERE across every month's
 * stream? Scanning every month (not just the event's own) is a deliberate
 * divergence from the narrower "current month only" reading three independent
 * panel readers converged on by luck (2026-08-12 panel, convergent-but-
 * underspecified gap #1) -- see decision-ledger.md D-cross-month: this mirrors
 * session-record.ts's own cross-DAY scan (there, to survive a session
 * straddling UTC midnight), and positions are rare enough (≪1/session) that
 * scanning every stream file costs nothing observable while removing a whole
 * class of month-boundary bugs the narrower reading would still carry. An
 * event with NO session id has no dedupe key and always appends (matches
 * session-record's same carve-out for direct-CLI test payloads).
 */
export function isDuplicatePositionEvent(event: PositionEvent): boolean {
  if (!event.session_id) return false;
  const key = contentKey(event.session_id, event.kind, event.topic_key, event.stance, event.refs, event.revises);
  for (const stream of readAllPositionStreams()) {
    for (const e of stream.events) {
      if (
        e.session_id === event.session_id &&
        contentKey(e.session_id, e.kind, e.topic_key, e.stance, e.refs, e.revises) === key
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Append one position event to its month's stream, preserving every prior
 * event (INV-3: a stream is only ever appended to, never rewritten, reordered,
 * or compacted -- SR-050's retire-is-an-event guarantee lives here, alongside
 * every other kind). Idempotence (SR-049) is decided by the caller (see
 * position.ts) before this is reached, exactly mirroring session-record's split.
 */
export function appendPositionEvent(month: string, event: PositionEvent): void {
  const existing = readPositionStream(month);
  const events = existing ? [...existing.events, event] : [event];
  const stream: PositionStream = {
    collection: COLLECTION,
    schema: SCHEMA_ID,
    month,
    events,
    refs: aggregateRefs(events),
  };
  atomicWrite(positionsPath(month), serializeStream(stream));
}

/** Union of all events' refs, de-duplicated by path+hash (mirrors session-record's aggregateRefs). */
function aggregateRefs(events: PositionEvent[]): VersionedRef[] {
  const seen = new Map<string, VersionedRef>();
  for (const e of events) {
    for (const ref of e.refs) seen.set(`${ref.path}@${ref.hash}`, { path: ref.path, hash: ref.hash });
  }
  return [...seen.values()];
}

/** Frontmatter (typed source of truth) + a regenerated human-readable body. */
export function serializeStream(stream: PositionStream): string {
  const body = renderBody(stream);
  // Same reasoning as session-record.ts: gray-matter serializes through js-yaml,
  // so a stance that looks like YAML is stored as an inert scalar, never able to
  // inject frontmatter (SEC-A-001..003 analogue). `lineWidth: -1` keeps long
  // content-hashes on one line.
  return matter.stringify(body, stream, { lineWidth: -1 } as Parameters<typeof matter.stringify>[2]);
}

function renderBody(stream: PositionStream): string {
  const lines = stream.events.map((e) => {
    const time = e.time.slice(11, 19);
    const provenance = e.refs.map((r) => `${r.path}@${r.hash.slice(0, 14)}`).join(", ");
    const project = e.workspace ? ` [${e.workspace.project}]` : "";
    const revises = e.revises ? ` (revises: ${e.revises})` : "";
    return `- ${time}${project} ${e.kind} ${e.topic_key}: ${e.stance}${revises}${provenance ? ` (refs: ${provenance})` : ""}`;
  });
  return `# Positions - ${stream.month}\n\n${lines.join("\n")}\n`;
}
