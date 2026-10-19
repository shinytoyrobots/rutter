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
/** The installer's own shell quoting: a path with a space (say, under a spaced TMPDIR) is written quoted. */
const sq = (v: string): string => (/[^A-Za-z0-9_@%+=:,./-]/.test(v) ? `'${v.replaceAll("'", "'\\''")}'` : v);

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
  assert.match(fs.readFileSync(hookPath, "utf8"), /supervise-capture\.mjs" "\$@"/, "the shell script forwards its arguments to the supervisor");
  const supervisor = fs.readFileSync(path.join(import.meta.dirname, "..", "hooks", "supervise-capture.mjs"), "utf8");
  assert.match(supervisor, /capture, \.\.\.process\.argv\.slice\(2\)/, "the supervisor forwards them to the capture CLI");
});

// ---------------------------------------------------------------------------
// npm installs (docs/archived/npm-plan.md items 3a and 3b)
// ---------------------------------------------------------------------------

t("antigravity: the printed server config sets LIBRARIAN_DB_PATH only when one was set", () => {
  const sb = sandbox();
  const e = { ...process.env, HOME: sb.home } as Record<string, string | undefined>;
  delete e.LIBRARIAN_DB_PATH;
  const unset = spawnSync(process.execPath, [script, "--client", "antigravity"], { env: e as NodeJS.ProcessEnv, encoding: "utf8" });
  assert.equal(unset.status, 0, unset.stderr);
  assert.doesNotMatch(unset.stderr, /LIBRARIAN_DB_PATH/, "neither the agy mcp add line nor the JSON carries a database path");
  const sb2 = sandbox();
  const set = spawnSync(process.execPath, [script, "--client", "antigravity"], {
    env: { ...process.env, HOME: sb2.home, LIBRARIAN_DB_PATH: "/chosen/librarian.db" },
    encoding: "utf8",
  });
  assert.match(set.stderr, /--env LIBRARIAN_DB_PATH=\/chosen\/librarian\.db/);
  assert.match(set.stderr, /"LIBRARIAN_DB_PATH": "\/chosen\/librarian\.db"/);
});

/**
 * A copy of the installable package at `<prefix>/lib/node_modules/rutter-memory`, the way
 * `npm install -g --prefix <prefix>` lays it out. Switching Node versions with nvm moves a
 * global install between prefixes like these.
 */
function prefixInstall(label: string): { installer: string; hook: string } {
  const pkg = path.join(vaultRoot, "prefixes", `${label}-${n++}`, "lib", "node_modules", "rutter-memory");
  const repo = path.join(import.meta.dirname, "..");
  fs.cpSync(path.join(repo, "hooks"), path.join(pkg, "hooks"), { recursive: true });
  fs.cpSync(path.join(repo, "dist"), path.join(pkg, "dist"), { recursive: true });
  fs.copyFileSync(path.join(repo, "package.json"), path.join(pkg, "package.json"));
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(pkg, "node_modules"));
  // Real paths: the installer names its hook by its own module location, which has symlinks resolved.
  const real = fs.realpathSync(pkg);
  return { installer: path.join(real, "hooks", "install-hook.mjs"), hook: path.join(real, "hooks", "librarian-stop.sh") };
}

function installFrom(installer: string, sb: { home: string; codexHome: string }, extraEnv: Record<string, string> = {}, ...args: string[]) {
  const e = { ...process.env, HOME: sb.home, CODEX_HOME: sb.codexHome, ...extraEnv } as Record<string, string | undefined>;
  if (!("LIBRARIAN_VAULT_PATH" in extraEnv)) delete e.LIBRARIAN_VAULT_PATH;
  return spawnSync(process.execPath, [installer, ...args], { env: e as NodeJS.ProcessEnv, encoding: "utf8" });
}

