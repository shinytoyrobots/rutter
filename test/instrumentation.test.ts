import { resetLibrarian, writeNote } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { reindex } from "../src/indexer.js";
import { captureSession } from "../src/capture.js";
import { runRecent, runSearch } from "../src/app.js";
import { recordStatefulUse, readEvents, weeklyCounts } from "../src/instrumentation.js";

beforeEach(resetLibrarian);

test("COR-R-012 SCN-004/AC-1: one librarian-recent invocation appends exactly one timestamped event", () => {
  runRecent({});
  const events = readEvents();
  assert.equal(events.length, 1, "exactly one event");
  assert.ok(!Number.isNaN(Date.parse(events[0]!.ts)), "event carries a parseable timestamp");
});

test("COR-R-013 SCN-004/AC-2: a signal-bearing search logs one event; a no-signal search logs none", () => {
  writeNote("Notes/foo.md", "# Foo\norbital telemetry alpha");
  writeNote("Notes/baz.md", "# Baz\nunrelated zzztoken");
  reindex();
  captureSession({ summary: "Concluded foo.", refs: ["Notes/foo.md"], now: new Date("2026-07-22T12:00:00Z") });

  runSearch("orbital telemetry"); // surfaces foo's prior engagement -> 1 event
  assert.equal(readEvents().length, 1);

  runSearch("zzztoken"); // matches only the unreferenced note -> 0 events
  assert.equal(readEvents().length, 1, "no-signal search adds nothing");
});

test("COR-A-006 SCN-004/AC-2: one search surfacing many signals still logs exactly one event", () => {
  writeNote("Notes/foo.md", "# Foo\norbital telemetry alpha");
  writeNote("Notes/bar.md", "# Bar\norbital telemetry beta");
  reindex();
  captureSession({ summary: "Touched both.", refs: ["Notes/foo.md", "Notes/bar.md"],
    now: new Date("2026-07-22T12:00:00Z") });

  const { signalCount } = runSearch("orbital telemetry");
  assert.ok(signalCount >= 2, "the call surfaced multiple signals");
  assert.equal(readEvents().length, 1, "but exactly one event is logged for the one invocation");
});

test("COR-R-014 SCN-004/AC-3: per-ISO-week counts derive correctly and every event is timestamped", () => {
  const at = (d: string) => recordStatefulUse("librarian-recent", new Date(`${d}T12:00:00Z`));
  ["2026-07-14", "2026-07-15"].forEach(at); // ISO week 29
  ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23"].forEach(at); // ISO week 30
  ["2026-07-28"].forEach(at); // ISO week 31

  const byWeek = new Map(weeklyCounts().map((w) => [w.week, w.count]));
  assert.equal(byWeek.get("2026-W29"), 2);
  assert.equal(byWeek.get("2026-W30"), 4);
  assert.equal(byWeek.get("2026-W31"), 1);
  assert.ok(readEvents().every((e) => typeof e.ts === "string" && e.ts.length > 0), "all events timestamped");
});
