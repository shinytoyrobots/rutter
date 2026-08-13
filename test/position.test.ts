import { resetLibrarian, writeNote, readPositions, positionsExist, readSession, vaultRoot, positionsDir } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { capturePosition, overStanceWordCeiling, stanceWordCount } from "../src/position.js";
import { captureSession } from "../src/capture.js";
import { readPositionStream, PositionStreamSchema } from "../src/positions.js";

/**
 * SCN-010 (decision-graph Phase A): position capture at the `capturePosition`
 * layer -- the position-write-path analogue of capture.test.ts. CLI-level
 * (capture-cli.ts) routing and the byte-compare regression this variant's
 * dispatch requires (SR-055) live in position-cli.test.ts.
 */

beforeEach(resetLibrarian);

const MONTH = "2026-08";
const NOON = new Date("2026-08-24T12:00:00.000Z");

test("SR-047/SR-048: a position captures exactly one event with the full shape", () => {
  const result = capturePosition({
    kind: "assert",
    topicKey: "my-topic",
    rawStance: " I think X because of the meeting.",
    sessionId: "S-1",
    now: NOON,
  });
  assert.equal(result.captured, true);
  const event = result.event!;
  assert.equal(event.kind, "assert");
  assert.equal(event.topic_key, "my-topic");
  assert.equal(event.stance, "I think X because of the meeting.", "byte-verbatim after inert-line trim");
  assert.equal(event.session_id, "S-1");
  assert.ok(event.id, "carries an event id");
  assert.ok(event.time, "carries a timestamp");

  const stream = readPositionStream(MONTH)!;
  assert.equal(stream.events.length, 1);
  assert.equal(
    PositionStreamSchema.safeParse(stream).success,
    true,
    "validates against position-event@1-provisional"
  );
});

test("gen-4/var-1-graft Fix 3: a freshly-written stream is self-describing as the provisional encoding, from the data alone", () => {
  capturePosition({ kind: "assert", topicKey: "t", rawStance: " a stance", sessionId: "S-provisional", now: NOON });
  const raw = readPositions(MONTH);
  assert.match(
    raw,
    /schema:\s*position-event@1-provisional/,
    "the on-disk frontmatter names the provisional encoding BEFORE any spec ratification, so a future reader can tell which encoding generation produced this record without guessing from content"
  );
  const stream = readPositionStream(MONTH)!;
  assert.equal(stream.schema, "position-event@1-provisional");
});

test("SR-048: named refs (via [[wikilink]]) are hashed as-read exactly like session refs", () => {
  const abs = writeNote("Notes/foo.md", "# Foo\ncontent");
  const result = capturePosition({
    kind: "assert",
    topicKey: "t",
    rawStance: " Based on [[Notes/foo.md]], X holds.",
    sessionId: "S-2",
    now: NOON,
  });
  const ref = result.event!.refs[0]!;
  assert.equal(ref.path, "Notes/foo.md");
  const expected = `sha256:${crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")}`;
  assert.equal(ref.hash, expected);
  assert.ok(result.event!.stance.includes("[[Notes/foo.md]]"), "the wikilink stays IN the stored stance, byte-verbatim");
});

test("SR-048: an unresolvable [[wikilink]] is rejected, never stored as a valid ref", () => {
  const result = capturePosition({
    kind: "assert",
    topicKey: "t",
    rawStance: " Based on [[Notes/ghost.md]], X holds.",
    sessionId: "S-3",
    now: NOON,
  });
  assert.equal(result.event!.refs.length, 0);
  assert.deepEqual(result.rejectedRefs, ["Notes/ghost.md"]);
});

test("SR-052: an explicit revises: <event-id> annotation is stored verbatim on the event", () => {
  const result = capturePosition({
    kind: "revise",
    topicKey: "t",
    rawStance: " Now I think Y (revises: 20260810T120000000Z).",
    sessionId: "S-4",
    now: NOON,
  });
  assert.equal(result.event!.revises, "20260810T120000000Z");
});

test("SR-050/INV-3: a retire directive appends a new event; earlier events are untouched", () => {
  const a = capturePosition({ kind: "assert", topicKey: "t", rawStance: " first stance", sessionId: "S-5", now: NOON });
  const b = capturePosition({
    kind: "retire",
    topicKey: "t",
    rawStance: " no longer holds",
    sessionId: "S-5",
    now: new Date("2026-08-24T13:00:00.000Z"),
  });
  assert.equal(b.captured, true);
  const stream = readPositionStream(MONTH)!;
  assert.equal(stream.events.length, 2, "assert + retire, both present -- no event modified, removed, or compacted");
  assert.deepEqual(stream.events[0], a.event, "the FIRST event's bytes are unmodified by the retire append");
  assert.equal(stream.events[1]!.kind, "retire");
});

test("SR-051: supersession order is the stream's append order (deterministic fold, no tiebreak field)", () => {
  capturePosition({ kind: "assert", topicKey: "t", rawStance: " v1", sessionId: "S-6", now: new Date("2026-08-24T09:00:00.000Z") });
  capturePosition({ kind: "revise", topicKey: "t", rawStance: " v2", sessionId: "S-6", now: new Date("2026-08-24T10:00:00.000Z") });
  capturePosition({ kind: "reaffirm", topicKey: "t", rawStance: " v2 still holds", sessionId: "S-6", now: new Date("2026-08-24T11:00:00.000Z") });
  const events = readPositionStream(MONTH)!.events;
  assert.deepEqual(events.map((e) => e.stance), ["v1", "v2", "v2 still holds"], "fold order is physical append order");
});