for (const client of ["claude", "codex"] as const) {
  t(`${client}: re-running install-hook from a new prefix moves the one hook there, keeping its --client`, () => {
    const sb = sandbox();
    const a = prefixInstall("a");
    const b = prefixInstall("b");
    const cfgPath = client === "codex" ? sb.hooksJson : path.join(sb.home, ".claude", "settings.json");
    assert.equal(installFrom(a.installer, sb, {}, "--client", client).status, 0);
    const moved = installFrom(b.installer, sb, {}, "--client", client);
    assert.equal(moved.status, 0, moved.stderr);
    assert.ok(moved.stderr.includes(`moved it from ${a.hook} to ${b.hook}`), moved.stderr);
    assert.match(moved.stderr, /vault the hook will use/);
    const hooks = JSON.parse(fs.readFileSync(cfgPath, "utf8")).hooks.Stop.flatMap((g: { hooks: { command: string }[] }) => g.hooks);
    assert.equal(hooks.length, 1, "exactly one rutter Stop hook");
    assert.equal(hooks[0].command, `${sq(b.hook)} --client ${client}`);
    const after = fs.readFileSync(cfgPath, "utf8");
    assert.match(installFrom(b.installer, sb, {}, "--client", client).stderr, /already registered/);
    assert.equal(fs.readFileSync(cfgPath, "utf8"), after, "then stable");
  });
}

t("claude: a config already holding the hook at two old paths ends with one, at the new path", () => {
  const sb = sandbox();
  const a = prefixInstall("a");
  const b = prefixInstall("b");
  const c = prefixInstall("c");
  const settings = path.join(sb.home, ".claude", "settings.json");
  fs.mkdirSync(path.dirname(settings), { recursive: true });
  const other = { hooks: [{ type: "command", command: "echo unrelated" }] };
  fs.writeFileSync(
    settings,
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: `${sq(a.hook)} --client grok` }] }, other, { hooks: [{ type: "command", command: sq(b.hook) }] }] } }),
    "utf8"
  );
  const res = installFrom(c.installer, sb);
  assert.equal(res.status, 0, res.stderr);
  const stop = JSON.parse(fs.readFileSync(settings, "utf8")).hooks.Stop;
  assert.deepEqual(stop, [{ hooks: [{ type: "command", command: `${sq(c.hook)} --client grok` }] }, other], "the first kept (with its own --client), the duplicate dropped, the unrelated hook untouched");
  assert.match(res.stderr, /removed 1 more registration/);
});

t("antigravity: a new prefix rewrites the hook in place and keeps the vault it was using; --vault then replaces it in both", () => {
  const sb = sandbox();
  const a = prefixInstall("a");
  const b = prefixInstall("b");
  const kept = path.join(sb.home, "kept-vault");
  const fresh = path.join(sb.home, "fresh-vault");
  assert.equal(installFrom(a.installer, sb, {}, "--client", "antigravity", "--vault", kept).status, 0);

  // A different LIBRARIAN_VAULT_PATH in this shell must not quietly move capture.
  const moved = installFrom(b.installer, sb, { LIBRARIAN_VAULT_PATH: path.join(sb.home, "shell-vault") }, "--client", "antigravity");
  assert.equal(moved.status, 0, moved.stderr);
  const entries = JSON.parse(fs.readFileSync(agyHooks(sb.home), "utf8"))["librarian-capture"].Stop;
  assert.equal(entries.length, 1);
  assert.equal(entries[0].command, `LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${kept}}" ${sq(b.hook)} --client agy`);
  assert.ok(moved.stderr.includes(`moved from ${a.hook} to ${b.hook}`), moved.stderr);
  assert.ok(moved.stderr.includes(`VAULT for capture AND reads: ${kept}  (from the existing hook)`));
  assert.ok(moved.stderr.includes(`"LIBRARIAN_VAULT_PATH": "${kept}"`), "the printed server config carries the same vault");

  const replaced = installFrom(b.installer, sb, {}, "--client", "antigravity", "--vault", fresh);
  assert.equal(replaced.status, 0, replaced.stderr);
  assert.ok(agyCommand(sb.home).includes(`:-${fresh}}"`));
  assert.ok(replaced.stderr.includes(`"LIBRARIAN_VAULT_PATH": "${fresh}"`));
  assert.ok(replaced.stderr.includes(`Sessions captured so far stay in ${kept}`), "says earlier captures stay behind");
});

