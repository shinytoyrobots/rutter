import { readAllRecords } from "./session-record.js";
import { resolveRef } from "./identity.js";
/**
 * Fold every session's refs into per-path lookups. "Newest" is by session day
 * then capture time, so a note touched (or named as a candidate) in several
 * sessions surfaces the most recent conclusion.
 *
 * `db`, when supplied, resolves each ref through the identity projection first
 * (SCN-008): a bound dead ref is indexed under its CURRENT path, so the note's
 * live search result -- not its old, now-nonexistent path -- carries the
 * engagement, plus any SR-046 conflict riding with it. An UNRESOLVED ref
 * (SCN-009) is indexed under EACH of its candidates instead (SR-043) --
 * `unresolvedReference`, never `priorEngagement`, for exactly that candidacy.
 * Omitting `db` preserves the exact pre-identity behavior (purely additive):
 * no resolution happens, so no unresolved state can exist to report.
 */
export function buildReferenceIndex(records = readAllRecords(), db) {
    const engagements = new Map();
    const conflicts = new Map();
    const unresolved = new Map();
    const engagedAt = new Map(); // path -> winning engagement's sort key
    const unresolvedAt = new Map(); // candidate path -> winning unresolved sort key
    for (const record of records) {
        for (const session of record.sessions) {
            const sortKey = `${record.day}T${session.time}`;
            for (const ref of session.refs) {
                if (!db) {
                    setNewest(engagements, engagedAt, ref.path, sortKey, { summary: session.summary, date: record.day });
                    continue;
                }
                const resolution = resolveRef(db, ref);
                if (resolution.status === "unresolved") {
                    for (const candidate of resolution.candidates ?? []) {
                        setNewest(unresolved, unresolvedAt, candidate, sortKey, {
                            from: ref.path,
                            hash: ref.hash,
                            candidates: resolution.candidates ?? [],
                            date: record.day,
                        });
                    }
                    continue; // no single current note to attach a prior engagement to (SR-009/SR-010 unaffected)
                }
                setNewest(engagements, engagedAt, resolution.path, sortKey, { summary: session.summary, date: record.day });
                if (resolution.conflict)
                    conflicts.set(resolution.path, resolution.conflict);
                else
                    conflicts.delete(resolution.path); // a newer, conflict-free resolution supersedes an older marker
            }
        }
    }
    return { engagements, conflicts, unresolved };
}
/** Record `value` at `key` only if `sortKey` is newer than what is already there. */
function setNewest(index, at, key, sortKey, value) {
    if (at.has(key) && sortKey <= at.get(key))
        return;
    at.set(key, sortKey);
    index.set(key, value);
}
/**
 * Attach prior-engagement / unresolved-candidate annotations to each result,
 * preserving the exact input order and set. Returns the enriched list plus how
 * many results carried a prior-engagement SIGNAL (unchanged definition -- the
 * instrumentation layer counts the CALL, not the signals, see app.ts /
 * COR-A-006; an unresolved-candidate annotation is informational, not an
 * engagement, so it does not add to `signalCount`).
 */
export function enrich(results, index = buildReferenceIndex()) {
    let signalCount = 0;
    const enriched = results.map((result) => {
        let out = result;
        const priorEngagement = index.engagements.get(result.path);
        if (priorEngagement) {
            signalCount++;
            out = { ...out, priorEngagement };
            const conflict = index.conflicts.get(result.path);
            if (conflict)
                out = { ...out, identityConflict: conflict };
        }
        const unresolvedReference = index.unresolved.get(result.path);
        if (unresolvedReference)
            out = { ...out, unresolvedReference };
        return out;
    });
    return { results: enriched, signalCount };
}
//# sourceMappingURL=enrichment.js.map