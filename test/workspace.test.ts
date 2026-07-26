import { resetLibrarian, readSession, sessionsDir, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import childProcess from "node:child_process";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { captureSession } from "../src/capture.js";
import { readRecord, readAllRecords, RecordSchema, SCHEMA_ID } from "../src/session-record.js";
import { deriveWorkspace } from "../src/workspace.js";
import { recent } from "../src/recent.js";

/**
 * SCN-005: captured entries carry workspace provenance, derived automatically.
 * Covers COR-R-019..022 and COR-A-011 plus the workspace.ts derivation unit.
 */

beforeEach(resetLibrarian);

const DAY = "2026-07-24";
const NOON = new Date("2026-07-24T12:00:00.000Z");

/**
 * Build a git working tree fixture INSIDE the throwaway temp vault: a real
 * directory holding a real `.git/config`. Nothing here runs git -- the config
 * file is exactly what the derivation reads (and all it reads).
 */
function makeRepo(rel: string, remoteUrl?: string): string {
  const root = path.join(vaultRoot, rel);
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  const lines = ["[core]", "\trepositoryformatversion = 0", "\tbare = false"];
  if (remoteUrl) {
    lines.push('[remote "origin"]', `\turl = ${remoteUrl}`, "\tfetch = +refs/heads/*:refs/remotes/origin/*");
    lines.push('[branch "main"]', '\tremote = origin');
  }
  fs.writeFileSync(path.join(root, ".git", "config"), `${lines.join("\n")}\n`, "utf8");
  return root;
}

/** A plain directory with no enclosing repository anywhere up the tree. */
function makePlainDir(rel: string): string {
  const abs = path.join(vaultRoot, rel);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

test("COR-R-019 SCN-005/AC-auto (SR-015): a capture with a cwd records cwd + auto project + repo, with zero user action", () => {
  const remote = "https://github.com/shinytoyrobots/my-librarian.git";
  const repo = makeRepo("cor-r-019/my-librarian", remote);
  // The ONLY provenance input is the cwd the Stop payload reported; nothing names
  // the project and no tool call is made (SCN-001's ambient contract is intact).
  const result = captureSession({ summary: "Shipped workspace provenance.", cwd: repo, now: NOON });
  assert.equal(result.captured, true);

  const parsed = RecordSchema.safeParse(matter(readSession(DAY)).data);
  assert.ok(parsed.success, "the record with provenance still validates");
  const workspace = parsed.data.sessions[0]!.workspace;
  assert.ok(workspace, "the entry carries workspace provenance");
  assert.equal(workspace.cwd, repo, "the working directory is recorded verbatim");
  assert.equal(workspace.project, "my-librarian", "project auto-derived from the cwd, non-empty");
  assert.equal(workspace.repo, remote, "repo read from .git/config's remote origin url");
  for (const value of [workspace.cwd, workspace.project, workspace.repo]) {
    assert.equal(typeof value, "string", "every provenance value is a typed scalar");
  }
});

test("COR-R-020 SCN-005/AC-never-blocks (SR-016): no cwd omits workspace entirely; no repo omits just repo", () => {
  // (a) No cwd at all -> captures normally, with NO workspace key (not an empty shape).
  const noCwd = captureSession({ summary: "Captured with no cwd available.", now: new Date("2026-07-24T09:00:00.000Z") });
  assert.equal(noCwd.captured, true, "capture is never blocked by missing provenance");
  const entryA = readRecord(DAY)!.sessions[0]!;
  assert.equal("workspace" in entryA, false, "the workspace key is wholly absent, not a placeholder");

  // (b) A real directory with no enclosing .git -> cwd + project, repo omitted.
  const plain = makePlainDir("cor-r-020/loose-notes");
  const noRepo = captureSession({ summary: "Captured outside any repository.", cwd: plain, now: NOON });
  assert.equal(noRepo.captured, true);
  const entryB = readRecord(DAY)!.sessions[1]!;
  assert.equal(entryB.workspace!.cwd, plain);
  assert.equal(entryB.workspace!.project, "loose-notes", "project still derived from the cwd");
  assert.equal(entryB.workspace!.repo, undefined, "unresolvable repo is omitted, never a placeholder");
  assert.equal("repo" in entryB.workspace!, false, "and the key itself is absent");
});

test("COR-R-021 SCN-005/AC-additive-optional (SR-015/SR-100): a mixed pre-/post-v3.1.0 day record validates against session-record@1", () => {
  // A record exactly as the pre-v3.1.0 code wrote it: schema session-record@1,
  // one entry, no workspace field anywhere.
  const legacyEntry = {
    id: "20260724T090000000Z",
    session_id: "S-legacy",
    time: "2026-07-24T09:00:00.000Z",
    summary: "Pre-v3.1.0 entry, written before workspace provenance existed.",
    refs: [],
  };
  const legacyRecord = {
    collection: "librarian.sessions",
    schema: "session-record@1",
    day: DAY,
    sessions: [legacyEntry],
    refs: [],
  };
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, `${DAY}.md`),
    matter.stringify(`# Sessions - ${DAY}\n\n- 09:00:00 - ${legacyEntry.summary}\n`, legacyRecord),
    "utf8"
  );
  assert.ok(readRecord(DAY), "the pre-v3.1.0 record validates unchanged on its own (no migration)");

  // A v3.1.0 capture appends into the SAME day file.
  const repo = makeRepo("cor-r-021/my-librarian", "git@github.com:shinytoyrobots/my-librarian.git");
  captureSession({ summary: "New entry, with provenance.", cwd: repo, sessionId: "S-new", now: NOON });

  const parsed = RecordSchema.safeParse(matter(readSession(DAY)).data);
  assert.ok(parsed.success, "the MIXED record validates against the same schema");
  assert.equal(parsed.data.schema, SCHEMA_ID, "schema id is not bumped");
  assert.equal(SCHEMA_ID, "session-record@1", "workspace is additive-optional on session-record@1");
  assert.equal(parsed.data.sessions.length, 2);
  assert.deepEqual(parsed.data.sessions[0], legacyEntry, "the old entry is preserved exactly, still without workspace");
  assert.equal("workspace" in parsed.data.sessions[0]!, false, "no field was back-filled onto it");
  assert.ok(parsed.data.sessions[1]!.workspace, "the new entry carries provenance");

  // Both are consumable by the readers, old and new side by side.
  assert.equal(readAllRecords()[0]!.sessions.length, 2, "readAllRecords consumes the mixed record");
  const summaries = recent().entries.map((e) => e.summary);
  assert.equal(summaries.length, 2, "librarian-recent reads both entries");
  assert.ok(summaries.includes(legacyEntry.summary), "including the provenance-less one");
});

