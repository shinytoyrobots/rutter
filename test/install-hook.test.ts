import { vaultRoot } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * hooks/install-hook.mjs against throwaway config dirs (never the real
 * ~/.claude, ~/.codex or ~/.gemini): CODEX_HOME for Codex, HOME for Claude and Antigravity.
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
  assert.equal(cfg.hooks.Stop[0].hooks[0].command, `${hookPath} --client codex`, "carries the explicit client identity");
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

t("codex: an existing registration (e.g. made by hand) is detected and gains the identity, not a duplicate", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.codexHome, { recursive: true });
  fs.writeFileSync(sb.hooksJson, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: hookPath, timeout: 30 }] }] } }), "utf8");
  assert.match(install(sb, "--client", "codex").stderr, /updated the Stop hook/);
  const cfg = JSON.parse(fs.readFileSync(sb.hooksJson, "utf8"));
  assert.equal(cfg.hooks.Stop.length, 1, "updated in place, not duplicated");
  assert.deepEqual(cfg.hooks.Stop[0].hooks[0], { type: "command", command: `${hookPath} --client codex`, timeout: 30 });
  const after = fs.readFileSync(sb.hooksJson, "utf8");
  assert.match(install(sb, "--client", "codex").stderr, /already registered/);
  assert.equal(fs.readFileSync(sb.hooksJson, "utf8"), after, "and then stable");
});

t("a registration with a custom command is left alone, with a note about the identity", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.codexHome, { recursive: true });
  const custom = `FOO=1 ${hookPath}`;
  fs.writeFileSync(sb.hooksJson, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: custom }] }] } }), "utf8");
  const before = fs.readFileSync(sb.hooksJson, "utf8");
  assert.match(install(sb, "--client", "codex").stderr, /custom command/);
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
  assert.deepEqual(cfg.hooks.Stop[0].hooks[0], { type: "command", command: `${hookPath} --client claude` });
  assert.equal(fs.existsSync(sb.hooksJson), false, "Codex config untouched");
  assert.equal(install(sb, "--client", "vim").status, 1);
  assert.equal(install(sb, "--bogus").status, 1);
});

const agyHooks = (home: string): string => path.join(home, ".gemini", "config", "hooks.json");
const agyRule = (home: string): string => path.join(home, ".gemini", "config", "rules", "rutter-capture.md");

t("antigravity: creates ~/.gemini/config/hooks.json keyed by name, with Stop timeout, and prints both-environment guidance", () => {
  const sb = sandbox();
  const res = install(sb, "--client", "antigravity");
  assert.equal(res.status, 0, res.stderr);
  const cfg = JSON.parse(fs.readFileSync(agyHooks(sb.home), "utf8"));
  const entry = cfg["librarian-capture"].Stop[0];
  assert.equal(entry.type, "command");
  assert.equal(entry.timeout, 30);
  assert.equal(cfg["librarian-capture"].Stop.length, 1);
  assert.ok(entry.command.endsWith(` ${hookPath} --client agy`), "still runs the shared hook script, with the explicit identity");
  assert.match(entry.command, /^LIBRARIAN_VAULT_PATH="\$\{LIBRARIAN_VAULT_PATH:-[^}]+\}" /, "the vault is baked in as a default an exported value can override");
  assert.match(res.stderr, /VAULT for capture AND reads/);
  assert.match(res.stderr, /mcp_config\.json/);
  const rule = fs.readFileSync(agyRule(sb.home), "utf8");
  assert.match(rule, /^---\ntrigger: always_on\n---\n/, "always_on frontmatter (required, or agy silently discards the rule)");
  assert.match(rule, /librarian-session/, "carries the capture contract from the server's own text");
  assert.match(rule, /librarian-position/);
  assert.doesNotMatch(rule, /Consult these tools/, "capture contract only, not the read-tool guidance");
  assert.match(res.stderr, /"LIBRARIAN_VAULT_PATH"/, "prints the MCP env snippet");
  assert.equal(fs.existsSync(path.join(sb.home, ".claude", "settings.json")), false, "Claude config untouched");
  assert.equal(fs.existsSync(sb.hooksJson), false, "Codex config untouched");
});

t("antigravity: a registration from before the identity existed is updated in place to carry it", () => {
  const sb = sandbox();
  assert.equal(install(sb, "--client", "antigravity").status, 0);
  const cfg = JSON.parse(fs.readFileSync(agyHooks(sb.home), "utf8"));
  cfg["librarian-capture"].Stop[0].command = cfg["librarian-capture"].Stop[0].command.replace(" --client agy", "");
  fs.writeFileSync(agyHooks(sb.home), JSON.stringify(cfg), "utf8");
  assert.equal(install(sb, "--client", "antigravity").status, 0);
  const after = JSON.parse(fs.readFileSync(agyHooks(sb.home), "utf8"));
  assert.equal(after["librarian-capture"].Stop.length, 1, "not duplicated");
  assert.ok(after["librarian-capture"].Stop[0].command.endsWith(" --client agy"));
});