// --- Copilot CLI: rutter owns $COPILOT_HOME/hooks/rutter.json and instructions/rutter.instructions.md ---

function copilotInstall(sb: { home: string; codexHome: string }, vars: Record<string, string> = {}) {
  const copilotHome = path.join(sb.home, ".copilot-x");
  const res = spawnSync(process.execPath, [script, "--client", "copilot"], {
    env: { ...process.env, HOME: sb.home, CODEX_HOME: sb.codexHome, COPILOT_HOME: copilotHome, LIBRARIAN_VAULT_PATH: "/v/notes", ...vars },
    encoding: "utf8",
  });
  return {
    ...res,
    hooksFile: path.join(copilotHome, "hooks", "rutter.json"),
    rule: path.join(copilotHome, "instructions", "rutter.instructions.md"),
    hooksDir: path.join(copilotHome, "hooks"),
  };
}

t("copilot: writes rutter.json and the instructions file under COPILOT_HOME, and prints a registration carrying the vault", () => {
  const sb = sandbox();
  const res = copilotInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(res.hooksFile, "utf8")), {
    version: 1,
    hooks: { agentStop: [{ type: "command", bash: `${hookPath} --client copilot`, timeoutSec: 30 }] },
  });
  const rule = fs.readFileSync(res.rule, "utf8");
  assert.match(rule, /^---\napplyTo: "\*\*"\n---\n<!-- rutter-capture-rule:/);
  assert.match(rule, /End every reply that settles a question, makes a decision, or finishes a change/);
  assert.match(rule, /<!-- librarian-session/);
  assert.match(res.stderr, /copilot mcp add --env LIBRARIAN_VAULT_PATH=\/v\/notes (--env (?:'LIBRARIAN_DB_PATH=[^']+'|LIBRARIAN_DB_PATH=\S+) )?rutter -- /);
  assert.equal(fs.existsSync(path.join(sb.home, ".copilot")), false, "COPILOT_HOME honored; ~/.copilot untouched");
});

t("copilot: re-running is idempotent, and the user's other hook files are untouched", () => {
  const sb = sandbox();
  const first = copilotInstall(sb);
  const theirs = path.join(first.hooksDir, "mine.json");
  const theirBody = '{ "version": 1, "hooks": { "agentStop": [ { "type": "command", "bash": "echo hi" } ] } }\n';
  fs.writeFileSync(theirs, theirBody, "utf8");
  const before = fs.readFileSync(first.hooksFile, "utf8");
  const again = copilotInstall(sb);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stderr, /already registered .*unchanged/);
  assert.match(again.stderr, /already up to date/);
  assert.equal(fs.readFileSync(first.hooksFile, "utf8"), before);
  assert.equal(fs.readFileSync(theirs, "utf8"), theirBody);
});

t("copilot: an old install's rutter.json (another script path) is recognized and moved", () => {
  const sb = sandbox();
  const first = copilotInstall(sb);
  fs.writeFileSync(
    first.hooksFile,
    JSON.stringify({ version: 1, hooks: { agentStop: [{ type: "command", bash: "/old/lib/node_modules/rutter-memory/hooks/librarian-stop.sh --client copilot", timeoutSec: 30 }] } }),
    "utf8"
  );
  const res = copilotInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /moved from \/old\//);
  assert.equal(JSON.parse(fs.readFileSync(first.hooksFile, "utf8")).hooks.agentStop[0].bash, `${hookPath} --client copilot`);
});

