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
  /** Keep only entries whose workspace project matches, case-insensitively (SR-019). */
  project?: string;
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
 * can't fake recency -- COR-A-008), then apply the optional project/window/count
 * limits. Filters only ever REMOVE entries: the ordering rule is the same one
 * unfiltered callers get (SCN-006/AC-4), and `empty` keeps meaning "no records at
 * all" rather than "nothing matched".
 */
export function recent(
  opts: RecentOptions = {},
  records: SessionRecord[] = readAllRecords()
): RecentResult {
  const all = flatten(records).sort(byMostRecent);
  let selected = all;

  if (opts.project !== undefined) {
    selected = selected.filter((e) => matchesProject(e, opts.project!));
  }
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

/**
 * Project filter (SR-019). Matches ONLY the entry's derived
 * `workspace.project`, case-insensitively, as a whole name. An entry with no
 * workspace provenance can never match: it is excluded silently rather than
 * fabricated into one by substring-matching its summary or its ref paths, which
 * would invent coverage the record does not have (COR-A-010).
 */
function matchesProject(entry: RecentEntry, project: string): boolean {
  if (!entry.workspace) return false;
  // NFC-normalize both sides so an NFD-spelled filter (macOS paths, some IMEs)
  // matches an NFC-stored project name -- "café" is one project, however spelled.
  return fold(entry.workspace.project) === fold(project.trim());
}

/** Case- and unicode-normalization fold for whole-name project comparison. */
function fold(name: string): string {
  return name.normalize("NFC").toLowerCase();
}

function flatten(records: SessionRecord[]): RecentEntry[] {
  return records.flatMap((r) => r.sessions.map((s) => ({ ...s, day: r.day })));
}

/** Reverse-chronological comparator: later day first, then later capture time. */
function byMostRecent(a: RecentEntry, b: RecentEntry): number {
  if (a.day !== b.day) return a.day < b.day ? 1 : -1;
  return a.time < b.time ? 1 : a.time > b.time ? -1 : 0;
}
