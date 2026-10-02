import { resetLibrarian, readSession, readPositions, positionsExist, sessionExists, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

/**
 * Codex Stop adapter (codex-compatibility.md). A Codex Stop event carries
 * `last_assistant_message` (snake_case) plus a `transcript_path` that points at
 * a rollout file whose assistant text lives under `payload.content`, which the
 * Claude transcript reader does not read -- so the directive must be lifted
 * from `last_assistant_message`. Runs the real CLI entry point.
 */

beforeEach(resetLibrarian);

const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
const day = (): string => new Date().toISOString().slice(0, 10); // child uses the real clock
const month = (): string => new Date().toISOString().slice(0, 7);

const SESSION = (s: string): string => `<!-- librarian-session {"summary":"${s}"} -->`;
const POSITION = (key: string, stance: string): string => `<!-- librarian-position POSITION assert ${key}: ${stance} -->`;

function fire(payload: object): { stderr: string; stdout: string } {
  const res = spawnSync(process.execPath, ["--import", "tsx", cli], {
    input: JSON.stringify(payload),
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  assert.equal(res.stdout, "", "nothing on stdout (INV-5)");
  return { stderr: res.stderr, stdout: res.stdout };
}

/** A rollout-shaped fixture: assistant text under payload.content, the directive only in a tool call. */
function writeRollout(name: string, toolText: string): string {
  const abs = path.join(vaultRoot, name);
  const lines = [
    { type: "session_meta", payload: { id: "x" } },
    { type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "Working on it." }] } },
    { type: "response_item", payload: { type: "function_call", arguments: toolText } },
  ];
  fs.writeFileSync(abs, lines.map((l) => JSON.stringify(l)).join("\n"), "utf8");
  return abs;
}

const sessions = (): { summary: string; workspace?: { project: string } }[] =>
  (matter(readSession(day())).data as { sessions: { summary: string; workspace?: { project: string } }[] }).sessions;
const events = (): { topic_key: string; stance: string }[] =>
  (matter(readPositions(month())).data as { events: { topic_key: string; stance: string }[] }).events;

test("CODEX-1: a session directive is captured from last_assistant_message, with cwd provenance", () => {
  const repo = path.join(vaultRoot, "codex-repo", "my-librarian");
  fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".git", "config"), '[remote "origin"]\n\turl = https://example.invalid/my-librarian.git\n', "utf8");
  fire({
    session_id: "S-codex-1",
    cwd: repo,
    transcript_path: writeRollout("rollout-1.jsonl", SESSION("only in a tool call")),
    hook_event_name: "Stop",
    last_assistant_message: `Done. ${SESSION("Codex session captured.")}`,
  });
  assert.equal(sessions().length, 1);
  assert.equal(sessions()[0]!.summary, "Codex session captured.");
  assert.equal(sessions()[0]!.workspace!.project, "my-librarian");
  assert.equal(positionsExist(month()), false);
});

test("CODEX-2: a position directive is captured from last_assistant_message", () => {
  fire({ session_id: "S-codex-2", last_assistant_message: `Reasoned. ${POSITION("codex-hook", "use the event message first.")}` });
  assert.equal(events().length, 1);
  assert.equal(events()[0]!.topic_key, "codex-hook");
  assert.equal(events()[0]!.stance, "use the event message first.");
  assert.equal(sessionExists(day()), false);
});

test("CODEX-3: both directives in one message are captured independently", () => {
  fire({ session_id: "S-codex-3", last_assistant_message: `${SESSION("Both kinds.")}\n${POSITION("both-kinds", "each stream stands alone.")}` });
  assert.equal(sessions()[0]!.summary, "Both kinds.");
  assert.equal(events()[0]!.topic_key, "both-kinds");
});

test("CODEX-4: missing, null, non-string, empty, or directive-free messages capture nothing", () => {
  const bad: unknown[] = [undefined, null, 42, { a: 1 }, ["x"], "", "   ", "An ordinary reply with no directive."];
  bad.forEach((value, i) => {
    const payload: Record<string, unknown> = { session_id: `S-codex-4-${i}` };
    if (value !== undefined) payload.last_assistant_message = value;
    fire(payload);
  });
  assert.equal(sessionExists(day()), false, "no session file");
  assert.equal(positionsExist(month()), false, "no position stream");
});

test("CODEX-4b: an empty-stance position directive keeps its SR-057 diagnostic and captures nothing", () => {
  const { stderr } = fire({ session_id: "S-codex-4b", last_assistant_message: "<!-- librarian-position POSITION assert empty-one:   -->" });
  assert.match(stderr, /empty or whitespace-only stance/);
  assert.equal(positionsExist(month()), false);
});

test("CODEX-5: replaying an unchanged directive is a no-op; a later-turn directive appends under the same session", () => {
  const first = { session_id: "S-codex-5", last_assistant_message: `A. ${SESSION("Turn one.")} ${POSITION("replay", "same stance.")}` };
  fire(first);
  const sessionBytes = readSession(day());
  const positionBytes = readPositions(month());
  for (let i = 0; i < 3; i++) fire(first);
  assert.equal(readSession(day()), sessionBytes, "session record byte-identical after replay");
  assert.equal(readPositions(month()), positionBytes, "position stream byte-identical after replay");

  fire({ session_id: "S-codex-5", last_assistant_message: `B. ${SESSION("Turn two.")}` });
  assert.deepEqual(sessions().map((s) => s.summary), ["Turn one.", "Turn two."]);
});

test("CODEX-6: precedence -- a Claude-shaped transcript directive wins; camelCase wins over snake_case; sources are never concatenated", () => {
  const transcriptPath = path.join(vaultRoot, "cc-transcript-codex-6.jsonl");
  fs.writeFileSync(transcriptPath, JSON.stringify({ message: { content: `Outcome. ${SESSION("From the transcript.")}` } }), "utf8");
  fire({ session_id: "S-codex-6a", transcript_path: transcriptPath, last_assistant_message: SESSION("From the Codex field.") });
  assert.deepEqual(sessions().map((s) => s.summary), ["From the transcript."]);

  resetLibrarian();
  fire({ session_id: "S-codex-6b", lastAssistantMessage: SESSION("Grok field."), last_assistant_message: SESSION("Codex field.") });
  assert.deepEqual(sessions().map((s) => s.summary), ["Grok field."], "camelCase string wins");

  resetLibrarian();
  fire({ session_id: "S-codex-6c", lastAssistantMessage: 7, last_assistant_message: SESSION("Codex field.") });
  assert.deepEqual(sessions().map((s) => s.summary), ["Codex field."], "a non-string camelCase falls through to snake_case");
});

test("CODEX-7: the final-message limitation -- a directive only in the rollout file is not recovered", () => {
  fire({
    session_id: "S-codex-7",
    transcript_path: writeRollout("rollout-7.jsonl", SESSION("earlier commentary")),
    last_assistant_message: "Final reply with no directive.",
  });
  assert.equal(sessionExists(day()), false);
});
