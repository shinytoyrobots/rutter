import type { DB } from "./db.js";
import { search, type SearchOptions } from "./search.js";
import { enrich, type EnrichedResult } from "./enrichment.js";
import { recent, type RecentOptions, type RecentResult } from "./recent.js";
import { recordStatefulUse } from "./instrumentation.js";

/**
 * The application seam between the MCP transport (server.ts) and the pure domain
 * modules. It exists to attach the one cross-cutting concern the domain must not
 * own -- stateful-use instrumentation -- in exactly one place, so the counting
 * rule (one event per invocation, never per signal) is obvious and testable
 * without standing up the MCP server. server.ts calls these; so do the tests.
 */

/** librarian-recent: log one stateful-use event per call, then answer. */
export function runRecent(opts: RecentOptions = {}): RecentResult {
  recordStatefulUse("librarian-recent", opts.now);
  return recent(opts);
}

export interface EnrichedSearch {
  results: EnrichedResult[];
  /** How many results carried a prior-engagement signal. */
  signalCount: number;
}

/**
 * librarian-search + enrichment: run the unchanged S1 search, annotate it, and
 * log exactly ONE stateful-use event iff the call surfaced at least one signal
 * -- never one per signal (SR-011, COR-A-006). A no-signal search logs nothing
 * (COR-R-013), keeping the gate metric honest.
 */
export function runSearch(
  query: string,
  opts: SearchOptions = {},
  db?: DB,
  now: Date = new Date()
): EnrichedSearch {
  const { results, signalCount } = enrich(search(query, opts, db));
  if (signalCount >= 1) recordStatefulUse("search-signal", now);
  return { results, signalCount };
}
