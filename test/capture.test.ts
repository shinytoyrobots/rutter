import { resetLibrarian, writeNote, sessionExists, readSession } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import crypto from "node:crypto";
import fs from "node:fs";
import { captureSession } from "../src/capture.js";
import { readRecord, RecordSchema } from "../src/session-record.js";

beforeEach(resetLibrarian);

const DAY = "2026-07-24";
const NOON = new Date("2026-07-24T12:00:00.000Z");

test("COR-R-001 SCN-001/AC-1: a session yields exactly one curated one-line entry", () => {
  captureSession({ summary: "Decided to adopt node:sqlite; shipped the walking skeleton.", now: NOON });
  const record = readRecord(DAY);
  assert.ok(record, "a record was written");
  assert.equal(record.sessions.length, 1, "exactly one entry");
  assert.ok(!record.sessions[0]!.summary.includes("\n"), "entry is a single line, not a transcript");
});

test("COR-A-001 SCN-001/AC-1: a multi-line/transcript payload is distilled to one line", () => {
  const transcript = "user: hi\nassistant: let's refactor\nuser: do it\nassistant: done, tests pass";
  captureSession({ summary: transcript, now: NOON });
  const record = readRecord(DAY)!;
  assert.equal(record.sessions.length, 1);
  assert.ok(!record.sessions[0]!.summary.includes("\n"), "no embedded newlines survive (append contract intact)");
});

test("COR-R-002 SCN-001/AC-2: a named note is stored by path + reproducible content-hash", () => {
  const abs = writeNote("Notes/foo.md", "# Foo\nsome content");
  const { entry } = captureSession({ summary: "Touched foo.", refs: ["Notes/foo.md"], now: NOON });
  const ref = entry!.refs[0]!;
  assert.equal(ref.path, "Notes/foo.md", "vault-relative path recorded");
  const expected = `sha256:${crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")}`;
  assert.equal(ref.hash, expected, "content-hash reproduces from the note as-read (not path alone)");
});

test("COR-A-002 SCN-001/AC-2: an unresolvable ref is rejected, never stored as valid", () => {
  const result = captureSession({ summary: "Mentioned a ghost note.", refs: ["Notes/does-not-exist.md"], now: NOON });
  assert.equal(result.captured, true, "the summary itself is still captured");
  assert.equal(result.entry!.refs.length, 0, "the bogus identity is not persisted");
  assert.deepEqual(result.rejectedRefs, ["Notes/does-not-exist.md"], "and is reported as rejected");
});

test("COR-R-003 SCN-001/AC-3: an empty summary appends nothing and leaves prior records byte-identical", () => {
  captureSession({ summary: "A real prior session.", now: new Date("2026-07-23T09:00:00Z") });
  const before = readSession("2026-07-23");
  const result = captureSession({ summary: "", now: NOON });
  assert.equal(result.captured, false);
  assert.equal(sessionExists(DAY), false, "no empty record file for the new day");
  assert.equal(readSession("2026-07-23"), before, "prior record unchanged");
});

test("COR-A-003 SCN-001/AC-3: a whitespace-only summary creates no file", () => {
  const result = captureSession({ summary: "   \n\t  ", now: NOON });
  assert.equal(result.captured, false);
  assert.equal(sessionExists(DAY), false);
});

test("COR-R-004 SCN-001/AC-4: capture is ambient -- no MCP tool call, only a summary, is needed", () => {
  // The only input is the client's summary line; no librarian tool is invoked.
  const result = captureSession({ summary: "Ambiently captured at session end.", now: NOON });
  assert.equal(result.captured, true);
  assert.equal(readRecord(DAY)!.sessions.length, 1);
});

test("COR-R-015 SR-100: fresh record frontmatter validates against the typed schema", () => {
  writeNote("Notes/foo.md", "# Foo");
  captureSession({ summary: "Typed record.", refs: ["Notes/foo.md"], now: NOON });
  const parsed = matter(readSession(DAY));
  const result = RecordSchema.safeParse(parsed.data);
  assert.ok(result.success, "frontmatter is a typed mdbase-shaped record");
  assert.equal(result.data.day, DAY, "has a typed day");
  assert.ok(result.data.sessions[0]!.id, "has a session identity");
  assert.equal(typeof result.data.refs[0]!.hash, "string", "refs is a typed list");
});

test("COR-R-016 SR-100: refs must be a typed list -- a scalar-where-list is rejected", () => {
  const good = { collection: "librarian.sessions", schema: "session-record@1", day: DAY,
    sessions: [{ id: "x", time: "t", summary: "s", refs: [] }], refs: [] };
  assert.ok(RecordSchema.safeParse(good).success);
  const malformed = { ...good, refs: "Notes/foo.md" }; // scalar where a list is required
  assert.equal(RecordSchema.safeParse(malformed).success, false, "malformed refs shape rejected");
});