t("antigravity: merges beside unrelated hooks, and is idempotent", () => {
  const sb = sandbox();
  fs.mkdirSync(path.dirname(agyHooks(sb.home)), { recursive: true });
  const existing = { other: { Stop: [{ type: "command", command: "echo other" }], PreToolUse: [{ type: "command", command: "echo pre" }] } };
  fs.writeFileSync(agyHooks(sb.home), JSON.stringify(existing), "utf8");
  assert.equal(install(sb, "--client", "antigravity").status, 0);
  const after = fs.readFileSync(agyHooks(sb.home), "utf8");
  const cfg = JSON.parse(after);
  assert.deepEqual(cfg.other, existing.other);
  assert.equal(cfg["librarian-capture"].Stop.length, 1);
  const again = install(sb, "--client", "antigravity");
  assert.equal(again.status, 0);
  assert.match(again.stderr, /already registered/);
  assert.equal(fs.readFileSync(agyHooks(sb.home), "utf8"), after, "byte-identical on re-run");
});

t("antigravity: a hand-made registration under another name is detected, not duplicated", () => {
  const sb = sandbox();
  fs.mkdirSync(path.dirname(agyHooks(sb.home)), { recursive: true });
  fs.writeFileSync(agyHooks(sb.home), JSON.stringify({ mine: { Stop: [{ type: "command", command: hookPath }] } }), "utf8");
  const before = fs.readFileSync(agyHooks(sb.home), "utf8");
  assert.match(install(sb, "--client", "antigravity").stderr, /already registered/);
  assert.equal(fs.readFileSync(agyHooks(sb.home), "utf8"), before);
});

t("antigravity: the capture rule is refreshed when stale, even if the hook is already registered; a foreign file of that name is never overwritten", () => {
  const sb = sandbox();
  assert.equal(install(sb, "--client", "antigravity").status, 0);
  fs.writeFileSync(agyRule(sb.home), fs.readFileSync(agyRule(sb.home), "utf8").replace("librarian-session", "STALE"), "utf8");
  const again = install(sb, "--client", "antigravity");
  assert.equal(again.status, 0);
  assert.match(again.stderr, /already registered/);
  assert.match(fs.readFileSync(agyRule(sb.home), "utf8"), /librarian-session/, "restored from the server's text");
  const sb2 = sandbox();
  fs.mkdirSync(path.dirname(agyRule(sb2.home)), { recursive: true });
  fs.writeFileSync(agyRule(sb2.home), "my own rule\n", "utf8");
  const res = install(sb2, "--client", "antigravity");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /not written by this installer/);
  assert.equal(fs.readFileSync(agyRule(sb2.home), "utf8"), "my own rule\n");
  assert.equal(fs.existsSync(agyHooks(sb2.home)), false, "hooks.json untouched when the rule is refused");
});

const agyCommand = (home: string): string =>
  (JSON.parse(fs.readFileSync(agyHooks(home), "utf8")) as { "librarian-capture": { Stop: { command: string }[] } })["librarian-capture"].Stop[0]!.command;

t("antigravity: --vault is baked into the hook AND the MCP snippet, so reads and writes cannot disagree", () => {
  const sb = sandbox();
  const vault = path.join(sb.home, "my notes", "vault");
  const res = install(sb, "--client", "antigravity", "--vault", vault);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(agyCommand(sb.home).includes(`:-${vault}}"`), "hook default is the chosen vault (path with a space survives)");
  assert.ok(res.stderr.includes(`VAULT for capture AND reads: ${vault}`));
  assert.ok(res.stderr.includes(`"LIBRARIAN_VAULT_PATH": "${vault}"`), "MCP snippet carries the same vault");
  assert.ok(res.stderr.includes(`--env 'LIBRARIAN_VAULT_PATH=${vault}'`), "agy mcp add line carries the same vault, shell-quoted so a space stays one argument");
  assert.match(res.stderr, /from --vault/);
});

t("antigravity: with no --vault the shell's LIBRARIAN_VAULT_PATH is used, else the default is named as such", () => {
  const sb = sandbox();
  const fromEnv = spawnSync(process.execPath, [script, "--client", "antigravity"], {
    env: { ...process.env, HOME: sb.home, LIBRARIAN_VAULT_PATH: path.join(sb.home, "env-vault") },
    encoding: "utf8",
  });
  assert.equal(fromEnv.status, 0, fromEnv.stderr);
  assert.match(fromEnv.stderr, /from LIBRARIAN_VAULT_PATH in this shell/);
  assert.ok(agyCommand(sb.home).includes(`:-${path.join(sb.home, "env-vault")}}"`));
  const sb2 = sandbox();
  const env = { ...process.env, HOME: sb2.home } as Record<string, string | undefined>;
  delete env.LIBRARIAN_VAULT_PATH;
  const dflt = spawnSync(process.execPath, [script, "--client", "antigravity"], { env: env as NodeJS.ProcessEnv, encoding: "utf8" });
  assert.match(dflt.stderr, /\(from default\)/);
  assert.match(dflt.stderr, /that is the default vault/);
  assert.ok(agyCommand(sb2.home).includes(`:-${path.join(sb2.home, "Documents", "knowledge-vault")}}"`));
});