t("copilot: a rutter.json that isn't ours (extra hook, another event, invalid JSON) is refused byte-for-byte unchanged", () => {
  const ours = { type: "command", bash: `${hookPath} --client copilot`, timeoutSec: 30 };
  const cases = [
    JSON.stringify({ version: 1, hooks: { agentStop: [ours, { type: "command", bash: "echo extra" }] } }),
    JSON.stringify({ version: 1, hooks: { agentStop: [ours], sessionStart: [{ type: "command", bash: "echo" }] } }),
    JSON.stringify({ version: 1, hooks: { agentStop: [{ type: "command", bash: "echo mine" }] } }),
    "{ not json",
  ];
  for (const body of cases) {
    const sb = sandbox();
    const probe = copilotInstall(sb);
    fs.rmSync(probe.rule);
    fs.writeFileSync(probe.hooksFile, body, "utf8");
    const res = copilotInstall(sb);
    assert.equal(res.status, 1, `refused: ${body}`);
    assert.match(res.stderr, /nothing was changed/);
    assert.equal(fs.readFileSync(probe.hooksFile, "utf8"), body);
    assert.equal(fs.existsSync(probe.rule), false, "a refusal writes no instructions file either");
  }
});

t("copilot: a hand-written instructions file is refused, and the hook file is not written", () => {
  const sb = sandbox();
  const copilotHome = path.join(sb.home, ".copilot-x");
  fs.mkdirSync(path.join(copilotHome, "instructions"), { recursive: true });
  const rule = path.join(copilotHome, "instructions", "rutter.instructions.md");
  fs.writeFileSync(rule, "my own notes\n", "utf8");
  const res = copilotInstall(sb);
  assert.equal(res.status, 1);
  assert.equal(fs.readFileSync(rule, "utf8"), "my own notes\n");
  assert.equal(fs.existsSync(res.hooksFile), false);
});

// --- The Node path printed in MCP registrations survives a Node upgrade ---