test("SR-049: a repeat capture of an UNCHANGED directive is a byte-identical no-op, regardless of Stop re-firing", () => {
  const directive = { kind: "assert" as const, topicKey: "t", rawStance: " stance text", sessionId: "S-7" };
  const first = capturePosition({ ...directive, now: new Date("2026-08-24T09:00:00.000Z") });
  assert.equal(first.captured, true);
  const afterFirst = readPositions(MONTH);
  for (let i = 1; i <= 3; i++) {
    const r = capturePosition({ ...directive, now: new Date(`2026-08-24T09:0${i}:00.000Z`) });
    assert.equal(r.captured, false, `re-firing ${i} appends nothing`);
    assert.equal(r.deduped, true);
  }
  assert.equal(readPositions(MONTH), afterFirst, "stream byte-identical after repeat firings");
  assert.equal(readPositionStream(MONTH)!.events.length, 1);
});

test("SR-049: a reaffirm differs by KIND from an otherwise-identical assert and is a distinct event", () => {
  const base = { topicKey: "t", rawStance: " same stance", sessionId: "S-8" };
  capturePosition({ ...base, kind: "assert", now: new Date("2026-08-24T09:00:00.000Z") });
  const r = capturePosition({ ...base, kind: "reaffirm", now: new Date("2026-08-24T09:05:00.000Z") });
  assert.equal(r.captured, true, "different kind -> distinct directive, appends normally");
  assert.equal(readPositionStream(MONTH)!.events.length, 2);
});

test("SR-049 (v4.0.0, flow-panel divergence 1): a directive differing ONLY in `revises` is NOT a duplicate", () => {
  const base = { kind: "revise" as const, topicKey: "t", rawStance: " same stance text", sessionId: "S-9" };
  const first = capturePosition({ ...base, now: new Date("2026-08-24T09:00:00.000Z") });
  assert.equal(first.captured, true);
  assert.equal(first.event!.revises, undefined);

  // Same kind/topic/stance/refs, but NOW carrying an explicit revises pointer
  // embedded in the stance text -- a client correcting/adding the supersession
  // link on a retry. Reading A (excluded from identity) would silently drop
  // this; this variant implements Reading B per the ratified v4.0.0 amendment.
  const withRevises = capturePosition({
    kind: "revise",
    topicKey: "t",
    rawStance: " same stance text (revises: EVT-1)",
    sessionId: "S-9",
    now: new Date("2026-08-24T09:05:00.000Z"),
  });
  assert.equal(withRevises.captured, true, "differing ONLY in revises is a distinct directive, not a dedupe collision");
  assert.equal(withRevises.event!.revises, "EVT-1");
  assert.equal(readPositionStream(MONTH)!.events.length, 2, "both events retained");
});

test("SR-049: cross-month idempotence (this variant's chosen reading of the 2026-08-12 panel's convergent-but-underspecified gap)", () => {
  const directive = { kind: "assert" as const, topicKey: "t", rawStance: " stance spanning a month boundary", sessionId: "S-10" };
  const july = capturePosition({ ...directive, now: new Date("2026-07-31T23:55:00.000Z") });
  assert.equal(july.captured, true);
  // Same session, same content, re-fired just after the UTC month rolled over.
  const august = capturePosition({ ...directive, now: new Date("2026-08-01T00:05:00.000Z") });
  assert.equal(august.captured, false, "deduped ACROSS the month boundary, not just within July's file");
  assert.equal(august.deduped, true);
});

test("SR-053: a non-kebab-case topic key is stored verbatim, never rejected or rewritten", () => {
  const result = capturePosition({ kind: "assert", topicKey: "My_Topic", rawStance: " a stance", sessionId: "S-11", now: NOON });
  assert.equal(result.captured, true);
  assert.equal(result.event!.topic_key, "My_Topic");
});

test("SR-054: an over-ceiling stance is reported (via the predicate) and stored byte-verbatim, never truncated", () => {
  const dense = " " + Array.from({ length: 90 }, (_, i) => `word${i}`).join(" ");
  assert.equal(overStanceWordCeiling(dense), true, "90 words exceeds the 60-word ceiling");
  const result = capturePosition({ kind: "assert", topicKey: "t", rawStance: dense, sessionId: "S-12", now: NOON });
  assert.equal(stanceWordCount(result.event!.stance), 90, "no truncation");
});

test("SR-054: a compliant stance is not flagged", () => {
  assert.equal(overStanceWordCeiling(" a short stance"), false);
});

test("workspace provenance and refs never participate in SR-049 identity (mirrors SR-018/SR-024)", () => {
  const directive = { kind: "assert" as const, topicKey: "t", rawStance: " stable stance", sessionId: "S-13" };
  const first = capturePosition({ ...directive, cwd: vaultRoot, now: new Date("2026-08-24T09:00:00.000Z") });
  assert.equal(first.captured, true);
  // Re-fire with NO cwd at all -- still the same directive.
  const second = capturePosition({ ...directive, now: new Date("2026-08-24T09:05:00.000Z") });
  assert.equal(second.captured, false, "provenance drift alone never defeats idempotence");
  assert.equal(second.deduped, true);
});

test("session capture is unaffected by position capture happening in the SAME process (unit-level SR-055 sanity check)", () => {
  captureSession({ summary: "An ordinary session summary.", sessionId: "S-14", now: NOON });
  const beforePosition = readSession("2026-08-24");
  capturePosition({ kind: "assert", topicKey: "t", rawStance: " a stance", sessionId: "S-14", now: NOON });
  assert.equal(readSession("2026-08-24"), beforePosition, "session record bytes unchanged by a position capture in the same session");
  assert.ok(positionsExist(MONTH), "and the position DID land, in its own separate stream");
  assert.equal(fs.existsSync(positionsDir), true);
});
