import { resetLibrarian, sessionsDir, positionsDir, vaultRoot, readSession, readPositions } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { captureSession } from "../src/capture.js";
import { capturePosition } from "../src/position.js";
import {
  appendSession,
  readRecord,
  serializeRecord,
  RecordSchema,
  SessionEntrySchema,
  COLLECTION,
  SCHEMA_ID,
  type SessionRecord,
} from "../src/session-record.js";
import { appendPositionEvent, readPositionStream, PositionEventSchema, PositionStreamSchema } from "../src/positions.js";

beforeEach(resetLibrarian);

const DAY = "2026-07-24";
const MONTH = "2026-07";
const NOON = new Date("2026-07-24T12:00:00.000Z");
const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));

function plant(dir: string, name: string, text: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, name);
  fs.writeFileSync(abs, text, "utf8");
  return abs;
}

function fire(payload: object): string {
  const res = spawnSync(process.execPath, ["--import", "tsx", cli], {
    input: JSON.stringify(payload),
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  return res.stderr;
}

// --- No-overwrite guard and failure contract (client-label plan, section 3) ---

test("a corrupt session day file is not overwritten: capture reports failed, bytes unchanged", () => {
  const abs = plant(sessionsDir, `${DAY}.md`, "---\nnot: a record\n---\nhand-edited\n");
  const before = fs.readFileSync(abs, "utf8");
  const result = captureSession({ summary: "should not land", now: NOON });
  assert.equal(result.captured, false);
  assert.equal(result.deduped, undefined);
  assert.equal(result.entry, undefined);
  assert.deepEqual(result.failed, { reason: "unparseable-record", path: abs });
  assert.equal(fs.readFileSync(abs, "utf8"), before, "the file is byte-identical");
});

test("a corrupt position month file is not overwritten either", () => {
  const abs = plant(positionsDir, `${MONTH}.md`, "---\nbroken: [\n---\n");
  const before = fs.readFileSync(abs, "utf8");
  const result = capturePosition({ kind: "assert", topicKey: "t", rawStance: "stance", now: NOON });
  assert.equal(result.captured, false);
  assert.equal(result.failed?.reason, "unparseable-record");
  assert.equal(fs.readFileSync(abs, "utf8"), before);
});

test("an absent file still starts a fresh record", () => {
  const result = captureSession({ summary: "first of the day", now: NOON });
  assert.equal(result.captured, true);
  assert.equal(result.failed, undefined);
  assert.equal(readRecord(DAY)!.sessions.length, 1);
});

test("a forced write error is reported as failed, never as captured", { skip: process.getuid?.() === 0 }, () => {
  // A directory where the record file should be: the read errors (EISDIR, not ENOENT) and is refused.
  fs.mkdirSync(path.join(sessionsDir, `${DAY}.md`), { recursive: true });
  assert.equal(captureSession({ summary: "x", now: NOON }).failed?.reason, "unparseable-record");
  fs.rmSync(sessionsDir, { recursive: true, force: true });
  // An absent file in an unwritable parent: the read is a clean ENOENT, the atomic write throws.
  const parent = path.dirname(sessionsDir);
  fs.mkdirSync(parent, { recursive: true });
  fs.chmodSync(parent, 0o500);
  try {
    const result = captureSession({ summary: "y", now: NOON });
    assert.equal(result.captured, false);
    assert.equal(result.failed?.reason, "write-error");
  } finally {
    fs.chmodSync(parent, 0o700);
  }
});

test("the two captures are independent: a corrupt session day does not cost the position", () => {
  plant(sessionsDir, `${new Date().toISOString().slice(0, 10)}.md`, "garbage, not frontmatter\n");
  const stderr = fire({ sessionId: "S-ind-1", summary: "session side", position: "assert indep-topic: The position still lands." });
  assert.match(stderr, /FAILED to write session entry/);
  assert.match(stderr, /captured 1 position event/);
  const month = new Date().toISOString().slice(0, 7);
  assert.match(readPositions(month), /The position still lands\./);
});

test("the mirror: a corrupt position month does not cost the session entry", () => {
  plant(positionsDir, `${new Date().toISOString().slice(0, 7)}.md`, "garbage, not frontmatter\n");
  const stderr = fire({ sessionId: "S-ind-2", summary: "session side survives", position: "assert indep-topic-2: Lost to the corrupt month." });
  assert.match(stderr, /FAILED to write position event/);
  assert.match(stderr, /captured 1 entry/);
  assert.match(readSession(new Date().toISOString().slice(0, 10)), /session side survives/);
});

test("the capture diagnostic names the build, so an out-of-date clone is visible", () => {
  const stderr = fire({ sessionId: "S-ver", summary: "versioned" });
  assert.match(stderr, /\(rutter \d+\.\d+\.\d+\)/);
});

// --- Tolerant optional `client` field and the mixed-version probe (section 1, 2) ---

// The pre-change writer, kept as a fixture: the same schemas minus `client`, which
// is exactly what a manual clone that has not been updated still runs.
const OldSessionEntry = SessionEntrySchema.omit({ client: true });
const OldRecord = RecordSchema.extend({ sessions: z.array(OldSessionEntry).min(1) });
const OldPositionEvent = PositionEventSchema.omit({ client: true });
const OldStream = PositionStreamSchema.extend({ events: z.array(OldPositionEvent).min(1) });

function oldAppendSession(day: string, entry: Record<string, unknown>): void {
  const abs = path.join(sessionsDir, `${day}.md`);
  const existing = OldRecord.parse(matter(fs.readFileSync(abs, "utf8")).data);
  const sessions = [...existing.sessions, OldSessionEntry.parse(entry)];
  fs.writeFileSync(abs, serializeRecord({ ...existing, sessions } as SessionRecord), "utf8");
}

const entry = (id: string, client?: string) => ({
  id,
  session_id: `S-${id}`,
  time: `2026-07-24T12:00:0${id}.000Z`,
  summary: `entry ${id}`,
  refs: [],
  ...(client ? { client } : {}),
});

test("hazard: a pre-change writer strips the label from a labeled day (documents why rollout is two-release)", () => {
  appendSession(DAY, entry("1", "claude"));
  oldAppendSession(DAY, entry("2"));
  const sessions = matter(readSession(DAY)).data.sessions as { client?: string }[];
  assert.equal(sessions[0]!.client, undefined, "the old writer erased the label");
});

test("the current writer preserves labels, including an unfamiliar value, across appends", () => {
  appendSession(DAY, entry("1", "claude"));
  appendSession(DAY, entry("2", "gemini-cli-from-the-future"));
  appendSession(DAY, entry("3"));
  const sessions = readRecord(DAY)!.sessions;
  assert.deepEqual(sessions.map((s) => s.client), ["claude", "gemini-cli-from-the-future", undefined]);
  assert.equal(sessions.length, 3, "nothing lost to an unrecognized value");
});

test("an unfamiliar client value does not make the day unreadable", () => {
  appendSession(DAY, entry("1", "Claude  <weird>"));
  assert.ok(readRecord(DAY), "still parses");
});

test("positions: labels survive a rewrite and an unfamiliar value loses nothing", () => {
  const ev = (id: string, client?: string) => ({
    id,
    time: `2026-07-24T12:00:0${id}.000Z`,
    kind: "assert" as const,
    topic_key: `t-${id}`,
    stance: `s ${id}`,
    refs: [],
    ...(client ? { client } : {}),
  });
  appendPositionEvent(MONTH, ev("1", "grok"));
  appendPositionEvent(MONTH, ev("2", "from-the-future"));
  appendPositionEvent(MONTH, ev("3"));
  assert.deepEqual(readPositionStream(MONTH)!.events.map((e) => e.client), ["grok", "from-the-future", undefined]);
  // And the pre-change position writer strips them, same hazard as sessions.
  const abs = path.join(positionsDir, `${MONTH}.md`);
  const existing = OldStream.parse(matter(fs.readFileSync(abs, "utf8")).data);
  assert.equal((existing.events[0] as { client?: string }).client, undefined, "old schema drops the key on read");
});

test("pre-change records round-trip unchanged and the schema id is still session-record@1", () => {
  assert.equal(SCHEMA_ID, "session-record@1");
  assert.equal(COLLECTION, "librarian.sessions");
  appendSession(DAY, entry("1"));
  const raw = readSession(DAY);
  assert.ok(!raw.includes("client"), "no client key is written for an unlabeled entry");
});