t("printed registrations name a lasting node on PATH when it is this same binary, else the running binary", () => {
  const real = fs.realpathSync(process.execPath);
  const dir = (name: string): string => {
    const d = path.join(vaultRoot, `${name}-${n}`);
    fs.mkdirSync(d, { recursive: true });
    return d;
  };
  const linked = dir("stable-bin");
  fs.symlinkSync(real, path.join(linked, "node")); // like /opt/homebrew/bin/node -> Cellar/node/<v>/bin/node
  const other = dir("other-bin");
  fs.writeFileSync(path.join(other, "node"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const empty = dir("empty-bin");
  const dirNamedNode = dir("dir-bin");
  fs.mkdirSync(path.join(dirNamedNode, "node"));
  // The fixtures live under the test's temp folder, which the installer treats as transient; point
  // TMPDIR elsewhere unless a case is about that.
  const lasting = { TMPDIR: dir("elsewhere-tmp"), XDG_RUNTIME_DIR: "", FNM_MULTISHELL_PATH: "" };
  const printed = (vars: Record<string, string>): string => {
    const res = copilotInstall(sandbox(), { ...lasting, ...vars });
    assert.equal(res.status, 0, res.stderr);
    const line = res.stderr.split("\n").find((l) => l.includes("copilot mcp add"))!;
    return line.slice(line.indexOf(" -- ") + 4, line.lastIndexOf(" "));
  };
  const self = sq(process.execPath);
  const link = sq(path.join(linked, "node"));
  const join = (...d: string[]) => d.join(path.delimiter);

  assert.equal(printed({ PATH: join(linked, other) }), link, "the same binary through a lasting link");
  assert.equal(printed({ PATH: join(dirNamedNode, linked) }), link, "a directory named node is skipped, as a shell does");
  assert.equal(printed({ PATH: join(other, linked) }), self, "a different node first on PATH (maybe too old) is not printed");
  assert.equal(printed({ PATH: empty }), self, "no node on PATH");
  assert.equal(printed({ PATH: linked, FNM_MULTISHELL_PATH: linked }), self, "fnm's per-shell link is cleared at logout");
  // A temp folder, and a link inside it pointing at a lasting folder: both vanish.
  const tmpRoot = dir("tmp-root");
  const inTmp = path.join(tmpRoot, "bin");
  fs.mkdirSync(inTmp);
  fs.symlinkSync(real, path.join(inTmp, "node"));
  assert.equal(printed({ PATH: inTmp, TMPDIR: tmpRoot }), self, "a link under the temp folder does not last");
  const viaTmpLink = path.join(tmpRoot, "tools");
  fs.symlinkSync(linked, viaTmpLink);
  assert.equal(printed({ PATH: viaTmpLink, TMPDIR: tmpRoot }), self, "a temp-folder symlink to a lasting folder still vanishes");
  // A "temporary" root that holds home or system folders is not taken as temporary.
  assert.equal(printed({ PATH: linked, TMPDIR: "/" }), link, "TMPDIR=/ does not rule out every folder");
  assert.equal(printed({ PATH: linked, TMPDIR: vaultRoot }), link, "a TMPDIR holding HOME (the sandbox's) is ignored");

  // Antigravity's printed command and JSON snippet use the same choice.
  const sb = sandbox();
  const agy = spawnSync(process.execPath, [script, "--client", "antigravity", "--vault", "/v/notes"], {
    env: { ...process.env, ...lasting, HOME: sb.home, CODEX_HOME: sb.codexHome, PATH: linked },
    encoding: "utf8",
  });
  assert.equal(agy.status, 0, agy.stderr);
  assert.ok(agy.stderr.includes(`rutter ${link} `), agy.stderr);
  assert.ok(agy.stderr.includes(`"command": ${JSON.stringify(path.join(linked, "node"))}`), agy.stderr);
});

// --- Grok: rutter owns $GROK_HOME/hooks/rutter.json; no Claude Code needed ---

function grokInstall(sb: { home: string; codexHome: string }, vars: Record<string, string> = {}, ...extra: string[]) {
  const grokHome = path.join(sb.home, ".grok-x");
  // A developer's own GROK_* / LIBRARIAN_* settings (say GROK_CLAUDE_HOOKS_ENABLED=false) must not steer these runs.
  const base: Record<string, string | undefined> = { ...process.env };
  for (const k of Object.keys(base)) if (k.startsWith("GROK_") || k.startsWith("LIBRARIAN_")) delete base[k];
  const res = spawnSync(process.execPath, [script, "--client", "grok", ...extra], {
    env: { ...base, HOME: sb.home, CODEX_HOME: sb.codexHome, GROK_HOME: grokHome, LIBRARIAN_VAULT_PATH: "/v/notes", ...vars },
    encoding: "utf8",
  });
  return { ...res, grokHome, hooksFile: path.join(grokHome, "hooks", "rutter.json") };
}
const grokBody = (cmd: string): string => `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: cmd }] }] } }, null, 2)}\n`;
const writeAt = (file: string, text: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
};

t("grok: writes rutter.json under GROK_HOME with no ~/.claude, and prints a registration carrying the vault", () => {
  const sb = sandbox();
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(res.hooksFile, "utf8")), {
    hooks: { Stop: [{ hooks: [{ type: "command", command: `${hookPath} --client grok` }] }] },
  });
  assert.equal(fs.existsSync(path.join(sb.home, ".claude")), false, "no Claude config created");
  assert.equal(fs.existsSync(path.join(res.grokHome, "config.toml")), false, "config.toml untouched");
  const line = res.stderr.split("\n").find((l) => l.includes("grok mcp add"))!;
  assert.ok(line.includes("LIBRARIAN_VAULT_PATH=/v/notes"), line);
  assert.ok(line.includes("dist/stdio.js"), line);
  assert.match(res.stderr, /does not run it/, "never runs the registration itself");
});

t("grok: re-running with current content writes nothing", () => {
  const sb = sandbox();
  const first = grokInstall(sb);
  assert.equal(first.status, 0, first.stderr);
  const before = fs.statSync(first.hooksFile);
  const bytes = fs.readFileSync(first.hooksFile, "utf8");
  fs.utimesSync(first.hooksFile, 1_000_000, 1_000_000);
  const again = grokInstall(sb);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stderr, /unchanged/);
  assert.equal(fs.readFileSync(first.hooksFile, "utf8"), bytes);
  assert.equal(fs.statSync(first.hooksFile).mtimeMs, 1_000_000_000, "mtime untouched, so no write happened");
  assert.ok(before.size > 0);
});

