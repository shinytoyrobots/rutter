import { readAllPositionStreams, type PositionEvent, type PositionStream } from "./positions.js";
import { resetPositionSchema, withTransaction, type DB } from "./db.js";

/**
 * The position fold (SCN-011 Phase B, SR-058/SR-059): turn the append-only
 * position-event streams under `_librarian/positions/<YYYY-MM>.md` into the
 * `position_events` / `position_refs` / `positions` projection that
 * `librarian-positions` reads.
 *
 * Deliberately shaped as the note-identity projection is (src/identity.ts):
 * durable data lives in markdown, the SQLite tables are a disposable cache
 * rebuilt WHOLESALE at every reindex and never incrementally patched (INV-4).
 * There is therefore no incremental code path here at all -- SR-058 commits
 * every reindex to a full re-read of every month's file, so there is exactly
 * one algorithm, and "rebuild twice, get the same thing" (SR-059) is the only
 * determinism property there is to test.
 *
 * Two hard boundaries this module keeps:
 *
 *   - REINDEX IS THE ONLY TRIGGER (SR-058). `materializePositionFold` is called
 *     from src/indexer.ts and nowhere else -- in particular NOT from SCN-010's
 *     capture path (src/position.ts), which stays a pure writer that knows
 *     nothing about this projection. That is what makes SR-065's
 *     non-interference guarantee structural rather than merely tested: the
 *     write path has no edge to this code to interfere through. The visible
 *     consequence is a disclosed staleness window -- a position captured
 *     between two reindexes is not recalled until the next one runs.
 *
 *   - NO JUDGMENT (INV-6). Everything below is arithmetic over recorded
 *     fields: append order, kind, timestamps. Nothing infers what a stance
 *     means, whether two topics are "the same", or whether a position still
 *     holds.
 */

/** One event as the fold sees it: the recorded event plus its place in the chain. */
export interface FoldedEvent {
  /** Position in the topic's chain, 0-based, oldest first. */
  seq: number;
  /** `YYYY-MM` of the stream file this event was read from. */
  month: string;
  event: PositionEvent;
}

/** One topic's complete, ordered chain. `live` is always the last element. */
export interface FoldedTopic {
  topicKey: string;
  chain: FoldedEvent[];
}

/**
 * Total append order over every month's stream.
 *
 * Cross-month by construction (SCN-011's cross-month-fold criterion, mirroring
 * SR-049's cross-month idempotence scope): months sort lexicographically, which
 * for `YYYY-MM` is chronological, and within a month the file's own order IS
 * the append order (positions.ts only ever appends, never reorders -- INV-3).
 * So the concatenation is the append order, and no timestamp comparison is
 * needed or wanted: a clock that jumped backwards must not reorder a stream
 * that was genuinely written in the order it is stored in.
 */
function inAppendOrder(streams: PositionStream[]): FoldedEvent[] {
  const ordered = [...streams].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  const flat: FoldedEvent[] = [];
  for (const stream of ordered) {
    for (const event of stream.events) {
      flat.push({ seq: 0, month: stream.month, event }); // seq assigned per-topic below
    }
  }
  return flat;
}

/**
 * Group every event by topic key, preserving append order within each topic
 * and first-appearance order between topics.
 *
 * The topic key is compared BYTE-FOR-BYTE, with no normalization: SR-053 makes
 * the key client-chosen and never server-normalized, so `My Topic` and
 * `my-topic` are two topics here, exactly as they are two keys on disk. Folding
 * them together would be the server deciding what the client meant (INV-6).
 */
export function foldPositions(streams: PositionStream[] = readAllPositionStreams()): FoldedTopic[] {
  const byTopic = new Map<string, FoldedEvent[]>();
  for (const folded of inAppendOrder(streams)) {
    const key = folded.event.topic_key;
    const chain = byTopic.get(key);
    const placed: FoldedEvent = { ...folded, seq: chain ? chain.length : 0 };
    if (chain) chain.push(placed);
    else byTopic.set(key, [placed]);
  }
  return [...byTopic.entries()].map(([topicKey, chain]) => ({ topicKey, chain }));
}

/**
 * The live event of a topic: the last event in append order, full stop.
 *
 * A `retire` is folded like any other event and is simply the last one when it
 * is the last one (SR-060) -- the retired STUB is a rendering of that event,
 * decided at read time (see position-recall.ts), not a stored state and not a
 * removal. An event appended after a retire therefore becomes live in the
 * ordinary way, because SR-060 scopes the terminal treatment to "when the most
 * recent event for a topic key is a `retire`".
 *
 * `revises` deliberately does NOT participate: it is a client-authored
 * supersession POINTER carried through to the chain view for a reader, not an
 * instruction that reorders the stream. See decision-ledger.md D-revises.
 */
export function liveEvent(topic: FoldedTopic): FoldedEvent {
  return topic.chain[topic.chain.length - 1]!;
}

export interface PositionFoldStats {
  /** Distinct topic keys materialized. */
  topics: number;
  /** Total events folded across every month's stream. */
  events: number;
  /** Stream files read. */
  months: number;
  /** Report-only wall time, mirroring the identity pass's SR-104 figure. */
  ms: number;
}

/**
 * Rebuild the position projection from the streams alone (INV-4). Called by
 * reindex, and by nothing else (SR-058).
 *
 * Insertion is ordered by topic first-appearance and then by `seq`, and the
 * tables carry no autoincrement or clock-derived column, so two rebuilds over
 * an unchanged stream write the same rows with the same values in the same
 * order -- SR-059's byte-for-byte guarantee, which position-fold.test.ts
 * asserts against a canonical dump.
 */
export function materializePositionFold(
  db: DB,
  streams: PositionStream[] = readAllPositionStreams()
): PositionFoldStats {
  const start = Date.now();
  const topics = foldPositions(streams);

  resetPositionSchema(db);
  const insertEvent = db.prepare(
    `INSERT INTO position_events (topic_key, seq, event_id, kind, stance, ts, session_id, revises, month)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRef = db.prepare(
    `INSERT OR REPLACE INTO position_refs (topic_key, seq, path, hash) VALUES (?, ?, ?, ?)`
  );
  const insertTopic = db.prepare(
    `INSERT INTO positions (topic_key, live_seq, event_count) VALUES (?, ?, ?)`
  );

  let events = 0;
  withTransaction(db, () => {
    for (const topic of topics) {
      for (const { seq, month, event } of topic.chain) {
        insertEvent.run(
          topic.topicKey,
          seq,
          event.id,
          event.kind,
          event.stance,
          event.time,
          event.session_id ?? null,
          event.revises ?? null,
          month
        );
        for (const ref of event.refs) insertRef.run(topic.topicKey, seq, ref.path, ref.hash);
        events++;
      }
      insertTopic.run(topic.topicKey, liveEvent(topic).seq, topic.chain.length);
    }
  });

  return { topics: topics.length, events, months: streams.length, ms: Date.now() - start };
}
