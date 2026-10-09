import { resetLibrarian, readSession, readPositions, positionsExist, sessionExists, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

/**
 * Antigravity (`agy`) Stop adapter (antigravity-compatibility.md). The Stop payload
 * carries NO assistant text, only `transcriptPath` to a `transcript_full.jsonl`
 * that accumulates across turns. Records seen in a real spike: `USER_INPUT`
 * (echoes the prompt), `PLANNER_RESPONSE` (assistant text), `GENERIC` (tool
 * results, also `source: "MODEL"`). Runs the real CLI entry point.
 */

beforeEach(resetLibrarian);

const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
const day = (): string => new Date().toISOString().slice(0, 10);
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

type Rec = { type: string; source?: string; content?: string };
const user = (c: string): Rec => ({ type: "USER_INPUT", source: "USER_EXPLICIT", content: `<USER_REQUEST>\n${c}\n</USER_REQUEST>` });
const planner = (c: string): Rec => ({ type: "PLANNER_RESPONSE", source: "MODEL", content: c });
const tool = (c: string): Rec => ({ type: "GENERIC", source: "MODEL", content: c });

function transcript(name: string, recs: Rec[]): string {
  const abs = path.join(vaultRoot, name);
  fs.writeFileSync(abs, recs.map((r, i) => JSON.stringify({ step_index: i, status: "DONE", ...r })).join("\n") + "\n", "utf8");
  return abs;
}

function stop(conversationId: string, transcriptPath: string, extra: object = {}): object {
  return {
    artifactDirectoryPath: "/x",
    conversationId,
    error: "",
    executionNum: 0,
    fullyIdle: true,
    modelName: "m",
    terminationReason: "NO_TOOL_CALL",
    transcriptPath,
    workspacePaths: [path.join(vaultRoot, "agy-ws")],
    ...extra,
  };
}

const sessions = (): { summary: string; workspace?: { project: string } }[] =>
  (matter(readSession(day())).data as { sessions: { summary: string; workspace?: { project: string } }[] }).sessions;
const events = (): { topic_key: string; stance: string }[] =>
  (matter(readPositions(month())).data as { events: { topic_key: string; stance: string }[] }).events;

test("AGY-1: session and position directives in PLANNER_RESPONSE are captured, with workspacePaths[0] provenance", () => {
  const repo = path.join(vaultRoot, "agy-repo", "my-librarian");
  fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".git", "config"), '[remote "origin"]\n\turl = https://example.invalid/my-librarian.git\n', "utf8");
  const t = transcript("agy-1.jsonl", [user("do the thing"), planner(`Done. ${SESSION("Agy session captured.")}\n${POSITION("agy-hook", "read the transcript.")}`)]);
  fire(stop("C-1", t, { workspacePaths: [repo] }));
  assert.equal(sessions().length, 1);
  assert.equal(sessions()[0]!.summary, "Agy session captured.");
  assert.equal(sessions()[0]!.workspace!.project, "my-librarian");
  assert.equal(events()[0]!.topic_key, "agy-hook");
});

test("AGY-2: only PLANNER_RESPONSE counts -- USER_INPUT echoes and tool results are ignored", () => {
  const t = transcript("agy-2.jsonl", [
    user(`Emit this: ${SESSION("echoed by the user")} ${POSITION("echo", "user typed it.")}`),
    planner("Reading the file."),
    tool(`file contents mention ${SESSION("from a tool result")}`),
    planner("All done, nothing to record."),
  ]);
  fire(stop("C-2", t));
  assert.equal(sessionExists(day()), false);
  assert.equal(positionsExist(month()), false);
});

test("AGY-3: a directive before a tool call and a later one in the final reply -- the last wins, one entry per firing", () => {
  const t = transcript("agy-3.jsonl", [user("go"), planner(SESSION("early")), tool("result"), planner(`Final. ${SESSION("late")}`)]);
  fire(stop("C-3", t));
  assert.deepEqual(sessions().map((s) => s.summary), ["late"]);
});