t("grok: a moved install path is rewritten in place, with one entry", () => {
  const sb = sandbox();
  const file = path.join(sb.home, ".grok-x", "hooks", "rutter.json");
  writeAt(file, grokBody("/old/prefix/lib/node_modules/rutter-memory/hooks/librarian-stop.sh --client grok"));
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /moved from \/old\/prefix/);
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(cfg.hooks.Stop.length, 1);
  assert.equal(cfg.hooks.Stop[0].hooks.length, 1);
  assert.equal(cfg.hooks.Stop[0].hooks[0].command, `${hookPath} --client grok`);
});

t("grok: refuses a rutter.json it did not write, and one that is not JSON, changing nothing", () => {
  for (const content of [
    "{ not json",
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } }),
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: `${hookPath} --client grok` }, { type: "command", command: "echo extra" }] }] } }),
    JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: `${hookPath} --client grok` }] }], SessionStart: [] } }),
  ]) {
    const sb = sandbox();
    const file = path.join(sb.home, ".grok-x", "hooks", "rutter.json");
    writeAt(file, content);
    const res = grokInstall(sb);
    assert.equal(res.status, 1, content);
    assert.match(res.stderr, /nothing was changed/);
    assert.equal(fs.readFileSync(file, "utf8"), content);
  }
});

t("grok: leaves other files in the hooks folder alone", () => {
  const sb = sandbox();
  const other = path.join(sb.home, ".grok-x", "hooks", "mine.json");
  writeAt(other, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } }));
  const before = fs.readFileSync(other, "utf8");
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.readFileSync(other, "utf8"), before);
  assert.ok(fs.existsSync(res.hooksFile));
});

t("grok: rejects --vault, which only Antigravity and Muse take", () => {
  const sb = sandbox();
  const res = grokInstall(sb, {}, "--vault", "/x");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /--vault is only for/);
});

// The competing routes, one at a time: each means Grok already runs rutter's hook.
const claudeStop = (cmd: string): string => JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: cmd }] }] } });

for (const name of ["settings.json", "settings.local.json"]) {
  t(`grok: skips creating an entry when ~/.claude/${name} already runs the hook`, () => {
    const sb = sandbox();
    writeAt(path.join(sb.home, ".claude", name), claudeStop(`${hookPath} --client claude`));
    const res = grokInstall(sb);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(fs.existsSync(res.hooksFile), false, "no native entry created");
    assert.ok(res.stderr.includes(path.join(sb.home, ".claude", name)), "names the competing file");
    assert.match(res.stderr, /grok mcp add/, "still prints the registration");
  });
}

t("grok: skips creating an entry when the Claude Code plugin is installed", () => {
  const sb = sandbox();
  const installPath = path.join(sb.home, ".claude", "plugins", "cache", "rutter", "rutter", "0.8.0");
  writeAt(path.join(installPath, "hooks", "hooks.json"), claudeStop('"${CLAUDE_PLUGIN_ROOT}"/hooks/librarian-stop.sh --client claude'));
  writeAt(path.join(sb.home, ".claude", "plugins", "installed_plugins.json"), JSON.stringify({ version: 2, plugins: { "rutter@rutter": [{ scope: "user", installPath }] } }));
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.existsSync(res.hooksFile), false);
  assert.ok(res.stderr.includes(path.join(installPath, "hooks", "hooks.json")), res.stderr);
});

t("grok: a marketplace clone or an unrelated plugin is not a competing hook", () => {
  const sb = sandbox();
  // The marketplace clone holds the hook file, but nothing was installed from it.
  writeAt(path.join(sb.home, ".claude", "plugins", "marketplaces", "rutter", "hooks", "hooks.json"), claudeStop("${CLAUDE_PLUGIN_ROOT}/hooks/librarian-stop.sh"));
  const other = path.join(sb.home, ".claude", "plugins", "cache", "x", "other", "1.0.0");
  writeAt(path.join(other, "hooks", "hooks.json"), claudeStop("echo other"));
  writeAt(path.join(sb.home, ".claude", "plugins", "installed_plugins.json"), JSON.stringify({ version: 2, plugins: { "other@x": [{ installPath: other }] } }));
  writeAt(path.join(sb.home, ".claude", "settings.json"), claudeStop("echo unrelated"));
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(fs.existsSync(res.hooksFile), res.stderr);
});