t("antigravity: re-running with a different --vault moves the hook; the same vault is a byte-identical no-op", () => {
  const sb = sandbox();
  const a = path.join(sb.home, "vault-a");
  const b = path.join(sb.home, "vault-b");
  install(sb, "--client", "antigravity", "--vault", a);
  const first = fs.readFileSync(agyHooks(sb.home), "utf8");
  assert.match(install(sb, "--client", "antigravity", "--vault", a).stderr, /unchanged/);
  assert.equal(fs.readFileSync(agyHooks(sb.home), "utf8"), first);
  const moved = install(sb, "--client", "antigravity", "--vault", b);
  assert.match(moved.stderr, /updated the Stop hook/);
  assert.ok(agyCommand(sb.home).includes(`:-${b}}"`));
  assert.equal(JSON.parse(fs.readFileSync(agyHooks(sb.home), "utf8"))["librarian-capture"].Stop.length, 1, "replaced, not stacked");
});

t("antigravity: a foreign registration baking in a DIFFERENT vault is refused before anything is changed; a matching or env-driven one is accepted", () => {
  const sb = sandbox();
  fs.mkdirSync(path.dirname(agyHooks(sb.home)), { recursive: true });
  const other = path.join(sb.home, "other-vault");
  const chosen = path.join(sb.home, "chosen-vault");
  const baked = (v: string): string => JSON.stringify({ mine: { Stop: [{ type: "command", command: `LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${v}}" ${hookPath}` }] } });
  fs.writeFileSync(agyHooks(sb.home), baked(other), "utf8");
  const res = install(sb, "--client", "antigravity", "--vault", chosen);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /already registers this hook as "mine" with vault/);
  assert.equal(fs.readFileSync(agyHooks(sb.home), "utf8"), baked(other), "hooks.json untouched");
  assert.equal(fs.existsSync(agyRule(sb.home)), false, "rule not written");
  assert.doesNotMatch(res.stderr, /agy mcp add/, "no MCP guidance printed for a vault the hook will not use");

  fs.writeFileSync(agyHooks(sb.home), baked(chosen), "utf8");
  const ok = install(sb, "--client", "antigravity", "--vault", chosen);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stderr, /already registered under another name/);

  fs.writeFileSync(agyHooks(sb.home), JSON.stringify({ mine: { Stop: [{ type: "command", command: hookPath }] } }), "utf8");
  assert.equal(install(sb, "--client", "antigravity", "--vault", chosen).status, 0, "no embedded vault: it follows the environment, so it is accepted");
});

t("antigravity: a vault path that would change the shell command is refused; --vault is refused for other clients", () => {
  const sb = sandbox();
  for (const bad of ['/tmp/a"b', "/tmp/a$b", "/tmp/a`b"]) {
    const res = install(sb, "--client", "antigravity", "--vault", bad);
    assert.equal(res.status, 1, bad);
    assert.match(res.stderr, /pass a plainer path/);
  }
  assert.equal(fs.existsSync(agyHooks(sb.home)), false, "nothing written");
  assert.equal(install(sb, "--client", "codex", "--vault", "/tmp/v").status, 1);
  assert.equal(install(sb, "--vault", "/tmp/v").status, 1);
});

t("antigravity: refuses malformed config, a non-object, and a name collision, changing nothing", () => {
  const sb = sandbox();
  fs.mkdirSync(path.dirname(agyHooks(sb.home)), { recursive: true });
  for (const bad of ["{ not json", "[]", JSON.stringify({ "librarian-capture": { Stop: [{ type: "command", command: "echo mine" }] } })]) {
    fs.writeFileSync(agyHooks(sb.home), bad, "utf8");
    assert.equal(install(sb, "--client", "antigravity").status, 1, bad);
    assert.equal(fs.readFileSync(agyHooks(sb.home), "utf8"), bad);
  }
});

test("installer refuses when dist/capture-cli.js is missing (skipped when the repo is built)", { skip: built }, () => {
  assert.equal(install(sandbox(), "--client", "codex").status, 1);
});

test("the plugin hook passes the claude identity and the shared script forwards its arguments", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "hooks", "hooks.json"), "utf8"));
  assert.match(hooks.hooks.Stop[0].hooks[0].command, /librarian-stop\.sh --client claude$/);
  assert.match(fs.readFileSync(hookPath, "utf8"), /capture-cli\.js" "\$@"/);
});
