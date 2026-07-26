import type { SearchResult } from "./search.js";
import { readAllRecords, type SessionRecord } from "./session-record.js";

/**
 * Search enrichment (SCN-003): quietly annotate a search result when a session
 * record shows Robin engaged that note before, and stay silent otherwise. The
 * annotation is ADDITIVE metadata only -- enrich() maps results 1:1 in place, so
 * membership and ranking are byte-identical to the un-enriched S1 search
 * (SR-010, COR-A-004). Unreferenced results get nothing (SR-009, COR-A-007).
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
 */
export function buildReferenceIndex(records: SessionRecord[] = readAllRecords()): ReferenceIndex {
  const index: ReferenceIndex = new Map();
  const at: Map<string, string> = new Map(); // path -> the winning entry's sort key
  for (const record of records) {
    for (const session of record.sessions) {
      const sortKey = `${record.day}T${session.time}`;
      for (const ref of session.refs) {
        if (!at.has(ref.path) || sortKey > at.get(ref.path)!) {
          at.set(ref.path, sortKey);
          index.set(ref.path, { summary: session.summary, date: record.day });
        }
      }
    }
  }
  return index;
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
