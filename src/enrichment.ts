import type { SearchResult } from "./search.js";
import type { DB } from "./db.js";
import { readAllRecords, type SessionRecord } from "./session-record.js";
import { resolveRef } from "./identity.js";

/**
 * Search enrichment (SCN-003): quietly annotate a search result when a session
 * record shows Robin engaged that note before, and stay silent otherwise. The
 * annotation is ADDITIVE metadata only -- enrich() maps results 1:1 in place, so
 * membership and ranking are byte-identical to the un-enriched S1 search
 * (SR-010, COR-A-004). Unreferenced results get nothing (SR-009, COR-A-007).
 *
 * SCN-008/AC-3: when `db` is supplied, a ref whose recorded path has since
 * been renamed is indexed under its CURRENT path (resolved through the
 * identity projection), so the renamed note's search result still carries
 * the prior engagement -- read-time only; the stored ref is never rewritten.
 * Omitting `db` preserves the exact pre-identity behavior (purely additive).
 *
 * SCN-009/SR-043 (gen-2/var-3-reversibility): an UNRESOLVED ref has no single
 * current note to carry a `priorEngagement` -- attaching one would fabricate
 * an engagement the record does not actually establish (constitution
 * prohibition 8). But SR-043 still requires the unresolved state to be
 * rendered, with its candidates, on THIS surface too (not just
 * `librarian-recent`) -- never silently dropped. The additive fix: when one of
 * an unresolved ref's CANDIDATES happens to be among the search results
 * already being enriched, that result carries a separate `unresolvedReference`
 * annotation naming the dead ref and every candidate -- distinct from
 * `priorEngagement`, so a client can never mistake "might be this note" for
 * "was engaged as this note". Enrichment still only annotates results already
 * in the input list -- SR-009/SR-010 are unaffected: no result is added,
 * dropped, or re-ranked because of an unresolved ref.
 *
 * SR-046 (gen-2/var-3-reversibility): a `detected: confirmed` binding's
 * conflict with a fresher automatic exact-hash match (see identity.ts) rides
 * along on `priorEngagement`'s target as a separate `identityConflict` field,
 * for the same reason it is kept separate from `unresolvedReference`: it is
 * additional information about an ALREADY-established engagement, not a
 * replacement of it.
 */

export interface PriorEngagement {
  /** The curated line from the most recent session that touched this note. */
  summary: string;
  /** The session date (`YYYY-MM-DD`) of that engagement. */
  date: string;
}

/** SR-043: an unresolved ref rendered against one of its own candidate notes. */
export interface UnresolvedReference {
  /** The dead ref's recorded (path, hash) -- what session history actually named. */
  from: string;
  hash: string;
  /** Every candidate the identity pass found for this ref (this result's path is one of them). */
  candidates: string[];
  /** Session date of the most recent record carrying this unresolved ref. */
  date: string;
}

export interface EnrichedResult extends SearchResult {
  /** Present only when a session record references this result's note. */
  priorEngagement?: PriorEngagement;
  /**
   * SR-046: present only alongside `priorEngagement` when the confirmed
   * binding behind it conflicts with a fresher automatic exact-hash match
   * elsewhere. `to` is where automatic detection would point; the binding
   * itself (and thus `priorEngagement`'s target) stays the confirmed one.
   */
  identityConflict?: { to: string };
  /**
   * SR-043: present when this result's path is merely a CANDIDATE of an
   * unresolved ref elsewhere in session history. Never co-present with a
   * fabricated `priorEngagement` for the SAME candidacy -- see module doc.
   */
  unresolvedReference?: UnresolvedReference;
}

/**
 * Per-path lookups built once per `buildReferenceIndex` call, each keeping
 * only the NEWEST-by-(day, time) entry for its path -- same "newest engagement
 * wins" rule SCN-003 always had, now also applied to the unresolved-candidate
 * annotation. Three independent maps (not one combined shape) so each is a
 * trivial, separately-rollback-able addition: deleting the `unresolved` /
 * `conflicts` wiring here and in `enrich()` fully reverts to pre-SR-043/046
 * behavior without touching the engagement path at all.
 */
export interface ReferenceIndex {
  engagements: Map<string, PriorEngagement>;
  conflicts: Map<string, { to: string }>;
  unresolved: Map<string, UnresolvedReference>;
}

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
export function buildReferenceIndex(
  records: SessionRecord[] = readAllRecords(),
  db?: DB
): ReferenceIndex {
  const engagements = new Map<string, PriorEngagement>();
  const conflicts = new Map<string, { to: string }>();
  const unresolved = new Map<string, UnresolvedReference>();
  const engagedAt = new Map<string, string>(); // path -> winning engagement's sort key
  const unresolvedAt = new Map<string, string>(); // candidate path -> winning unresolved sort key

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
        if (resolution.conflict) conflicts.set(resolution.path, resolution.conflict);
        else conflicts.delete(resolution.path); // a newer, conflict-free resolution supersedes an older marker
      }
    }
  }
  return { engagements, conflicts, unresolved };
}

/** Record `value` at `key` only if `sortKey` is newer than what is already there. */
function setNewest<T>(index: Map<string, T>, at: Map<string, string>, key: string, sortKey: string, value: T): void {
  if (at.has(key) && sortKey <= at.get(key)!) return;
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
export function enrich(
  results: SearchResult[],
  index: ReferenceIndex = buildReferenceIndex()
): { results: EnrichedResult[]; signalCount: number } {
  let signalCount = 0;
  const enriched = results.map((result) => {
    let out: EnrichedResult = result;
    const priorEngagement = index.engagements.get(result.path);
    if (priorEngagement) {
      signalCount++;
      out = { ...out, priorEngagement };
      const conflict = index.conflicts.get(result.path);
      if (conflict) out = { ...out, identityConflict: conflict };
    }
    const unresolvedReference = index.unresolved.get(result.path);
    if (unresolvedReference) out = { ...out, unresolvedReference };
    return out;
  });
  return { results: enriched, signalCount };
}
