import { vaultRoot } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * hooks/install-hook.mjs against throwaway config dirs (never the real
 * ~/.claude or ~/.codex): CODEX_HOME for Codex, HOME for Claude.
 */

const script = fileURLToPath(new URL("../hooks/install-hook.mjs", import.meta.url));
const hookPath = fileURLToPath(new URL("../hooks/librarian-stop.sh", import.meta.url));
const distEntry = fileURLToPath(new URL("../dist/capture-cli.js", import.meta.url));

let n = 0;
function sandbox(): { home: string; codexHome: string; hooksJson: string } {
  const home = path.join(vaultRoot, `install-${n++}`);
  const codexHome = path.join(home, ".codex");
  fs.mkdirSync(home, { recursive: true });
  return { home, codexHome, hooksJson: path.join(codexHome, "hooks.json") };
}

function install(env: { home: string; codexHome: string }, ...args: string[]): { status: number | null; stderr: string } {
  const res = spawnSync(process.execPath, [script, ...args], {
    env: { ...process.env, HOME: env.home, CODEX_HOME: env.codexHome },
    encoding: "utf8",
  });
  return { status: res.status, stderr: res.stderr };
}

const built = fs.existsSync(distEntry);
const t = built ? test : test.skip; // the installer refuses an unbuilt repo by design

t("codex: creates hooks.json with the shared hook, timeout, and a trust-review message", () => {
  const sb = sandbox();
  const res = install(sb, "--client", "codex");
  assert.equal(res.status, 0, res.stderr);
  const cfg = JSON.parse(fs.readFileSync(sb.hooksJson, "utf8"));
  assert.equal(cfg.hooks.Stop.length, 1);
  assert.equal(cfg.hooks.Stop[0].hooks[0].command, hookPath);
  assert.equal(cfg.hooks.Stop[0].hooks[0].type, "command");
  assert.match(res.stderr, /\/hooks/);
  assert.match(res.stderr, /did NOT grant trust/);
  assert.match(res.stderr, /LIBRARIAN_VAULT_PATH/, "tells the user how the hook finds the vault");
  assert.equal(fs.existsSync(path.join(sb.home, ".claude", "settings.json")), false, "Claude config untouched");
});

t("codex: merges without disturbing unrelated hooks, and is idempotent", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.codexHome, { recursive: true });
  const existing = { model: "x", hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo hi" }] }], Stop: [{ hooks: [{ type: "command", command: "echo other" }] }] } };
  fs.writeFileSync(sb.hooksJson, JSON.stringify(existing), "utf8");
  assert.equal(install(sb, "--client", "codex").status, 0);
  const after = fs.readFileSync(sb.hooksJson, "utf8");
  const cfg = JSON.parse(after);
  assert.equal(cfg.model, "x");
  assert.deepEqual(cfg.hooks.SessionStart, existing.hooks.SessionStart);
  assert.equal(cfg.hooks.Stop.length, 2);
  const again = install(sb, "--client", "codex");
  assert.equal(again.status, 0);
  assert.match(again.stderr, /already registered/);
  assert.equal(fs.readFileSync(sb.hooksJson, "utf8"), after, "byte-identical on re-run");
});

t("codex: an existing registration (e.g. made by hand) is detected, not duplicated", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.codexHome, { recursive: true });
  fs.writeFileSync(sb.hooksJson, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: hookPath, timeout: 30 }] }] } }), "utf8");
  const before = fs.readFileSync(sb.hooksJson, "utf8");
  assert.match(install(sb, "--client", "codex").stderr, /already registered/);
  assert.equal(fs.readFileSync(sb.hooksJson, "utf8"), before);
});

t("codex: refuses malformed config and changes nothing", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.codexHome, { recursive: true });
  fs.writeFileSync(sb.hooksJson, "{ not json", "utf8");
  const res = install(sb, "--client", "codex");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /not valid JSON/);
  assert.equal(fs.readFileSync(sb.hooksJson, "utf8"), "{ not json");
  fs.writeFileSync(sb.hooksJson, JSON.stringify({ hooks: { Stop: "nope" } }), "utf8");
  assert.equal(install(sb, "--client", "codex").status, 1, "non-array hooks.Stop refused");
});

t("codex: reports an equivalent inline registration in config.toml instead of stacking a second one", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.codexHome, { recursive: true });
  fs.writeFileSync(path.join(sb.codexHome, "config.toml"), `[[hooks.Stop]]\ncommand = "${hookPath}"\n`, "utf8");
  const res = install(sb, "--client", "codex");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /config\.toml/);
  assert.equal(fs.existsSync(sb.hooksJson), false);
});

t("no argument still targets Claude's settings.json; unknown client or flag fails", () => {
  const sb = sandbox();
  assert.equal(install(sb).status, 0);
  const cfg = JSON.parse(fs.readFileSync(path.join(sb.home, ".claude", "settings.json"), "utf8"));
  assert.deepEqual(cfg.hooks.Stop[0].hooks[0], { type: "command", command: hookPath });
  assert.equal(fs.existsSync(sb.hooksJson), false, "Codex config untouched");
  assert.equal(install(sb, "--client", "vim").status, 1);
  assert.equal(install(sb, "--bogus").status, 1);
});

test("installer refuses when dist/capture-cli.js is missing (skipped when the repo is built)", { skip: built }, () => {
  assert.equal(install(sandbox(), "--client", "codex").status, 1);
});
