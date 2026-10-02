import { config } from "./config.js";
import { normalizeRefPath } from "./refs.js";
/** Single entry point, so every mode gets identical view construction. */
export function recallPositions(db, query, opts = {}) {
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
function matchesTopicKey(db, topicKey) {
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
function topicsMatchingText(db, text) {
    const terms = text.toLowerCase().normalize("NFC").split(/\s+/).filter((t) => t !== "");
    if (terms.length === 0)
        return [];
    const rows = db
        .prepare(`SELECT topic_key, stance FROM position_events`)
        .all();
    const matched = new Set();
    for (const row of rows) {
        const stance = row.stance.toLowerCase().normalize("NFC");
        if (terms.every((term) => stance.includes(term)))
            matched.add(row.topic_key);
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
function topicsMatchingNote(db, notePath) {
    const normalized = normalizeRefPath(notePath);
    if (normalized === null)
        return [];
    const rows = db
        .prepare(`SELECT DISTINCT topic_key FROM position_refs WHERE path = ?`)
        .all(normalized);
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
function viewsFor(db, topicKeys, opts) {
    return topicKeys
        .map((key) => buildView(db, key, opts))
        .sort((a, b) => {
        if (a.live.ts !== b.live.ts)
            return a.live.ts < b.live.ts ? 1 : -1;
        return a.topicKey < b.topicKey ? -1 : a.topicKey > b.topicKey ? 1 : 0;
    });
}
function buildView(db, topicKey, opts) {
    const chain = readChain(db, topicKey);
    const live = chain[chain.length - 1];
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
function readChain(db, topicKey) {
    const rows = db
        .prepare(`SELECT seq, kind, stance, ts, session_id, revises
         FROM position_events WHERE topic_key = ? ORDER BY seq`)
        .all(topicKey);
    const refs = db
        .prepare(`SELECT seq, path, hash FROM position_refs WHERE topic_key = ? ORDER BY seq, path, hash`)
        .all(topicKey);
    const bySeq = new Map();
    for (const ref of refs) {
        const list = bySeq.get(ref.seq);
        if (list)
            list.push({ path: ref.path, hash: ref.hash });
        else
            bySeq.set(ref.seq, [{ path: ref.path, hash: ref.hash }]);
    }
    return rows.map((row) => ({
        seq: row.seq,
        kind: row.kind,
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
export function attributionFor(chain, retired) {
    const asserted = chain.find((e) => e.kind === "assert");
    const revisions = chain.filter((e) => e.kind === "revise");
    const latestRevision = revisions[revisions.length - 1];
    const live = chain[chain.length - 1];
    return {
        ...(asserted ? { formed: asserted.ts } : {}),
        earliest: chain[0].ts,
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
export function isDormant(chain, retired, now) {
    if (retired)
        return false;
    const last = chain[chain.length - 1];
    const elapsed = now.getTime() - new Date(last.ts).getTime();
    if (Number.isNaN(elapsed))
        return false; // unparseable stored instant: say nothing rather than guess
    return elapsed > config.positionDormantAfterDays * DAY_MS;
}
const DAY_MS = 86_400_000;
//# sourceMappingURL=position-recall.js.map