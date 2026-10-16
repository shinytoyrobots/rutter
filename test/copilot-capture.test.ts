import { resetLibrarian, readSession, readPositions, sessionExists, positionsExist, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

/**
 * GitHub Copilot CLI `agentStop` adapter (docs/copilot-cli-plan.md). The payload
 * carries NO assistant text, only `transcriptPath` to an `events.jsonl` that
 * accumulates across turns. Records seen in the 2026-10-15 probe: `user.message`
 * (echoes the prompt), `assistant.message` (reply text; tool rounds too),
 * `assistant.turn_end`, and `hook.start` echoing this hook's own payload -- which
 * Copilot writes AFTER the turn, up to ~100 ms after the hook has started.
 */

beforeEach(resetLibrarian);

const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
const day = (): string => new Date().toISOString().slice(0, 10);
const month = (): string => new Date().toISOString().slice(0, 7);

const SESSION = (s: string): string => `<!-- librarian-session {"summary":"${s}"} -->`;
const POSITION = (key: string, stance: string): string => `<!-- librarian-position POSITION assert ${key}: ${stance} -->`;

const childEnv = (vars: Record<string, string> = {}): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LIBRARIAN_VAULT_PATH: vaultRoot,
    LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db"),
    ...vars,
  };
  delete env.RUTTER_CLIENT;
  return env;
};

