import { resetLibrarian, writeNote, sessionsDir, increments } from "./setup.js";
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
  const days = increments(recent()).map((e) => e.day);
  assert.deepEqual(days, ["2026-07-24", "2026-07-22", "2026-07-20"]);
});

test("COR-R-006 SCN-002/AC-2: each entry carries its date and versioned provenance", () => {
  writeNote("Notes/foo.md", "# Foo\nbody");
  seed("2026-07-24", "Concluded foo.", ["Notes/foo.md"]);
  const entry = increments(recent())[0]!;
  assert.equal(entry.day, "2026-07-24", "date present");
  assert.equal(entry.refs[0]!.path, "Notes/foo.md");
  assert.match(entry.refs[0]!.hash, /^sha256:[0-9a-f]{64}$/, "versioned identity, not bare path");
});

test("COR-R-007 SCN-002/AC-3: a window and a count limit both restrict results", () => {
  for (const day of ["10", "12", "14", "16", "18", "20", "22", "24"]) {
    seed(`2026-07-${day}`, `s${day}`);
  }
  const now = new Date("2026-07-24T23:59:59.000Z");
  const windowed = increments(recent({ windowDays: 7, now })).map((e) => e.day);
  assert.deepEqual(windowed, ["2026-07-24", "2026-07-22", "2026-07-20", "2026-07-18"], "last 7 days only");
  const counted = increments(recent({ count: 3 })).map((e) => e.day);
  assert.deepEqual(counted, ["2026-07-24", "2026-07-22", "2026-07-20"], "exactly the 3 most recent");
});

test("COR-R-008 SCN-002/AC-4: with no records the reader reports an explicit empty state", () => {
  const result = recent();
  assert.equal(result.empty, true, "distinct empty-state flag, not an error");
  assert.deepEqual(result.sessions, []);
});

test("COR-A-005 SCN-002/AC-1: every returned entry traces to a real on-disk record (no phantoms)", () => {
  seed("2026-07-23", "real one");
  seed("2026-07-24", "real two");
  const entries = increments(recent());
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
  assert.equal(increments(recent())[0]!.day, "2026-07-24", "order by session date, not mtime");
});

// ---------------------------------------------------------------------------
// SCN-002 v3.5.0: the unit of recall is the SESSION, not the Stop firing.
// Fixtures below reproduce the two real shapes from _librarian/sessions/2026-07-27.md
// that motivated the change -- see efforts/.../design-2026-07-27-collapse-at-read.md.
// ---------------------------------------------------------------------------

/** Capture one increment of session `sid` at a given instant, optionally in a project. */
function step(sid: string, time: string, summary: string, cwd?: string): void {
  captureSession({ summary, sessionId: sid, ...(cwd ? { cwd } : {}), now: new Date(time) });
}

test("COR-R-031 SCN-002/AC-grouped (SR-030): three cumulative revisions of one session collapse to ONE session, none dropped", () => {
  // The real 19:04 -> 19:08 -> 19:11 shape: each summary a superset of the last.
  step("S-cumulative", "2026-07-27T19:04:13.000Z", "Designed the evaluation.");
  step("S-cumulative", "2026-07-27T19:08:00.000Z", "Designed the evaluation. Added cost instrumentation.");
  step("S-cumulative", "2026-07-27T19:11:20.000Z", "Designed the evaluation. Added cost instrumentation. Added the results doc.");

  const { sessions } = recent();
  assert.equal(sessions.length, 1, "one session, not three peer entries");
  assert.equal(sessions[0]!.incrementCount, 3, "all three increments retained -- collapse groups, never discards");
  assert.equal(sessions[0]!.abbreviated, false);
  assert.deepEqual(
    sessions[0]!.increments.map((e) => e.time),
    ["2026-07-27T19:04:13.000Z", "2026-07-27T19:08:00.000Z", "2026-07-27T19:11:20.000Z"],
    "increments read oldest-first, as the session happened"
  );
});

test("COR-R-031 SCN-002/AC-grouped (SR-030): the WEAVER shape -- distinct milestones in ONE session are all still there", () => {
  // Ten increments, one session id, three genuinely separate queries sent. This is
  // the case that rules out "newest per session wins": it would keep only #72.
  const sid = "S-weaver";
  step(sid, "2026-07-27T06:49:34.000Z", "Timeout sweep: closed four queries as no-response.");
  step(sid, "2026-07-27T06:57:13.000Z", "Assessed what the sweep unblocks.");
  step(sid, "2026-07-27T07:05:15.000Z", "Confirmed Yeoh never sent.");
  step(sid, "2026-07-27T07:08:30.000Z", "Sent Yeoh as query #70.");
  step(sid, "2026-07-27T07:20:26.000Z", "Ran the tranche-12 scout.");
  step(sid, "2026-07-27T07:26:30.000Z", "Ran the tranche-12 scout, revised.");
  step(sid, "2026-07-27T07:30:05.000Z", "Sent Chanchani as query #71.");
  step(sid, "2026-07-27T07:32:54.000Z", "Built Rhinehart query prep.");
  step(sid, "2026-07-27T07:35:10.000Z", "Built Rhinehart query prep, revised.");
  step(sid, "2026-07-27T07:40:17.000Z", "Sent Rhinehart as query #72.");

  const { sessions } = recent();
  assert.equal(sessions.length, 1, "one session");
  assert.equal(sessions[0]!.incrementCount, 10, "every increment retained");
  const summaries = sessions[0]!.increments.map((e) => e.summary).join(" | ");
  for (const milestone of ["#70", "#71", "#72"]) {
    assert.ok(summaries.includes(milestone), `milestone ${milestone} survives grouping`);
  }
});