t("grok: skips creating an entry when a plugin folder under GROK_HOME runs the hook", () => {
  const sb = sandbox();
  const file = path.join(sb.home, ".grok-x", "plugins", "rutter", "hooks", "hooks.json");
  writeAt(file, claudeStop("${CLAUDE_PLUGIN_ROOT}/hooks/librarian-stop.sh --client grok"));
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.existsSync(res.hooksFile), false);
  assert.ok(res.stderr.includes(file), res.stderr);
});

t("grok: skips creating an entry when another file in ~/.grok/hooks runs the hook", () => {
  const sb = sandbox();
  const file = path.join(sb.home, ".grok-x", "hooks", "mine.json");
  writeAt(file, claudeStop(`${hookPath} --client grok`));
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.existsSync(res.hooksFile), false);
  assert.ok(res.stderr.includes(file), res.stderr);
});

t("grok: with a competing hook present, an entry rutter already owns is still updated, never added to", () => {
  const sb = sandbox();
  writeAt(path.join(sb.home, ".claude", "settings.json"), claudeStop(`${hookPath} --client claude`));
  const file = path.join(sb.home, ".grok-x", "hooks", "rutter.json");
  writeAt(file, grokBody("/old/prefix/hooks/librarian-stop.sh --client grok"));
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /twice per turn/, "warns that both now exist");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(cfg.hooks.Stop[0].hooks.length, 1);
  assert.equal(cfg.hooks.Stop[0].hooks[0].command, `${hookPath} --client grok`);
  // Unchanged content with a competitor present writes nothing.
  fs.utimesSync(file, 1_000_000, 1_000_000);
  assert.equal(grokInstall(sb).status, 0);
  assert.equal(fs.statSync(file).mtimeMs, 1_000_000_000);
});

// --- Grok, adversarial-review hardening ---

t("grok: a shell command that merely looks like a moved install is refused, not overwritten", () => {
  const sb = sandbox();
  const file = path.join(sb.home, ".grok-x", "hooks", "rutter.json");
  const content = grokBody("echo>/user/hooks/librarian-stop.sh --client grok");
  writeAt(file, content);
  const res = grokInstall(sb);
  assert.equal(res.status, 1, res.stderr);
  assert.equal(fs.readFileSync(file, "utf8"), content);
});

t("grok: a symlinked or dangling rutter.json is refused, and a symlinked temp name is never written through", () => {
  const sb = sandbox();
  const dir = path.join(sb.home, ".grok-x", "hooks");
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(sb.home, "managed.json");
  fs.symlinkSync(target, path.join(dir, "rutter.json")); // dangling
  const res = grokInstall(sb);
  assert.equal(res.status, 1, res.stderr);
  assert.match(res.stderr, /symlink/);
  assert.equal(fs.existsSync(target), false, "nothing written through the link");

  const sb2 = sandbox();
  const dir2 = path.join(sb2.home, ".grok-x", "hooks");
  fs.mkdirSync(dir2, { recursive: true });
  const victim = path.join(sb2.home, "victim.txt");
  fs.writeFileSync(victim, "keep me");
  fs.symlinkSync(victim, path.join(dir2, "rutter.json.librarian-tmp"));
  assert.equal(grokInstall(sb2).status, 0);
  assert.equal(fs.readFileSync(victim, "utf8"), "keep me", "the fixed temp name is not used");
});

t("grok: an escaped-slash hook command is still recognized as a competing hook", () => {
  const sb = sandbox();
  const raw = `{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"\\/pkg\\/hooks\\/librarian-stop.sh --client claude"}]}]}}`;
  writeAt(path.join(sb.home, ".grok-x", "hooks", "mine.json"), raw);
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(fs.existsSync(res.hooksFile), false);
});

