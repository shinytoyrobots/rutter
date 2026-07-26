import { resetLibrarian, writeNote, sessionExists, readSession, vaultRoot, sessionsDir } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import matter from "gray-matter";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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

test("COR-R-017 SCN-001/AC-idempotence (SR-013): re-firing the same directive 5x leaves the record byte-identical, one entry", () => {
  writeNote("Notes/foo.md", "# Foo\ncontent");
  const directive = { summary: "Shipped idempotent capture; dedupe on session + content.", refs: ["Notes/foo.md"], sessionId: "S-cor-r-017" };
  // First capture at the turn where the directive was emitted.
  const first = captureSession({ ...directive, now: new Date("2026-07-24T10:00:00.000Z") });
  assert.equal(first.captured, true, "first firing captures");
  const afterFirst = readSession(DAY);
  // Four more Stop firings for the SAME session with the identical directive,
  // each at a LATER wall-clock instant (as real per-turn firing would be). The
  // differing clock proves the guard keys on content, not on the timestamp.
  for (let i = 1; i <= 4; i++) {
    const r = captureSession({ ...directive, now: new Date(`2026-07-24T10:0${i}:00.000Z`) });
    assert.equal(r.captured, false, `firing ${i + 1} appends nothing`);
    assert.equal(r.deduped, true, `firing ${i + 1} is an idempotent no-op`);
  }
  const afterFifth = readSession(DAY);
  assert.equal(afterFifth, afterFirst, "day record is byte-identical after firing 5 as after firing 1");
  assert.equal(readRecord(DAY)!.sessions.length, 1, "exactly one entry for session S; no duplicates");
});

test("COR-R-018 SCN-001/AC-revision (SR-014): a changed directive appends [D1, D2] with D1's bytes unmodified", () => {
  const D1 = captureSession({ summary: "D1: decided to store refs by content-hash.", sessionId: "S-cor-r-018", now: new Date("2026-07-24T09:00:00.000Z") });
  assert.equal(D1.captured, true);
  const entry0AfterD1 = readRecord(DAY)!.sessions[0]!;
  // Same session id, CHANGED directive content -> a revision is appended.
  const D2 = captureSession({ summary: "D2: revised -- also record the git ref when present.", sessionId: "S-cor-r-018", now: new Date("2026-07-24T11:30:00.000Z") });
  assert.equal(D2.captured, true, "the changed directive is captured (revision, not no-op)");
  assert.equal(D2.deduped ?? false, false);

  const sessions = readRecord(DAY)!.sessions;
  assert.equal(sessions.length, 2, "two entries for session S: [D1, D2]");
  assert.deepEqual(sessions[0], entry0AfterD1, "D1's entry is preserved byte-for-byte (INV-3: never overwritten/deleted)");
  assert.equal(sessions[0]!.summary, "D1: decided to store refs by content-hash.", "D1 first, in order");
  assert.equal(sessions[1]!.summary, "D2: revised -- also record the git ref when present.", "D2 appended after D1 (last-directive-wins as revision)");
});

test("COR-A-009 SCN-001/AC-idempotence (SR-013/SR-001): hammering the FULL Stop-hook entry path 5x yields one byte-identical entry", () => {
  // Exercises the real hook entry point (capture-cli reading a Stop-event
  // payload + transcript fixture), NOT the inner captureSession -- the
  // mechanism holdout the shipped gen-1 variant missed.
  writeNote("Notes/bar.md", "# Bar\nsome content");
  const transcriptPath = path.join(vaultRoot, "cc-transcript.jsonl");
  const directive = '<!-- librarian-session {"summary":"Hardened capture against per-turn Stop firing.","refs":["Notes/bar.md"]} -->';
  const lines = [
    { message: { content: "Working on the hotfix." } },
    { message: { content: [{ type: "text", text: `Here is the outcome. ${directive}` }] } },
    { message: { content: "Follow-up turn 1 (no directive)." } },
    { message: { content: "Follow-up turn 2 (no directive)." } },
    { message: { content: "Follow-up turn 3, simulated around a clear/compact boundary." } },
    { message: { content: "Follow-up turn 4 (no directive)." } },
  ];
  fs.writeFileSync(transcriptPath, lines.map((l) => JSON.stringify(l)).join("\n"), "utf8");

  const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
  const stopPayload = JSON.stringify({ transcript_path: transcriptPath, session_id: "S-cor-a-009" });
  const day = new Date().toISOString().slice(0, 10); // child uses the real clock
  const dayFile = path.join(sessionsDir, `${day}.md`);

  const fire = () => {
    const res = spawnSync(process.execPath, ["--import", "tsx", cli], {
      input: stopPayload,
      // Same throwaway vault as the in-process tests, passed to the child so it
      // writes into the shared temp _librarian/ (INV-1: no real vault touched).
      env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
      encoding: "utf8",
    });
    assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  };

  fire(); // end of the turn that emitted the directive
  const afterFirst = fs.readFileSync(dayFile, "utf8");
  for (let i = 0; i < 4; i++) fire(); // four more per-turn firings, same transcript
  const afterFifth = fs.readFileSync(dayFile, "utf8");

  assert.equal(afterFifth, afterFirst, "record byte-identical after firing 1 and firing 5");
  const record = matter(afterFifth).data as { sessions: unknown[] };
  assert.equal(record.sessions.length, 1, "exactly one entry across all 5 Stop firings");
});

test("SR-015 SCN-005/AC-auto: the REAL Stop-hook entry path threads the payload's `cwd` into provenance", () => {
  // The mechanism holdout: capture.ts deriving provenance is worthless if the hook
  // entry point drops the field Claude Code actually sends. This drives capture-cli
  // with a Stop payload shaped like the real event (transcript_path + session_id + cwd).
  const repo = path.join(vaultRoot, "stop-hook", "my-librarian");
  fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".git", "config"),
    '[remote "origin"]\n\turl = https://example.invalid/my-librarian.git\n',
    "utf8"
  );
  const transcriptPath = path.join(vaultRoot, "cc-transcript-cwd.jsonl");
  const directive = '<!-- librarian-session {"summary":"Threaded cwd through the hook."} -->';
  fs.writeFileSync(transcriptPath, JSON.stringify({ message: { content: directive } }), "utf8");

  const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
  const res = spawnSync(process.execPath, ["--import", "tsx", cli], {
    input: JSON.stringify({ transcript_path: transcriptPath, session_id: "S-cwd", cwd: repo }),
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  assert.equal(res.stdout, "", "the hook writes nothing to stdout (INV-5)");

  const day = new Date().toISOString().slice(0, 10); // child uses the real clock
  const record = matter(fs.readFileSync(path.join(sessionsDir, `${day}.md`), "utf8")).data as {
    sessions: { workspace?: { cwd: string; project: string; repo?: string } }[];
  };
  const workspace = record.sessions[0]!.workspace;
  assert.ok(workspace, "the Stop payload's cwd reached the stored entry");
  assert.equal(workspace.cwd, repo);
  assert.equal(workspace.project, "my-librarian", "project derived automatically, no user action");
  assert.equal(workspace.repo, "https://example.invalid/my-librarian.git");
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
