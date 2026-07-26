import { resetLibrarian, writeNote, sessionsDir } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { captureSession } from "../src/capture.js";
import { recent } from "../src/recent.js";

beforeEach(resetLibrarian);

/** Capture one entry dated at noon UTC on `day`. */
function seed(day: string, summary: string, refs?: string[]): void {
  captureSession({ summary, refs, now: new Date(`${day}T12:00:00.000Z`) });
}

test("COR-R-005 SCN-002/AC-1: entries are ordered most-recent-first by session date", () => {
  seed("2026-07-20", "twenty");
  seed("2026-07-22", "twenty-two");
  seed("2026-07-24", "twenty-four");
  const days = recent().entries.map((e) => e.day);
  assert.deepEqual(days, ["2026-07-24", "2026-07-22", "2026-07-20"]);
});

test("COR-R-006 SCN-002/AC-2: each entry carries its date and versioned provenance", () => {
  writeNote("Notes/foo.md", "# Foo\nbody");
  seed("2026-07-24", "Concluded foo.", ["Notes/foo.md"]);
  const entry = recent().entries[0]!;
  assert.equal(entry.day, "2026-07-24", "date present");
  assert.equal(entry.refs[0]!.path, "Notes/foo.md");
  assert.match(entry.refs[0]!.hash, /^sha256:[0-9a-f]{64}$/, "versioned identity, not bare path");
});

test("COR-R-007 SCN-002/AC-3: a window and a count limit both restrict results", () => {
  for (const day of ["10", "12", "14", "16", "18", "20", "22", "24"]) {
    seed(`2026-07-${day}`, `s${day}`);
  }
  const now = new Date("2026-07-24T23:59:59.000Z");
  const windowed = recent({ windowDays: 7, now }).entries.map((e) => e.day);
  assert.deepEqual(windowed, ["2026-07-24", "2026-07-22", "2026-07-20", "2026-07-18"], "last 7 days only");
  const counted = recent({ count: 3 }).entries.map((e) => e.day);
  assert.deepEqual(counted, ["2026-07-24", "2026-07-22", "2026-07-20"], "exactly the 3 most recent");
});

test("COR-R-008 SCN-002/AC-4: with no records the reader reports an explicit empty state", () => {
  const result = recent();
  assert.equal(result.empty, true, "distinct empty-state flag, not an error");
  assert.deepEqual(result.entries, []);
});

test("COR-A-005 SCN-002/AC-1: every returned entry traces to a real on-disk record (no phantoms)", () => {
  seed("2026-07-23", "real one");
  seed("2026-07-24", "real two");
  const entries = recent().entries;
  assert.equal(entries.length, 2, "returned count equals on-disk session count");
  for (const e of entries) {
    assert.ok(fs.existsSync(path.join(sessionsDir, `${e.day}.md`)), `${e.day} is backed by a file`);
  }
});

test("COR-A-008 SCN-002/AC-1: ordering follows session date even when file mtimes are inverted", () => {
  seed("2026-07-20", "old session");
  seed("2026-07-24", "new session");
  // Invert filesystem timestamps: make the newest session's file look oldest.
  fs.utimesSync(path.join(sessionsDir, "2026-07-24.md"), new Date("2000-01-01"), new Date("2000-01-01"));
  fs.utimesSync(path.join(sessionsDir, "2026-07-20.md"), new Date("2030-01-01"), new Date("2030-01-01"));
  assert.equal(recent().entries[0]!.day, "2026-07-24", "order by session date, not mtime");
});