function fire(payload: object, args: string[] = [], vars: Record<string, string> = {}): string {
  const res = spawnSync(process.execPath, ["--import", "tsx", cli, ...args], {
    input: JSON.stringify(payload),
    env: childEnv(vars),
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  assert.equal(res.stdout, "", "nothing on stdout (INV-5)");
  return res.stderr;
}

type Rec = { type: string; data: Record<string, unknown> };
const user = (c: string, turn: string): Rec => ({ type: "user.message", data: { content: c, transformedContent: c, interactionId: turn } });
const asst = (c: string, turn: string, final = true): Rec => ({
  type: "assistant.message",
  data: { content: c, interactionId: turn, ...(final ? { phase: "final_answer" } : { toolRequests: [{}] }) },
});
const turnEnd = (): Rec => ({ type: "assistant.turn_end", data: { turnId: "0" } });
const hookStart = (ts: number): Rec => ({ type: "hook.start", data: { hookType: "agentStop", input: { timestamp: ts } } });

function transcript(name: string, recs: Rec[]): string {
  const abs = path.join(vaultRoot, name);
  fs.writeFileSync(abs, recs.map((r, i) => JSON.stringify({ id: `r${i}`, timestamp: "t", ...r })).join("\n") + "\n", "utf8");
  return abs;
}
const append = (abs: string, recs: Rec[]): void =>
  fs.appendFileSync(abs, recs.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

const stop = (sessionId: string, transcriptPath: string, ts: number, extra: object = {}): object => ({
  sessionId,
  timestamp: ts,
  cwd: path.join(vaultRoot, "cp-ws"),
  transcriptPath,
  stopReason: "end_turn",
  stop_hook_active: false,
  ...extra,
});

const sessions = (): { summary: string; client?: string }[] =>
  (matter(readSession(day())).data as { sessions: { summary: string; client?: string }[] }).sessions;
const events = (): { topic_key: string; stance: string }[] =>
  (matter(readPositions(month())).data as { events: { topic_key: string; stance: string }[] }).events;

test("CP-1: camelCase payload -- session and position directives in the turn's assistant message are captured and labeled", () => {
  const t = transcript("cp-1.jsonl", [user("do it", "I1"), asst(`Done.\n${SESSION("Copilot session captured.")}\n${POSITION("cp-hook", "wait for the marker.")}`, "I1"), turnEnd(), hookStart(1)]);
  fire(stop("S-1", t, 1));
  assert.equal(sessions().length, 1);
  assert.equal(sessions()[0]!.summary, "Copilot session captured.");
  assert.equal(sessions()[0]!.client, "copilot");
  assert.equal(events()[0]!.topic_key, "cp-hook");
});

test("CP-2: a directive template echoed in the user message is never captured", () => {
  const t = transcript("cp-2.jsonl", [user(`please use ${SESSION("TEMPLATE")}`, "I1"), asst("Sure, done.", "I1"), turnEnd(), hookStart(2)]);
  fire(stop("S-2", t, 2));
  assert.equal(sessionExists(day()), false);
});

test("CP-3: tool rounds -- empty and tool-call messages are skipped; the last directive in the turn wins", () => {
  const t = transcript("cp-3.jsonl", [
    user("go", "I1"),
    asst("", "I1", false),
    asst(`reading. ${SESSION("early line")}`, "I1", false),
    asst(`Final. ${SESSION("final line")}`, "I1"),
    turnEnd(),
    hookStart(3),
  ]);
  fire(stop("S-3", t, 3));
  assert.deepEqual(sessions().map((s) => s.summary), ["final line"]);
});

test("CP-4: multi-turn -- an earlier turn's directive is not re-captured; a second agentStop on the same turn dedupes (SR-013)", () => {
  const t = transcript("cp-4.jsonl", [user("one", "I1"), asst(SESSION("turn one"), "I1"), turnEnd(), hookStart(10)]);
  fire(stop("S-4", t, 10));
  append(t, [user("two", "I2"), asst("No directive this turn.", "I2"), turnEnd(), hookStart(11)]);
  const stderr = fire(stop("S-4", t, 11));
  assert.match(stderr, /no session directive found/);
  append(t, [user("three", "I3"), asst(SESSION("turn three"), "I3"), turnEnd(), hookStart(12)]);
  fire(stop("S-4", t, 12));
  // A second agentStop on the same turn (another hook forced a continuation): same text, own timestamp.
  append(t, [hookStart(13)]);
  const again = fire(stop("S-4", t, 13, { stop_hook_active: true }));
  assert.match(again, /already recorded/);
  assert.deepEqual(sessions().map((s) => s.summary), ["turn one", "turn three"]);
});

test("CP-5: the transcript lands after the hook starts -- the reader waits for this hook's own record", async () => {
  const t = transcript("cp-5.jsonl", [user("go", "I1")]);
  const child = spawn(process.execPath, ["--import", "tsx", cli], { env: childEnv(), stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.stdin.end(JSON.stringify(stop("S-5", t, 5)));
  // Well past tsx start-up, so the child is already polling when the turn lands.
  await new Promise((r) => setTimeout(r, 1200));
  append(t, [asst(SESSION("late flush"), "I1"), turnEnd(), hookStart(5)]);
  const code = await new Promise((r) => child.on("close", r));
  assert.equal(code, 0, stderr);
  assert.deepEqual(sessions().map((s) => s.summary), ["late flush"]);
});

test("CP-6: the marker never arrives -- fail closed with one stderr line", () => {
  const t = transcript("cp-6.jsonl", [user("go", "I1"), asst(SESSION("never final"), "I1"), turnEnd(), hookStart(99)]);
  const stderr = fire(stop("S-6", t, 6), [], { LIBRARIAN_COPILOT_WAIT_MS: "150" });
  assert.match(stderr, /copilot transcript not finished writing after 150 ms; nothing captured/);
  assert.equal(sessionExists(day()), false);
});

test("CP-7: a missing transcript and an unrecognized one capture nothing", () => {
  let stderr = fire(stop("S-7", path.join(vaultRoot, "nope.jsonl"), 7), [], { LIBRARIAN_COPILOT_WAIT_MS: "0" });
  assert.match(stderr, /copilot transcript unreadable; nothing captured/);
  const odd = path.join(vaultRoot, "cp-7.jsonl");
  fs.writeFileSync(odd, `${JSON.stringify({ message: { content: SESSION("claude-shaped") } })}\n`, "utf8");
  stderr = fire(stop("S-7", odd, 7), [], { LIBRARIAN_COPILOT_WAIT_MS: "0" });
  assert.match(stderr, /copilot transcript unrecognized; nothing captured/);
  assert.equal(sessionExists(day()), false);
  assert.equal(positionsExist(month()), false);
});

test("CP-8: snake_case with --client copilot reads events.jsonl, never the Claude reader (normalized form has no transcript_path)", () => {
  // A Claude-shaped line the Claude reader WOULD pick up; the Copilot reader must ignore it.
  const t = transcript("cp-8.jsonl", [user("go", "I1"), asst(SESSION("copilot text"), "I1"), turnEnd(), hookStart(8)]);
  fs.appendFileSync(t, `${JSON.stringify({ message: { content: SESSION("claude reader text") } })}\n`, "utf8");
  fire({ session_id: "S-8", transcript_path: t, stop_reason: "end_turn", timestamp: 8, cwd: vaultRoot }, ["--client", "copilot"]);
  assert.deepEqual(sessions().map((s) => s.summary), ["copilot text"]);
  assert.equal(sessions()[0]!.client, "copilot");
});

test("CP-9: no transcript path -- derived from the session id under $COPILOT_HOME", () => {
  const home = path.join(vaultRoot, "copilot-home");
  fs.mkdirSync(path.join(home, "session-state", "S-9"), { recursive: true });
  const t = path.join(home, "session-state", "S-9", "events.jsonl");
  fs.writeFileSync(t, [user("go", "I1"), asst(SESSION("derived path"), "I1"), hookStart(9)].map((r) => JSON.stringify(r)).join("\n"), "utf8");
  fire({ session_id: "S-9", stop_reason: "end_turn", timestamp: 9 }, ["--client", "copilot"], { COPILOT_HOME: home });
  assert.deepEqual(sessions().map((s) => s.summary), ["derived path"]);
  // A session id that could climb out of session-state is refused, not joined.
  const stderr = fire({ session_id: "../S-9", stop_reason: "end_turn", timestamp: 9 }, ["--client", "copilot"], { COPILOT_HOME: home });
  assert.match(stderr, /no transcript path or usable session id/);
});

test("CP-10: shape selection -- a Claude payload with no identity is not read as Copilot", () => {
  const t = transcript("cp-10.jsonl", [user("go", "I1"), asst(SESSION("copilot only"), "I1"), hookStart(10)]);
  // Claude shape (snake_case, no identity): the Claude reader runs and finds no Claude records.
  fire({ session_id: "S-10", transcript_path: t, cwd: vaultRoot }, [], { LIBRARIAN_COPILOT_WAIT_MS: "0" });
  assert.equal(sessionExists(day()), false);
});
