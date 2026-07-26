import { resetLibrarian, writeNote, readSession, sessionsDir, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import crypto from "node:crypto";
import { captureSession } from "../src/capture.js";
import { readRecord } from "../src/session-record.js";

beforeEach(resetLibrarian);

const DAY = "2026-07-24";
const NOON = new Date("2026-07-24T12:00:00.000Z");

// Build control/invisible characters at runtime so this source file stays pure ASCII.
const NUL = String.fromCharCode(0);
const ESC = String.fromCharCode(27);
const RLO = String.fromCharCode(0x202e); // right-to-left override
const ZWSP = String.fromCharCode(0x200b); // zero-width space

test("SEC-A-001 yaml-injection: a summary shaped like frontmatter cannot inject record keys", () => {
  captureSession({ summary: "---\nadmin: true\ninjected: pwned\n---", now: NOON });
  const data = matter(readSession(DAY)).data as Record<string, unknown>;
  assert.equal(data.admin, undefined, "no injected admin key");
  assert.equal(data.injected, undefined, "no injected key at all");
  assert.match(readRecord(DAY)!.sessions[0]!.summary, /admin: true/, "payload lives as inert text");
});

test("SEC-A-002 yaml-injection: anchors and !! type tags are inert, never constructed", () => {
  const payload = "anchor: &a [1,2]\ntag: !!python/object/apply:os.system ['id']";
  assert.doesNotThrow(() => captureSession({ summary: payload, now: NOON }));
  assert.ok(readRecord(DAY), "record parses back cleanly with no tag construction");
});

test("SEC-A-003 yaml-injection: multi-document --- separators do not split the record", () => {
  captureSession({ summary: "first\n---\nsecond-doc: true\n---\nthird", now: NOON });
  assert.equal(readRecord(DAY)!.sessions.length, 1, "exactly one entry, no multi-doc split");
});

test("SEC-A-004 path-traversal: a ../ note ref is rejected and never dereferenced", () => {
  const result = captureSession({ summary: "traversal", refs: ["../../../../etc/passwd"], now: NOON });
  assert.equal(result.entry!.refs.length, 0);
  assert.deepEqual(result.rejectedRefs, ["../../../../etc/passwd"]);
});

test("SEC-A-005 path-traversal: an absolute note ref is rejected", () => {
  const result = captureSession({ summary: "absolute", refs: ["/etc/passwd"], now: NOON });
  assert.equal(result.entry!.refs.length, 0);
  assert.deepEqual(result.rejectedRefs, ["/etc/passwd"]);
});

test("SEC-A-006 symlink: a write does not follow a symlink out of _librarian/", () => {
  const external = path.join(vaultRoot, "secret.md");
  fs.writeFileSync(external, "TOP SECRET", "utf8");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.symlinkSync(external, path.join(sessionsDir, `${DAY}.md`)); // pre-plant a symlink target
  captureSession({ summary: "attempt to write through the link", now: NOON });
  assert.equal(fs.readFileSync(external, "utf8"), "TOP SECRET", "the store file is untouched");
  assert.ok(!fs.lstatSync(path.join(sessionsDir, `${DAY}.md`)).isSymbolicLink(), "link replaced by a real record");
});

test("SEC-A-007 control-char: an embedded NUL is stripped, not truncating the entry", () => {
  captureSession({ summary: `before${NUL}after`, now: NOON });
  assert.equal(readRecord(DAY)!.sessions[0]!.summary, "beforeafter");
});

test("SEC-A-008 control-char: CRLF cannot forge additional session entries", () => {
  captureSession({ summary: "line-one\r\n- injected extra entry\r\nline-two", now: NOON });
  const record = readRecord(DAY)!;
  assert.equal(record.sessions.length, 1, "one entry only");
  assert.ok(!record.sessions[0]!.summary.includes("\n"), "CRLF neutralised to inert single-line text");
});

test("SEC-A-009 control-char: ANSI, BiDi override and zero-width chars render inert", () => {
  const payload = `${ESC}[31mred${ESC}[0m ${RLO}RLO${ZWSP}zero`;
  captureSession({ summary: payload, now: NOON });
  const summary = readRecord(DAY)!.sessions[0]!.summary;
  for (const ch of [ESC, RLO, ZWSP]) {
    assert.ok(!summary.includes(ch), "control/BiDi/zero-width char removed");
  }
  assert.match(summary, /red.*zero/, "the legible letters survive");
});

test("SEC-A-011 oversized-input: a multi-megabyte summary is bounded and existing entries survive", () => {
  captureSession({ summary: "a small real entry", now: new Date("2026-07-24T11:00:00Z") });
  const huge = "x".repeat(5_000_000);
  assert.doesNotThrow(() => captureSession({ summary: huge, now: NOON }));
  const record = readRecord(DAY)!;
  assert.equal(record.sessions.length, 2, "prior entry intact, oversized one appended");
  assert.ok(record.sessions[1]!.summary.length <= 2000, "oversized summary bounded");
});

test("SEC-A-012 ref-smuggling: a wikilink/query-smuggled ref resolves out of bounds and is rejected", () => {
  const result = captureSession({ summary: "smuggle", refs: ["[[../secret]] | ?run=1 &redirect=../../"], now: NOON });
  assert.equal(result.entry!.refs.length, 0, "smuggled ref not resolved");
  assert.equal(result.rejectedRefs.length, 1);
});

test("SEC-R-004 benign control: ordinary markdown round-trips intact (no over-sanitising)", () => {
  const benign = "See [foo](bar) and **bold** and `code`.";
  captureSession({ summary: benign, now: NOON });
  assert.equal(readRecord(DAY)!.sessions[0]!.summary, benign, "benign markdown preserved verbatim");
});

test("SEC-R-005 benign ref: a valid path + content-hash resolves to the correct note", () => {
  const abs = writeNote("Notes/foo.md", "# Foo\ncontent");
  const { entry } = captureSession({ summary: "ref foo", refs: ["Notes/foo.md"], now: NOON });
  const expected = `sha256:${crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")}`;
  assert.equal(entry!.refs[0]!.hash, expected, "benign ref persists and resolves with its hash intact");
});
