import { config } from "./config.js";
import { normalizeRefPath, type VersionedRef } from "./refs.js";
import type { DB } from "./db.js";
import type { PositionKind } from "./position-directive.js";

/**
 * `librarian-positions`' read model (SCN-011, SR-060..SR-063): the three query
 * modes, and the read-time computation of everything that is NOT stored.
 *
 * This module reads the already-materialized projection and nothing else. It
 * never opens a stream file, never re-folds, and never reaches into SCN-010's
 * write path (SR-058) -- a position captured since the last reindex is simply
 * not here yet, which is the disclosed staleness window, not a bug.
 *
 * The split against its neighbours is deliberate:
 *   - position-fold.ts   decides what is STORED (chain order, live event).
 *   - position-recall.ts decides what is COMPUTED at read time (attribution
 *     dates, retired-ness, dormancy) and which topics a query matches.
 *   - position-render.ts decides how any of it is WORDED, and is pure text.
 * So "when is a topic dormant" is one function in this file with no SQL and no
 * strings around it, and SR-063's promise -- change that rule and no schema
 * migration follows -- is visibly true rather than merely claimed.
 */

/** One event as a read surface sees it. */
export interface RecalledEvent {
  /** Place in the topic's chain, 0-based, oldest first. */
  seq: number;
  kind: PositionKind;
  /** Byte-verbatim as recorded (SR-060). */
  stance: string;
  /** ISO-8601 instant of capture. */
  ts: string;
  sessionId?: string;
  /** The client's explicit supersession pointer, carried through verbatim (SR-052). */
  revises?: string;
  refs: VersionedRef[];
}

/**
 * The provenance SR-062 requires stated whenever a stance is presented. Every
 * field is derived from timestamps already on the chain -- none is stored.
 */
export interface Attribution {
  /**
   * The topic's ORIGINAL `assert` event's timestamp. Absent when the recorded
   * chain contains no `assert` at all (a stream that opens with a `revise`,
   * e.g. because the earlier month was archived away): the renderer says so
   * rather than promoting some other event into the role.
   */
  formed?: string;
  /** The FIRST recorded event's timestamp, whatever its kind. Always present. */
  earliest: string;
  /**
   * The LATEST `revise` event's timestamp, absent when the topic has never
   * been revised. A `reaffirm` re-endorses the current stance without changing
   * it and so never advances this (SR-062, spec v12.0.0) -- it is visible in
   * the chain view instead.
   */
  revised?: string;
  /** The terminal `retire` event's own timestamp; present only when `retired`. */
  retired?: string;
}

/** One topic's answer: its live position, its provenance, and -- on request -- its chain. */
export interface TopicView {
  topicKey: string;
  /** The live event: the last one in append order (a `retire` included). */
  live: RecalledEvent;
  /** True when the live event is a `retire` -- render as a retired stub (SR-060). */
  retired: boolean;
  attribution: Attribution;
  /**
   * Read-time display attribute only (SR-063). Never true for a retired topic:
   * "withdrawn on purpose" and "quietly gone cold" are different facts and a
   * retired stub must not carry the second one.
   */
  dormant: boolean;
  /** Total events recorded for this topic, even when `chain` is omitted. */
  eventCount: number;
  /** The full supersession chain, oldest first. Present ONLY when explicitly requested. */
  chain?: RecalledEvent[];
}

/**
 * SR-061's response envelope, pinned in the type system rather than in the tool
 * handler's head: a topic-key query yields `single` (a view or an explicit
 * miss, never a list, because a topic key is unique in the fold by
 * construction), and free-text / note-identity queries yield `list` (zero or
 * more, because either can plausibly match several topics).
 */
export type RecallResult =
  | { shape: "single"; topicKey: string; topic: TopicView | null }
  | { shape: "list"; topics: TopicView[] };