test("COR-R-022 SCN-005/AC-dedupe-unchanged (SR-018/SR-013): re-firing with a drifted cwd stays a byte-identical no-op", () => {
  const w1 = makeRepo("cor-r-022/effort-one", "https://example.invalid/one.git");
  const w2 = makeRepo("cor-r-022/effort-one-renamed", "https://example.invalid/two.git");
  const directive = { summary: "Directive D, unchanged across every Stop firing.", sessionId: "S-cor-r-022" };

  const first = captureSession({ ...directive, cwd: w1, now: new Date("2026-07-24T10:00:00.000Z") });
  assert.equal(first.captured, true);
  const afterFirst = readSession(DAY);

  // Three more firings of the SAME directive with provenance that drifts: same cwd,
  // a renamed/different directory, then no cwd at all. Identity is the directive.
  const drifts: (string | undefined)[] = [w1, w2, undefined];
  drifts.forEach((cwd, i) => {
    const r = captureSession({ ...directive, cwd, now: new Date(`2026-07-24T10:0${i + 1}:00.000Z`) });
    assert.equal(r.captured, false, `firing ${i + 2} appends nothing`);
    assert.equal(r.deduped, true, `firing ${i + 2} is an idempotent no-op`);
  });

  assert.equal(readSession(DAY), afterFirst, "day record is byte-identical after the fourth firing");
  assert.equal(readRecord(DAY)!.sessions.length, 1, "one entry for the session; provenance never forks it");
  assert.equal(readRecord(DAY)!.sessions[0]!.workspace!.project, "effort-one", "the first firing's provenance stands");
});

