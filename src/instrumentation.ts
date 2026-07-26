import fs from "node:fs";
import { config } from "./config.js";
import { appendLine } from "./fs-safe.js";

/**
 * Gate instrumentation (SCN-004): a minimal, append-only local log of when Robin
 * reaches for a stateful behaviour, plus a per-ISO-week count to evaluate the
 * desirability gate ("unprompted >=3x/week for 2 weeks"). The log is a durable
 * JSONL file in `_librarian/`, NOT a DB table -- so it survives a delete-and-
 * rebuild of the index (INV-4) and is never hard-deleted (INV-3, append-only).
 */

export type StatefulKind = "librarian-recent" | "search-signal";

export interface StatefulEvent {
  /** ISO-8601 instant of the invocation. */
  ts: string;
  /** Which stateful behaviour was exercised. */
  kind: StatefulKind;
}

export interface WeeklyCount {
  /** ISO-8601 week label, e.g. `2026-W30`. */
  week: string;
  count: number;
}

/** Append exactly one timestamped event per invocation (SR-011, COR-A-006). */
export function recordStatefulUse(kind: StatefulKind, now: Date = new Date()): void {
  appendLine(config.statefulLogPath, JSON.stringify({ ts: now.toISOString(), kind }));
}

/** Read all logged events; a missing log is simply an empty history. */
export function readEvents(): StatefulEvent[] {
  let raw: string;
  try {
    raw = fs.readFileSync(config.statefulLogPath, "utf8");
  } catch {
    return [];
  }
  const events: StatefulEvent[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      events.push(JSON.parse(line) as StatefulEvent);
    } catch {
      // Skip a torn/partial line rather than failing the whole query.
    }
  }
  return events;
}

/**
 * Bucket events into per-ISO-week counts over an optional inclusive date range
 * (SR-012). Returned ascending by week so a caller can read a run of weeks off
 * directly to evaluate the gate.
 */
export function weeklyCounts(
  range: { from?: Date; to?: Date } = {},
  events: StatefulEvent[] = readEvents()
): WeeklyCount[] {
  const buckets = new Map<string, number>();
  for (const event of events) {
    const at = new Date(event.ts);
    if (range.from && at < range.from) continue;
    if (range.to && at > range.to) continue;
    const week = isoWeekLabel(at);
    buckets.set(week, (buckets.get(week) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0));
}

/** `GGGG-Www` ISO-8601 week label for an instant, computed in UTC. */
export function isoWeekLabel(date: Date): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Standard ISO-8601 week: weeks start Monday and belong to the year of their
 * Thursday. Implemented by shifting the date to that Thursday and measuring
 * whole weeks from the first Thursday of the resulting year.
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // step to this week's Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return { year: d.getUTCFullYear(), week };
}
