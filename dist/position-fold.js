import { readAllPositionStreams } from "./positions.js";
import { resetPositionSchema, withTransaction } from "./db.js";
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
function inAppendOrder(streams) {
    const ordered = [...streams].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    const flat = [];
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
export function foldPositions(streams = readAllPositionStreams()) {
    const byTopic = new Map();
    for (const folded of inAppendOrder(streams)) {
        const key = folded.event.topic_key;
        const chain = byTopic.get(key);
        const placed = { ...folded, seq: chain ? chain.length : 0 };
        if (chain)
            chain.push(placed);
        else
            byTopic.set(key, [placed]);
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
export function liveEvent(topic) {
    return topic.chain[topic.chain.length - 1];
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
export function materializePositionFold(db, streams = readAllPositionStreams()) {
    const start = Date.now();
    const topics = foldPositions(streams);
    resetPositionSchema(db);
    const insertEvent = db.prepare(`INSERT INTO position_events (topic_key, seq, event_id, kind, stance, ts, session_id, revises, month)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertRef = db.prepare(`INSERT OR REPLACE INTO position_refs (topic_key, seq, path, hash) VALUES (?, ?, ?, ?)`);
    const insertTopic = db.prepare(`INSERT INTO positions (topic_key, live_seq, event_count) VALUES (?, ?, ?)`);
    let events = 0;
    withTransaction(db, () => {
        for (const topic of topics) {
            for (const { seq, month, event } of topic.chain) {
                insertEvent.run(topic.topicKey, seq, event.id, event.kind, event.stance, event.time, event.session_id ?? null, event.revises ?? null, month);
                for (const ref of event.refs)
                    insertRef.run(topic.topicKey, seq, ref.path, ref.hash);
                events++;
            }
            insertTopic.run(topic.topicKey, liveEvent(topic).seq, topic.chain.length);
        }
    });
    return { topics: topics.length, events, months: streams.length, ms: Date.now() - start };
}
//# sourceMappingURL=position-fold.js.map