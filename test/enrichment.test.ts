import { resetLibrarian, writeNote } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { reindex } from "../src/indexer.js";
import { search } from "../src/search.js";
import { enrich, buildReferenceIndex } from "../src/enrichment.js";
import { captureSession } from "../src/capture.js";

beforeEach(resetLibrarian);

/** Index two notes that both match "orbital telemetry", then return that search. */
function seedTwoMatchingNotes(): void {
  writeNote("Notes/foo.md", "# Foo\norbital telemetry alpha");
  writeNote("Notes/bar.md", "# Bar\norbital telemetry beta");
  reindex();
}

test("COR-R-009 SCN-003/AC-1: a referenced result is annotated with the prior engagement and its date", () => {
  seedTwoMatchingNotes();
  captureSession({ summary: "Concluded foo is the canonical source.", refs: ["Notes/foo.md"],
    now: new Date("2026-07-22T12:00:00Z") });
  const { results } = enrich(search("orbital telemetry"));
  const foo = results.find((r) => r.path === "Notes/foo.md")!;
  assert.ok(foo.priorEngagement, "referenced result carries an annotation");
  assert.equal(foo.priorEngagement.date, "2026-07-22", "annotation names when");
  assert.match(foo.priorEngagement.summary, /canonical source/, "annotation names what was concluded");
});

test("COR-R-010 SCN-003/AC-2: an unreferenced result carries no annotation", () => {
  seedTwoMatchingNotes();
  captureSession({ summary: "Only foo.", refs: ["Notes/foo.md"], now: new Date("2026-07-22T12:00:00Z") });
  const { results } = enrich(search("orbital telemetry"));
  const bar = results.find((r) => r.path === "Notes/bar.md")!;
  assert.equal(bar.priorEngagement, undefined, "quiet when unprompted -- no not-seen-before noise");
});

test("COR-R-011 SCN-003/AC-3: enrichment preserves S1 membership and ranking exactly", () => {
  seedTwoMatchingNotes();
  const baseline = search("orbital telemetry").map((r) => r.path);
  captureSession({ summary: "Touched foo.", refs: ["Notes/foo.md"], now: new Date("2026-07-22T12:00:00Z") });
  const enriched = enrich(search("orbital telemetry")).results.map((r) => r.path);
  assert.deepEqual(enriched, baseline, "same set, same order -- only additive metadata differs");
});

test("COR-A-004 SCN-003/AC-3: a referenced low-ranked note is not promoted and unreferenced results stay silent", () => {
  seedTwoMatchingNotes();
  const baseline = search("orbital telemetry").map((r) => r.path);
  // Reference whichever note ranks LAST, to prove enrichment never re-ranks it up.
  const lowest = baseline[baseline.length - 1]!;
  captureSession({ summary: "Engaged the low-ranked one.", refs: [lowest], now: new Date("2026-07-22T12:00:00Z") });
  const { results } = enrich(search("orbital telemetry"));
  assert.deepEqual(results.map((r) => r.path), baseline, "ranking byte-identical");
  for (const r of results) {
    if (r.path !== lowest) assert.equal(r.priorEngagement, undefined, "no annotation on unreferenced results");
  }
});

test("COR-A-007 SCN-003/AC-2: when nothing is referenced, every result is silent", () => {
  seedTwoMatchingNotes();
  const { results, signalCount } = enrich(search("orbital telemetry"), buildReferenceIndex([]));
  assert.equal(signalCount, 0);
  for (const r of results) assert.equal(r.priorEngagement, undefined);
});