test("COR-R-031 SCN-002/AC-grouped (SR-030): one session spanning two projects splits into two", () => {
  const novel = path.join(sessionsDir, "..", "..", "projects", "novel");
  const work = path.join(sessionsDir, "..", "..", "projects", "work-repo");
  fs.mkdirSync(novel, { recursive: true });
  fs.mkdirSync(work, { recursive: true });
  step("S-moved", "2026-07-27T09:00:00.000Z", "Drafted chapter three.", novel);
  step("S-moved", "2026-07-27T11:00:00.000Z", "Fixed the deploy script.", work);

  const { sessions } = recent();
  assert.equal(sessions.length, 2, "grouping key is (session id + project), so a move splits");
  assert.deepEqual(sessions.map((s) => s.project), ["work-repo", "novel"], "newest project-session first");
});

test("COR-R-031 SCN-002/AC-grouped (SR-030): entries with no session id stay separate singletons", () => {
  // Direct-CLI payloads carry no session identity and are unrelated by construction
  // -- exactly as isDuplicateEntry refuses to dedupe them. Bucketing them together
  // would invent a session that never happened.
  seed("2026-07-26", "first anonymous entry");
  seed("2026-07-26", "second anonymous entry");
  const { sessions } = recent();
  assert.equal(sessions.length, 2, "two singleton sessions, not one merged pair");
  for (const s of sessions) assert.equal(s.incrementCount, 1);
});

test("COR-R-031 SCN-002/AC-grouped (SR-030): a session straddling UTC midnight is one session with a day span", () => {
  step("S-midnight", "2026-07-26T23:50:00.000Z", "Started the migration.");
  step("S-midnight", "2026-07-27T00:15:00.000Z", "Finished the migration.");
  const { sessions } = recent();
  assert.equal(sessions.length, 1, "grouping happens after flattening across day files");
  assert.equal(sessions[0]!.day, "2026-07-26", "span starts on the first increment's day");
  assert.equal(sessions[0]!.lastDay, "2026-07-27", "and ends on the last's");
});

test("COR-R-032 SCN-002/AC-3 (SR-031): count caps SESSIONS, so one chatty session cannot eat the budget", () => {
  // The pre-v3.5.0 failure: count:2 against a 5-increment session returned two
  // increments of the same session and hid every other session entirely.
  for (const t of ["09:00", "09:10", "09:20", "09:30", "09:40"]) {
    step("S-chatty", `2026-07-27T${t}:00.000Z`, `chatty step ${t}`);
  }
  step("S-other", "2026-07-27T08:00:00.000Z", "the other session's only step");

  const { sessions } = recent({ count: 2 });
  assert.equal(sessions.length, 2, "two SESSIONS returned");
  assert.deepEqual(sessions.map((s) => s.session_id), ["S-chatty", "S-other"], "both sessions represented");
  assert.equal(sessions[0]!.incrementCount, 5, "and the chatty one keeps all its increments");
});

test("COR-R-033 SCN-002/AC-detail (SR-032): detail:'brief' abbreviates first+last and never omits silently", () => {
  for (const t of ["09:00", "09:10", "09:20", "09:30", "09:40"]) {
    step("S-brief", `2026-07-27T${t}:00.000Z`, `step ${t}`);
  }
  const brief = recent({ detail: "brief" }).sessions[0]!;
  assert.equal(brief.increments.length, 2, "first and last only");
  assert.equal(brief.increments[0]!.summary, "step 09:00");
  assert.equal(brief.increments[1]!.summary, "step 09:40");
  assert.equal(brief.abbreviated, true, "flagged as abbreviated -- the omission is reportable");
  assert.equal(brief.incrementCount, 5, "the TRUE total is still reported, so nothing is hidden");
  // Default is unabbreviated: brief must be opt-in, never a silent cap.
  assert.equal(recent().sessions[0]!.increments.length, 5);
  assert.equal(recent().sessions[0]!.abbreviated, false);
});

test("COR-R-033 SCN-002/AC-detail (SR-032): a short session is returned whole even under brief", () => {
  step("S-short", "2026-07-27T09:00:00.000Z", "only step");
  step("S-two", "2026-07-27T10:00:00.000Z", "first");
  step("S-two", "2026-07-27T10:05:00.000Z", "second");
  for (const s of recent({ detail: "brief" }).sessions) {
    assert.equal(s.abbreviated, false, "1- and 2-increment sessions have nothing to abbreviate");
    assert.equal(s.increments.length, s.incrementCount);
  }
});