test("COR-A-011 SCN-005/AC-local-reads-only (SR-017/INV-1): resolution spawns no process and opens no socket", () => {
  // A remote URL that looks entirely fetchable. Resolution must treat it as a
  // string found in a file -- never dereference it, never shell out to git.
  const remote = "https://github.com/shinytoyrobots/my-librarian.git";
  const repo = makeRepo("cor-a-011/live-looking", remote);

  const tripwires: Array<[Record<string, unknown>, string]> = [
    ...(["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const).map(
      (k) => [childProcess as unknown as Record<string, unknown>, k] as [Record<string, unknown>, string]
    ),
    [http as unknown as Record<string, unknown>, "request"],
    [http as unknown as Record<string, unknown>, "get"],
    [https as unknown as Record<string, unknown>, "request"],
    [https as unknown as Record<string, unknown>, "get"],
    [net as unknown as Record<string, unknown>, "connect"],
    [net as unknown as Record<string, unknown>, "createConnection"],
  ];
  const originals = tripwires.map(([obj, key]) => [obj, key, obj[key]] as const);
  const originalFetch = globalThis.fetch;
  for (const [obj, key] of tripwires) {
    obj[key] = () => {
      throw new Error(`forbidden during capture: ${key}`);
    };
  }
  globalThis.fetch = () => {
    throw new Error("forbidden during capture: fetch");
  };

  try {
    const result = captureSession({ summary: "Capture under an egress/subprocess tripwire.", cwd: repo, now: NOON });
    assert.equal(result.captured, true, "capture completes with every spawn/egress API armed to throw");
    assert.equal(result.entry!.workspace!.repo, remote, "the url is recorded verbatim-inert, never contacted");
  } finally {
    for (const [obj, key, value] of originals) obj[key] = value;
    globalThis.fetch = originalFetch;
  }

  // Static belt: the provenance module imports no subprocess/network API at all,
  // so there is nothing for a future edit to reach for by accident. Comments are
  // stripped first -- this module *documents* what it must not do (COR-A-011).
  const src = fs.readFileSync(fileURLToPath(new URL("../src/workspace.ts", import.meta.url)), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // `child_process` is the only door to spawn/exec, so catching the import name
  // covers every alias; `RegExp.exec` (used to parse the config) is not that door.
  const forbidden = /child_process|\bspawn\b|\bexecSync\b|\bexecFile|node:https?\b|node:net\b|\bfetch\s*\(|XMLHttpRequest|\beval\s*\(/;
  assert.equal(forbidden.test(code), false, "workspace.ts references no subprocess or network API");
});

test("SR-015 derivation: the project name follows the repository root, so a subdirectory session is still that project", () => {
  const repo = makeRepo("derive/my-librarian", "https://example.invalid/my-librarian.git");
  const nested = path.join(repo, "src", "deep");
  fs.mkdirSync(nested, { recursive: true });
  const workspace = deriveWorkspace(nested)!;
  assert.equal(workspace.cwd, nested, "the actual working directory is what gets recorded");
  assert.equal(workspace.project, "my-librarian", "project is the work-tree root's name, not 'deep'");
  assert.equal(workspace.repo, "https://example.invalid/my-librarian.git");
});

test("SR-015 derivation: a gitdir-redirect `.git` FILE (linked worktree) still resolves the shared repo", () => {
  // The shape git uses for linked worktrees and submodules: `.git` is a file
  // holding `gitdir: <path>`, and the config lives in the shared dir named by
  // `commondir`. This project's own flow worktrees are exactly this shape.
  const mainRepo = makeRepo("redirect/main-repo", "https://example.invalid/main.git");
  const gitDir = path.join(mainRepo, ".git", "worktrees", "agent-1");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, "commondir"), "../..\n", "utf8");

  const linked = path.join(vaultRoot, "redirect", "agent-1");
  fs.mkdirSync(linked, { recursive: true });
  fs.writeFileSync(path.join(linked, ".git"), `gitdir: ${gitDir}\n`, "utf8");

  const workspace = deriveWorkspace(linked)!;
  assert.equal(workspace.project, "agent-1", "the worktree's own directory names the project");
  assert.equal(workspace.repo, "https://example.invalid/main.git", "repo resolved via commondir's shared config");
});

test("SR-016 derivation: absent, empty and nameless working directories all yield no provenance", () => {
  assert.equal(deriveWorkspace(undefined), undefined, "no cwd -> no workspace");
  assert.equal(deriveWorkspace(""), undefined, "empty cwd -> no workspace");
  assert.equal(deriveWorkspace("   "), undefined, "whitespace-only cwd -> no workspace");
  assert.equal(deriveWorkspace("/"), undefined, "a cwd with no final segment yields no half-shape");
});

test("SR-017 derivation: a repository with no origin remote records cwd + project and omits repo", () => {
  const repo = makeRepo("derive/no-remote"); // real .git/config, no [remote "origin"]
  const workspace = deriveWorkspace(repo)!;
  assert.equal(workspace.project, "no-remote");
  assert.equal(workspace.repo, undefined, "no origin url in the config -> repo omitted");
});