test("AGY-4: multi-turn -- scope is the current turn; a directive-free turn captures nothing; a changed directive appends once; replay of a snapshot does not duplicate", () => {
  const turn1 = [user("one"), planner(`A. ${SESSION("Turn one.")} ${POSITION("multi", "stance one.")}`)];
  const snap1 = transcript("agy-4-snap1.jsonl", turn1);
  const turn2 = [...turn1, user("two"), planner("Just chatting, no directive.")];
  const snap2 = transcript("agy-4-snap2.jsonl", turn2);
  const turn3 = [...turn2, user("three"), planner(`C. ${SESSION("Turn three.")} ${POSITION("multi", "stance three.")}`)];
  const snap3 = transcript("agy-4-snap3.jsonl", turn3);

  fire(stop("C-4", snap1));
  const s1 = readSession(day());
  const p1 = readPositions(month());
  fire(stop("C-4", snap1)); // replay turn 1
  assert.equal(readSession(day()), s1, "session byte-identical after replaying turn 1");
  assert.equal(readPositions(month()), p1, "positions byte-identical after replaying turn 1");

  fire(stop("C-4", snap2)); // the older directive must NOT be re-read from the accumulated file
  assert.equal(readSession(day()), s1, "directive-free turn 2 captures nothing");
  assert.equal(readPositions(month()), p1);

  fire(stop("C-4", snap3));
  assert.deepEqual(sessions().map((s) => s.summary), ["Turn one.", "Turn three."]);
  assert.equal(events().length, 2);
  const s3 = readSession(day());
  const p3 = readPositions(month());
  fire(stop("C-4", snap3));
  fire(stop("C-4", snap2)); // an older snapshot replayed late still captures nothing new
  assert.equal(readSession(day()), s3);
  assert.equal(readPositions(month()), p3);
});

test("AGY-5: a non-empty error, a missing or unrecognized transcript, and a directive-free turn capture nothing", () => {
  const good = transcript("agy-5.jsonl", [user("x"), planner(SESSION("would capture"))]);
  fire(stop("C-5a", good, { error: "boom" }));
  fire(stop("C-5b", path.join(vaultRoot, "no-such-file.jsonl")));
  const junk = path.join(vaultRoot, "agy-5-junk.jsonl");
  fs.writeFileSync(junk, "not json\n{\"no\":\"type\"}\n", "utf8");
  const { stderr } = fire(stop("C-5c", junk));
  assert.match(stderr, /unreadable or unrecognized/);
  fire(stop("C-5d", transcript("agy-5d.jsonl", [user("x"), planner("An ordinary reply.")])));
  assert.equal(sessionExists(day()), false);
  assert.equal(positionsExist(month()), false);
});

test("AGY-6: an empty-stance position directive keeps its SR-057 diagnostic", () => {
  const t = transcript("agy-6.jsonl", [user("x"), planner("<!-- librarian-position POSITION assert empty-one:   -->")]);
  const { stderr } = fire(stop("C-6", t));
  assert.match(stderr, /empty or whitespace-only stance/);
  assert.equal(positionsExist(month()), false);
});

test("AGY-7: shape selection -- a payload with session_id/transcript_path (Claude/Codex shapes) is not treated as Antigravity", () => {
  const t = transcript("agy-7.jsonl", [user("x"), planner(SESSION("agy-only text"))]);
  // snake_case keys present alongside camelCase: handled by the existing paths, so the agy transcript is not read.
  fire({ session_id: "S-7", conversationId: "C-7", transcriptPath: t, last_assistant_message: "no directive here" });
  assert.equal(sessionExists(day()), false);
});

test("AGY-8: a capture names the vault it wrote to, and flags the default when LIBRARIAN_VAULT_PATH was not set", () => {
  const t1 = transcript("agy-8.jsonl", [user("x"), planner(SESSION("Names its vault."))]);
  const named = fire(stop("C-8a", t1));
  assert.ok(named.stderr.includes(`in vault ${vaultRoot}`), named.stderr);
  assert.doesNotMatch(named.stderr, /was not set for this hook/);

  // Unset: the CLI falls back to the default vault, so run it against a throwaway HOME and say so.
  const home = path.join(vaultRoot, "home-8");
  fs.mkdirSync(home, { recursive: true });
  const env = { ...process.env, HOME: home } as Record<string, string | undefined>;
  delete env.LIBRARIAN_VAULT_PATH;
  const res = spawnSync(process.execPath, ["--import", "tsx", cli], {
    input: JSON.stringify(stop("C-8b", transcript("agy-8b.jsonl", [user("x"), planner(SESSION("Default vault."))]))),
    env: env as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.match(res.stderr, /\(default: LIBRARIAN_VAULT_PATH was not set for this hook\)/);
  assert.ok(res.stderr.includes(path.join(home, "Documents", "knowledge-vault")), res.stderr);
});
