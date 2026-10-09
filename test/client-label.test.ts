import { resetLibrarian, vaultRoot, readSession, readPositions } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyClient, parseExplicitIdentity, CLIENTS, type PayloadShape } from "../src/client.js";
import { captureSession } from "../src/capture.js";
import { capturePosition } from "../src/position.js";
import { readAllRecords } from "../src/session-record.js";

beforeEach(resetLibrarian);

const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));
const TODAY = () => new Date().toISOString().slice(0, 10);
const THIS_MONTH = () => new Date().toISOString().slice(0, 7);

const none: PayloadShape = { direct: false, agy: false, grok: false };
const agy: PayloadShape = { direct: false, agy: true, grok: false };
const grok: PayloadShape = { direct: false, agy: false, grok: true };
const label = (shape: PayloadShape, explicit: string | undefined) => classifyClient(shape, parseExplicitIdentity(explicit));

// --- The section 4 matrix, one case per cell -------------------------------

test("matrix: explicit absent", () => {
  assert.equal(label(none, undefined), undefined);
  assert.equal(label(agy, undefined), "agy", "classification of an Antigravity envelope needs no explicit identity");
  assert.equal(label(grok, undefined), "grok");
});

test("matrix: explicit claude", () => {
  assert.equal(label(none, "claude"), "claude");
  assert.equal(label(agy, "claude"), undefined, "conflict");
  assert.equal(label(grok, "claude"), "grok", "shared-hook exception: Grok runs the Claude plugin's hook");
});

test("matrix: explicit grok", () => {
  assert.equal(label(none, "grok"), "grok");
  assert.equal(label(agy, "grok"), undefined);
  assert.equal(label(grok, "grok"), "grok");
});

test("matrix: explicit codex (explicit-only; camelCase lastAssistantMessage or the agy shape contradict it)", () => {
  assert.equal(label(none, "codex"), "codex");
  assert.equal(label(agy, "codex"), undefined);
  assert.equal(label(grok, "codex"), undefined);
});

test("matrix: explicit agy", () => {
  assert.equal(label(none, "agy"), "agy");
  assert.equal(label(agy, "agy"), "agy");
  assert.equal(label(grok, "agy"), undefined);
});

test("an unrecognized explicit identity yields no label with every shape (a typo, a future client, a different case)", () => {
  for (const bad of ["gemini", "claud", "Claude", "AGY", " claude", "claude "]) {
    for (const shape of [none, agy, grok]) {
      assert.equal(label(shape, bad), undefined, `${JSON.stringify(bad)} with ${JSON.stringify(shape)}`);
    }
  }
});

test("an empty explicit identity behaves as absent", () => {
  assert.equal(label(agy, ""), "agy");
  assert.equal(label(none, ""), undefined);
});

test("a contradictory shape yields no label, and a direct payload never gets one", () => {
  const both: PayloadShape = { direct: false, agy: true, grok: true };
  for (const e of [undefined, ...CLIENTS]) assert.equal(label(both, e), undefined);
  for (const e of [undefined, ...CLIENTS]) {
    for (const s of [none, agy, grok]) assert.equal(label({ ...s, direct: true }, e), undefined);
  }
});

// --- Capture functions: canonical values only, identity untouched -----------

test("capture writes a canonical label only; anything else is dropped", () => {
  captureSession({ summary: "labeled", sessionId: "S-1", client: "codex", now: new Date("2026-07-24T10:00:00Z") });
  captureSession({ summary: "not canonical", sessionId: "S-2", client: "Codex", now: new Date("2026-07-24T10:01:00Z") });
  const sessions = readAllRecords()[0]!.sessions;
  assert.deepEqual(sessions.map((s) => s.client), ["codex", undefined]);
  assert.ok(!readSession("2026-07-24").includes("Codex"));
});

test("the label is never part of identity: the same directive from another client is still a duplicate", () => {
  const a = captureSession({ summary: "same", sessionId: "S-d", client: "claude", now: new Date("2026-07-24T10:00:00Z") });
  const b = captureSession({ summary: "same", sessionId: "S-d", client: "grok", now: new Date("2026-07-24T10:00:05Z") });
  assert.equal(a.captured, true);
  assert.equal(b.deduped, true);
  const p1 = capturePosition({ kind: "assert", topicKey: "k", rawStance: "s", sessionId: "S-d", client: "claude", now: new Date("2026-07-24T10:00:00Z") });
  const p2 = capturePosition({ kind: "assert", topicKey: "k", rawStance: "s", sessionId: "S-d", client: "agy", now: new Date("2026-07-24T10:00:05Z") });
  assert.equal(p1.captured, true);
  assert.equal(p2.deduped, true);
});

test("the label stays out of the summary text and the human-readable body", () => {
  captureSession({ summary: "plain summary", sessionId: "S-b", client: "claude", now: new Date("2026-07-24T10:00:00Z") });
  const parsed = matter(readSession("2026-07-24"));
  assert.equal((parsed.data.sessions as { summary: string }[])[0]!.summary, "plain summary");
  assert.ok(!parsed.content.includes("claude"), "frontmatter only: the body does not show the label");
});

// --- Through the real CLI, per host envelope --------------------------------

