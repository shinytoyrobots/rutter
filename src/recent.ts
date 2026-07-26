import { readAllRecords, type SessionRecord, type SessionEntry } from "./session-record.js";
import { isoDay } from "./capture.js";

/**
 * librarian-recent (SCN-002): "what was I working on lately?" answered from the
 * session records, most-recent-first, each entry carrying its date and the
 * versioned provenance of the notes it touched. Pure over its inputs so it is
 * trivial to test; the server layer adds formatting and instrumentation.
 */

export interface RecentOptions {
  /** Keep only sessions on or after (now - windowDays). */
  windowDays?: number;
  /** Cap the number of returned entries after ordering. */
  count?: number;
  /** Injectable clock for the window cutoff; defaults to now. */
  now?: Date;
}

/** A flattened session entry annotated with the day it belongs to. */
export interface RecentEntry extends SessionEntry {
  day: string;
}

export interface RecentResult {
  entries: RecentEntry[];
  /** True when NO records exist at all -- distinct from a window that matched none. */
  empty: boolean;
}

/**
 * Flatten every session across all records, order reverse-chronologically by
 * SESSION DATE then capture time (never by file mtime, so touching an old file
 * can't fake recency -- COR-A-008), then apply the optional window/count limits.
 */
export function recent(
  opts: RecentOptions = {},
  records: SessionRecord[] = readAllRecords()
): RecentResult {
  const all = flatten(records).sort(byMostRecent);
  let selected = all;

  if (opts.windowDays !== undefined) {
    const cutoff = new Date((opts.now ?? new Date()).getTime() - opts.windowDays * DAY_MS);
    const cutoffDay = isoDay(cutoff);
    selected = selected.filter((e) => e.day >= cutoffDay);
  }
  if (opts.count !== undefined) {
    selected = selected.slice(0, opts.count);
  }

  return { entries: selected, empty: all.length === 0 };
}

const DAY_MS = 86_400_000;

function flatten(records: SessionRecord[]): RecentEntry[] {
  return records.flatMap((r) => r.sessions.map((s) => ({ ...s, day: r.day })));
}

/** Reverse-chronological comparator: later day first, then later capture time. */
function byMostRecent(a: RecentEntry, b: RecentEntry): number {
  if (a.day !== b.day) return a.day < b.day ? 1 : -1;
  return a.time < b.time ? 1 : a.time > b.time ? -1 : 0;
}
