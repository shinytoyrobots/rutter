import { resetLibrarian, readSession, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

/**
 * Muse Code Stop adapter. Probed 2026-10-18 (1.4.10): `Stop` fires after every turn and its stdin
 * carries `last_assistant_message` and a `turn_id`; `transcript_path` is always null, so there is no
 * transcript to read -- the directive must come from the reply itself. The payloads below are the
 * recorded shape (paths shortened). Runs the real CLI entry point.
 */

beforeEach(resetLibrarian);

const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
const day = (): string => new Date().toISOString().slice(0, 10);
const LINE = (s: string): string => `<!-- librarian-session {"summary":"${s}","refs":[]} -->`;

function stop(reply: string, over: Record<string, unknown> = {}): object {
  return {
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: reply,
    session_id: "01a15221-9a1d-7241-8baa-b2eb16343276",
    turn_id: "01a15221-9de6-79b2-82ca-291ec9fe41df",
    cwd: path.join(vaultRoot, "muse-repo"),
    transcript_path: null,
    model: "muse-wonder-1.0",
    permission_mode: "default",
    ...over,
  };
}

function fire(payload: object, ...args: string[]): { stderr: string; stdout: string } {
  const res = spawnSync(process.execPath, ["--import", "tsx", cli, ...args], {
    input: JSON.stringify(payload),
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  assert.equal(res.stdout, "", "nothing on stdout (INV-5)");
  return { stderr: res.stderr, stdout: res.stdout };
}

const sessions = (): { summary: string; client?: string }[] =>
  (matter(readSession(day())).data as { sessions: { summary: string; client?: string }[] }).sessions;

test("MUSE-1: a directive in last_assistant_message is captured and labeled muse", () => {
  fire(stop(LINE("decided to ship recall first")), "--client", "muse");
  const [only, ...rest] = sessions();
  assert.equal(rest.length, 0);
  assert.equal(only!.summary, "decided to ship recall first");
  assert.equal(only!.client, "muse");
});

test("MUSE-2: replies without a directive capture nothing (a stale line from an earlier turn is not re-read)", () => {
  fire(stop(LINE("first turn")), "--client", "muse");
  fire(stop("OK", { turn_id: "01a15221-aaaa-79b2-82ca-291ec9fe41df" }), "--client", "muse");
  assert.deepEqual(sessions().map((s) => s.summary), ["first turn"]);
});

test("MUSE-3: a directive quoted mid-reply is not the final line, and the last one wins", () => {
  fire(stop(`${LINE("early")}\nWorking on it.\n${LINE("final")}`), "--client", "muse");
  assert.deepEqual(sessions().map((s) => s.summary), ["final"]);
});

test("MUSE-4: the same turn firing twice captures once", () => {
  const payload = stop(LINE("once only"));
  fire(payload, "--client", "muse");
  fire(payload, "--client", "muse");
  assert.equal(sessions().length, 1);
});

test("MUSE-5: a null transcript_path is not an error", () => {
  const out = fire(stop("nothing to record", { transcript_path: null }), "--client", "muse");
  assert.doesNotMatch(out.stderr, /error|TypeError/i);
});
