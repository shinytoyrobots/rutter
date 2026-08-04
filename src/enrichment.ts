import type { SearchResult } from "./search.js";
import type { DB } from "./db.js";
import { readAllRecords, type SessionRecord } from "./session-record.js";
import { resolveRef } from "./identity.js";
import type { VersionedRef } from "./refs.js";

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
 */

export interface PriorEngagement {
  /** The curated line from the most recent session that touched this note. */
  summary: string;
  /** The session date (`YYYY-MM-DD`) of that engagement. */
  date: string;
}

export interface EnrichedResult extends SearchResult {
  /** Present only when a session record references this result's note. */
  priorEngagement?: PriorEngagement;
}

/** Newest engagement per vault-relative note path, keyed for O(1) lookup. */
export type ReferenceIndex = Map<string, PriorEngagement>;

/**
 * Fold every session's refs into a path -> newest-engagement map. "Newest" is by
 * session day then capture time, so a note touched in several sessions surfaces
 * the most recent conclusion.
 *
 * `db`, when supplied, resolves each ref through the identity projection first
 * (SCN-008): a bound dead ref is indexed under its CURRENT path, so the note's
 * live search result -- not its old, now-nonexistent path -- carries the
 * engagement. An UNRESOLVED ref (SCN-009) has no single current note to
 * attach to, so it is skipped here -- silence, not a wrong guess; nothing about
 * search membership or ranking changes either way (SR-010 unaffected).
 */
export function buildReferenceIndex(
  records: SessionRecord[] = readAllRecords(),
  db?: DB
): ReferenceIndex {
  const index: ReferenceIndex = new Map();
  const at: Map<string, string> = new Map(); // path -> the winning entry's sort key
  for (const record of records) {
    for (const session of record.sessions) {
      const sortKey = `${record.day}T${session.time}`;
      for (const ref of session.refs) {
        const targetPath = db ? resolveIndexTarget(db, ref) : ref.path;
        if (targetPath === null) continue; // unresolved -- no current note to annotate
        if (!at.has(targetPath) || sortKey > at.get(targetPath)!) {
          at.set(targetPath, sortKey);
          index.set(targetPath, { summary: session.summary, date: record.day });
        }
      }
    }
  }
  return index;
}

/** `null` means "unresolved" -- caller skips indexing this ref at all. */
function resolveIndexTarget(db: DB, ref: VersionedRef): string | null {
  const resolution = resolveRef(db, ref);
  return resolution.status === "unresolved" ? null : resolution.path;
}

/**
 * Attach a prior-engagement annotation to each referenced result, preserving the
 * exact input order and set. Returns the enriched list plus how many results
 * carried a signal (the instrumentation layer counts the CALL, not the signals
 * -- see app.ts / COR-A-006).
 */
export function enrich(
  results: SearchResult[],
  index: ReferenceIndex = buildReferenceIndex()
): { results: EnrichedResult[]; signalCount: number } {
  let signalCount = 0;
  const enriched = results.map((result) => {
    const priorEngagement = index.get(result.path);
    if (!priorEngagement) return result; // quiet on unreferenced results
    signalCount++;
    return { ...result, priorEngagement };
  });
  return { results: enriched, signalCount };
}