/** Which of the three modes a caller is asking for (SR-061). */
export type PositionQuery =
  | { mode: "topic"; topicKey: string }
  | { mode: "text"; text: string }
  | { mode: "note"; notePath: string };

export interface RecallOptions {
  /** Include the full supersession chain; default false (live position only). */
  chain?: boolean;
  /** Injectable clock for the dormancy computation. */
  now?: Date;
}

/** Single entry point, so every mode gets identical view construction. */
export function recallPositions(db: DB, query: PositionQuery, opts: RecallOptions = {}): RecallResult {
  switch (query.mode) {
    case "topic": {
      const topic = matchesTopicKey(db, query.topicKey) ? buildView(db, query.topicKey, opts) : null;
      return { shape: "single", topicKey: query.topicKey, topic };
    }
    case "text":
      return { shape: "list", topics: viewsFor(db, topicsMatchingText(db, query.text), opts) };
    case "note":
      return { shape: "list", topics: viewsFor(db, topicsMatchingNote(db, query.notePath), opts) };
  }
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function matchesTopicKey(db: DB, topicKey: string): boolean {
  // Exact match, byte-for-byte: the key is client-chosen and never normalized
  // (SR-053), so the lookup must not normalize either.
  return db.prepare(`SELECT 1 FROM positions WHERE topic_key = ? LIMIT 1`).get(topicKey) !== undefined;
}

/**
 * Free text over STANCE CONTENT, scanning a topic's ENTIRE chain -- a topic
 * surfaces if any of its events matches, live or long superseded (SR-061, spec
 * v14.0.0). Matching scope and response scope are independent: matching on a
 * superseded event still returns the topic's LIVE position by default.
 *
 * All terms must match, case-insensitively, the same contract
 * `librarian-search` states for the vault. Plain substring rather than FTS5
 * stemming, deliberately: a stance is one short line, the corpus is tiny, and
 * a substring match is a rule a reader can predict exactly -- see
 * decision-ledger.md D-text-match.
 */
function topicsMatchingText(db: DB, text: string): string[] {
  const terms = text.toLowerCase().normalize("NFC").split(/\s+/).filter((t) => t !== "");
  if (terms.length === 0) return [];
  const rows = db
    .prepare(`SELECT topic_key, stance FROM position_events`)
    .all() as { topic_key: string; stance: string }[];
  const matched = new Set<string>();
  for (const row of rows) {
    const stance = row.stance.toLowerCase().normalize("NFC");
    if (terms.every((term) => stance.includes(term))) matched.add(row.topic_key);
  }
  return [...matched];
}

/**
 * Positions whose refs include a note, scanning the entire chain the same way
 * free text does.
 *
 * Matched on the note's PATH, across every recorded version of it, not on the
 * exact (path, hash) pair that happens to be recorded -- "that note" is the
 * note, and a note edited once after a position referenced it is still the
 * note the position was about. See decision-ledger.md D-note-identity for the
 * alternative reading and what it would have produced. The recorded hash is
 * still shown per event by the renderer, so the caller can always see WHICH
 * version each event actually saw.
 */
function topicsMatchingNote(db: DB, notePath: string): string[] {
  const normalized = normalizeRefPath(notePath);
  if (normalized === null) return [];
  const rows = db
    .prepare(`SELECT DISTINCT topic_key FROM position_refs WHERE path = ?`)
    .all(normalized) as { topic_key: string }[];
  return rows.map((r) => r.topic_key);
}

// ---------------------------------------------------------------------------
// View construction
// ---------------------------------------------------------------------------

/**
 * Build views for a matched set, newest live position first -- the same
 * "most recent work first" ordering `librarian-recent` uses. Ties break on the
 * topic key so the order is total and a rebuild never reshuffles a listing.
 */
function viewsFor(db: DB, topicKeys: string[], opts: RecallOptions): TopicView[] {
  return topicKeys
    .map((key) => buildView(db, key, opts))
    .sort((a, b) => {
      if (a.live.ts !== b.live.ts) return a.live.ts < b.live.ts ? 1 : -1;
      return a.topicKey < b.topicKey ? -1 : a.topicKey > b.topicKey ? 1 : 0;
    });
}

function buildView(db: DB, topicKey: string, opts: RecallOptions): TopicView {
  const chain = readChain(db, topicKey);
  const live = chain[chain.length - 1]!;
  const retired = live.kind === "retire";
  return {
    topicKey,
    live,
    retired,
    attribution: attributionFor(chain, retired),
    dormant: isDormant(chain, retired, opts.now ?? new Date()),
    eventCount: chain.length,
    ...(opts.chain ? { chain } : {}),
  };
}

/** One topic's full chain, oldest first, with each event's refs attached. */
function readChain(db: DB, topicKey: string): RecalledEvent[] {
  const rows = db
    .prepare(
      `SELECT seq, kind, stance, ts, session_id, revises
         FROM position_events WHERE topic_key = ? ORDER BY seq`
    )
    .all(topicKey) as {
    seq: number;
    kind: string;
    stance: string;
    ts: string;
    session_id: string | null;
    revises: string | null;
  }[];
  const refs = db
    .prepare(`SELECT seq, path, hash FROM position_refs WHERE topic_key = ? ORDER BY seq, path, hash`)
    .all(topicKey) as { seq: number; path: string; hash: string }[];

  const bySeq = new Map<number, VersionedRef[]>();
  for (const ref of refs) {
    const list = bySeq.get(ref.seq);
    if (list) list.push({ path: ref.path, hash: ref.hash });
    else bySeq.set(ref.seq, [{ path: ref.path, hash: ref.hash }]);
  }

  return rows.map((row) => ({
    seq: row.seq,
    kind: row.kind as PositionKind,
    stance: row.stance,
    ts: row.ts,
    ...(row.session_id !== null ? { sessionId: row.session_id } : {}),
    ...(row.revises !== null ? { revises: row.revises } : {}),
    refs: bySeq.get(row.seq) ?? [],
  }));
}

/**
 * SR-062's dates, all derived, none stored. The revision date advances on
 * `revise` and ONLY on `revise` -- a `reaffirm` is an endorsement of the
 * standing stance, not a change to it, and reporting it as a revision would
 * tell the reader the position moved when it did not.
 */
export function attributionFor(chain: RecalledEvent[], retired: boolean): Attribution {
  const asserted = chain.find((e) => e.kind === "assert");
  const revisions = chain.filter((e) => e.kind === "revise");
  const latestRevision = revisions[revisions.length - 1];
  const live = chain[chain.length - 1]!;
  return {
    ...(asserted ? { formed: asserted.ts } : {}),
    earliest: chain[0]!.ts,
    ...(latestRevision ? { revised: latestRevision.ts } : {}),
    ...(retired ? { retired: live.ts } : {}),
  };
}

/**
 * Dormancy (SR-063): computed here, from the chain's own timestamps, and
 * persisted nowhere. "Dormant" means simply that nothing has been recorded
 * about this topic -- no revision, no reaffirmation, no reference -- for longer
 * than `config.positionDormantAfterDays`. It is arithmetic on stored instants,
 * never a judgment about the stance's content (INV-6).
 *
 * A retired topic is never dormant, whatever its dates (spec v13.0.0): it was
 * withdrawn deliberately, and labelling that as "gone quiet" would misreport a
 * decision as neglect.
 */
export function isDormant(chain: RecalledEvent[], retired: boolean, now: Date): boolean {
  if (retired) return false;
  const last = chain[chain.length - 1]!;
  const elapsed = now.getTime() - new Date(last.ts).getTime();
  if (Number.isNaN(elapsed)) return false; // unparseable stored instant: say nothing rather than guess
  return elapsed > config.positionDormantAfterDays * DAY_MS;
}

const DAY_MS = 86_400_000;