t("grok: a non-Stop mention, a description, or unparseable JSON is not a competing hook", () => {
  const sb = sandbox();
  const dir = path.join(sb.home, ".grok-x", "hooks");
  writeAt(path.join(dir, "a.json"), JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: `${hookPath}` }] }] } }));
  writeAt(path.join(dir, "b.json"), JSON.stringify({ description: "see /pkg/hooks/librarian-stop.sh" }));
  writeAt(path.join(dir, "c.json"), `{ broken /hooks/librarian-stop.sh`);
  const res = grokInstall(sb);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(fs.existsSync(res.hooksFile), res.stderr);
});

t("grok: settings.json hooks do not count while Grok's Claude hook compatibility is off, but the plugin still does", () => {
  for (const off of ["env", "toml"]) {
    const sb = sandbox();
    writeAt(path.join(sb.home, ".claude", "settings.json"), claudeStop(`${hookPath} --client claude`));
    const vars: Record<string, string> = {};
    if (off === "env") vars.GROK_CLAUDE_HOOKS_ENABLED = "false";
    else writeAt(path.join(sb.home, ".grok-x", "config.toml"), `[model]\nname = "x"\n\n[compat.claude]\nhooks = false\n\n[other]\nhooks = true\n`);
    const res = grokInstall(sb, vars);
    assert.equal(res.status, 0, res.stderr);
    assert.ok(fs.existsSync(res.hooksFile), `${off}: settings route is inert, so a native entry is needed`);
  }
  const sb = sandbox();
  const installPath = path.join(sb.home, ".claude", "plugins", "cache", "rutter", "rutter", "0.8.0");
  writeAt(path.join(installPath, "hooks", "hooks.json"), claudeStop("${CLAUDE_PLUGIN_ROOT}/hooks/librarian-stop.sh"));
  writeAt(path.join(sb.home, ".claude", "plugins", "installed_plugins.json"), JSON.stringify({ version: 2, plugins: { "rutter@rutter": [{ installPath }] } }));
  const res = grokInstall(sb, { GROK_CLAUDE_HOOKS_ENABLED: "false" });
  assert.equal(fs.existsSync(res.hooksFile), false, "the compat switch does not reach plugin hooks");
});

t("grok: Claude hook compatibility is read from real TOML (comments, quoted keys, other tables, dotted and inline forms)", () => {
  const off = [
    `[compat.claude] # off\nhooks = false\n`,
    `[compat.claude]\n"hooks" = false\n`,
    `compat.claude.hooks = false\n`,
    `[compat]\nclaude = { hooks = false }\n`,
    `  [ compat . claude ]\n  hooks = false # no\n`,
  ];
  const on = [`[compat.claude]\nhooks = true\n\n  [other]\n  hooks = false\n`, `[compat.claude]\nagents = false\n`, `[other]\nhooks = false\n`];
  for (const [toml, expectNative] of [...off.map((x) => [x, true] as const), ...on.map((x) => [x, false] as const)]) {
    const sb = sandbox();
    writeAt(path.join(sb.home, ".claude", "settings.json"), claudeStop(`${hookPath} --client claude`));
    writeAt(path.join(sb.home, ".grok-x", "config.toml"), toml);
    const res = grokInstall(sb);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(fs.existsSync(res.hooksFile), expectNative, toml);
  }
});

t("grok: a Stop command that only names the script is not a competing hook; real invocations are", () => {
  for (const [command, competing] of [
    ["echo /pkg/hooks/librarian-stop.sh", false],
    ["/pkg/hooks/librarian-stop.sh --client claude", true],
    ["'/with space/hooks/librarian-stop.sh' --client claude", true],
    ['"${CLAUDE_PLUGIN_ROOT}"/hooks/librarian-stop.sh --client claude', true],
    ["LIBRARIAN_NODE=/n /pkg/hooks/librarian-stop.sh", true],
  ] as const) {
    const sb = sandbox();
    writeAt(path.join(sb.home, ".grok-x", "hooks", "mine.json"), claudeStop(command));
    const res = grokInstall(sb);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(fs.existsSync(res.hooksFile), !competing, command);
  }
});
