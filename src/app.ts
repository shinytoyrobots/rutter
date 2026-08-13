import { openDb, type DB } from "./db.js";
import { search, type SearchOptions } from "./search.js";
import { enrich, buildReferenceIndex, type EnrichedResult } from "./enrichment.js";
import { recent, type RecentOptions, type RecentResult } from "./recent.js";
import { recordStatefulUse } from "./instrumentation.js";
import {
  recallPositions,
  type PositionQuery,
  type RecallOptions,
  type RecallResult,
} from "./position-recall.js";

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
  // Resolve once and reuse for both the search itself and the identity-aware
  // reference index (SCN-008), rather than opening the db twice.
  const database = db ?? openDb();
  const { results, signalCount } = enrich(search(query, opts, database), buildReferenceIndex(undefined, database));
  if (signalCount >= 1) recordStatefulUse("search-signal", now);
  return { results, signalCount };
}

/**
 * librarian-positions (SCN-011): log one event per call under its OWN kind,
 * then answer from the already-materialized projection.
 *
 * The kind is distinct from the two SCN-004 gate kinds and is excluded from
 * `weeklyCounts` by `GATE_KINDS` (constitution prohibition 9) -- so this call
 * is visible in the use log without moving the desirability-gate number. Logged
 * once per invocation regardless of mode or how many topics matched, the same
 * counting rule `runRecent` follows.
 *
 * Read-only in the strongest sense: it never folds, never touches the write
 * path, and never opens a stream file (SR-058).
 */
export function runPositions(query: PositionQuery, opts: RecallOptions = {}, db?: DB): RecallResult {
  recordStatefulUse("librarian-positions", opts.now);
  return recallPositions(db ?? openDb(), query, opts);
}