interface FireOptions {
  args?: string[];
  vars?: Record<string, string>;
}

function fire(payload: object, options: FireOptions = {}): string {
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LIBRARIAN_VAULT_PATH: vaultRoot,
    LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db"),
    ...options.vars,
  };
  if (!options.vars || !("RUTTER_CLIENT" in options.vars)) delete childEnv.RUTTER_CLIENT;
  const res = spawnSync(process.execPath, ["--import", "tsx", cli, ...(options.args ?? [])], {
    input: JSON.stringify(payload),
    env: childEnv,
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  return res.stderr;
}

const DIRECTIVE = (s: string) =>
  `done.\n<!-- librarian-session {"summary":"${s}"} -->\n<!-- librarian-position POSITION assert ${s.replace(/\s/g, "-")}: stance for ${s} -->`;

function labelsNow(): { session: (string | undefined)[]; position: (string | undefined)[] } {
  const session = (matter(readSession(TODAY())).data.sessions ?? []) as { client?: string }[];
  const position = (matter(readPositions(THIS_MONTH())).data.events ?? []) as { client?: string }[];
  return { session: session.map((s) => s.client), position: position.map((e) => e.client) };
}

function agyEnvelope(id: string, text: string): object {
  const file = path.join(vaultRoot, `agy-${id}.jsonl`);
  fs.writeFileSync(
    file,
    [{ type: "USER_INPUT", content: "hi" }, { type: "PLANNER_RESPONSE", content: text }].map((r) => JSON.stringify(r)).join("\n"),
    "utf8"
  );
  return { conversationId: id, transcriptPath: file, workspacePaths: [vaultRoot], error: "" };
}

test("CLI claude: --client claude on a Claude transcript labels both records", () => {
  const t = path.join(vaultRoot, "claude.jsonl");
  fs.writeFileSync(t, JSON.stringify({ message: { content: DIRECTIVE("claude turn") } }), "utf8");
  fire({ transcript_path: t, session_id: "S-claude", cwd: vaultRoot }, { args: ["--client", "claude"] });
  assert.deepEqual(labelsNow(), { session: ["claude"], position: ["claude"] });
});

test("CLI grok: a camelCase lastAssistantMessage is grok even through the Claude plugin's identity", () => {
  const t = path.join(vaultRoot, "updates.jsonl");
  fs.writeFileSync(t, JSON.stringify({ type: "session/update" }), "utf8");
  fire({ transcript_path: t, session_id: "S-grok", lastAssistantMessage: DIRECTIVE("grok turn") }, { args: ["--client=claude"] });
  assert.deepEqual(labelsNow(), { session: ["grok"], position: ["grok"] });
});

test("CLI codex: explicit-only; with no identity the entry is unlabeled, never guessed", () => {
  fire({ session_id: "S-codex-1", last_assistant_message: DIRECTIVE("codex one") }, { args: ["--client", "codex"] });
  fire({ session_id: "S-codex-2", last_assistant_message: DIRECTIVE("codex two") });
  assert.deepEqual(labelsNow(), { session: ["codex", undefined], position: ["codex", undefined] });
});

test("CLI agy: classification survives normalization, with or without an explicit identity", () => {
  fire(agyEnvelope("agy-1", DIRECTIVE("agy one")));
  fire(agyEnvelope("agy-2", DIRECTIVE("agy two")), { args: ["--client", "agy"] });
  assert.deepEqual(labelsNow(), { session: ["agy", "agy"], position: ["agy", "agy"] });
});

test("CLI: codex identity on an Antigravity envelope is a conflict, so no label (the record is still captured)", () => {
  fire(agyEnvelope("agy-3", DIRECTIVE("conflict turn")), { args: ["--client", "codex"] });
  assert.deepEqual(labelsNow(), { session: [undefined], position: [undefined] });
});

test("CLI: a direct payload gets no label whatever the identity", () => {
  fire({ sessionId: "S-direct", summary: "direct one", position: "assert direct-topic: direct stance" }, { args: ["--client", "claude"] });
  assert.deepEqual(labelsNow(), { session: [undefined], position: [undefined] });
});

test("CLI: RUTTER_CLIENT works as the identity, an unrecognized one labels nothing, and disagreeing sources label nothing", () => {
  fire({ session_id: "S-env-1", last_assistant_message: DIRECTIVE("env one") }, { vars: { RUTTER_CLIENT: "codex" } });
  fire({ session_id: "S-env-2", last_assistant_message: DIRECTIVE("env two") }, { vars: { RUTTER_CLIENT: "gemini" } });
  fire({ session_id: "S-env-3", last_assistant_message: DIRECTIVE("env three") }, { vars: { RUTTER_CLIENT: "claude" }, args: ["--client", "codex"] });
  fire({ session_id: "S-env-4", last_assistant_message: DIRECTIVE("env four") }, { vars: { RUTTER_CLIENT: "" } });
  assert.deepEqual(labelsNow().session, ["codex", undefined, undefined, undefined]);
});

test("CLI: an Antigravity turn that ends in an error captures nothing and so labels nothing", () => {
  fire({ ...(agyEnvelope("agy-err", DIRECTIVE("errored")) as object), error: "boom" });
  assert.equal(readSession(TODAY()), "");
});
