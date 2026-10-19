import { vaultRoot } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * hooks/install-hook.mjs --client muse against a throwaway HOME (never the real ~/.config/muse).
 * Muse Code probed 2026-10-18 (1.4.10): the user's settings.json holds hooks and MCP servers, is
 * shared with Muse's own settings, and hooks run with a cleared environment.
 */

const script = fileURLToPath(new URL("../hooks/install-hook.mjs", import.meta.url));
const hookPath = fileURLToPath(new URL("../hooks/librarian-stop.sh", import.meta.url));
const stdioPath = fileURLToPath(new URL("../dist/stdio.js", import.meta.url));
const distEntry = fileURLToPath(new URL("../dist/capture-cli.js", import.meta.url));
const t = fs.existsSync(distEntry) ? test : test.skip; // the installer refuses an unbuilt repo by design

let n = 0;
function sandbox() {
  const home = path.join(vaultRoot, `muse-${n++}`);
  const museHome = path.join(home, ".config", "muse");
  fs.mkdirSync(home, { recursive: true });
  return { home, museHome, settings: path.join(museHome, "settings.json"), rules: path.join(museHome, "AGENTS.md") };
}
function install(sb: { home: string }, args: string[] = [], vars: Record<string, string> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: sb.home, ...vars };
  if (!("LIBRARIAN_VAULT_PATH" in vars)) delete env.LIBRARIAN_VAULT_PATH;
  const res = spawnSync(process.execPath, [script, "--client", "muse", ...args], { env, encoding: "utf8" });
  return { status: res.status, stderr: res.stderr };
}
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const museCommands = (cfg: { hooks?: { Stop?: { hooks?: { command?: string }[] }[] } }) =>
  (cfg.hooks?.Stop ?? []).flatMap((g) => g.hooks ?? []).map((h) => h.command ?? "");

t("muse: writes the hook, an optional MCP entry, and the rules block, with the vault and an absolute node baked in", () => {
  const sb = sandbox();
  const res = install(sb, ["--vault", "/v/notes"]);
  assert.equal(res.status, 0, res.stderr);
  const cfg = read(sb.settings);
  const [cmd] = museCommands(cfg);
  assert.match(cmd, /^LIBRARIAN_NODE=\S+ LIBRARIAN_VAULT_PATH="\$\{LIBRARIAN_VAULT_PATH:-\/v\/notes\}" /);
  assert.ok(cmd.endsWith(`${hookPath} --client muse`), cmd);
  assert.equal(cfg.hooks.Stop[0].hooks[0].type, "command");
  const server = cfg.mcp_servers.rutter;
  assert.equal(server.mode, "optional", "Muse aborts the run for a failed `required` server");
  assert.equal(server.transport, "stdio");
  assert.deepEqual(server.args, [stdioPath]);
  assert.ok(path.isAbsolute(server.command));
  assert.equal(server.env.LIBRARIAN_VAULT_PATH, "/v/notes");
  const rules = fs.readFileSync(sb.rules, "utf8");
  assert.match(rules, /BEGIN rutter-capture-rule/);
  assert.match(rules, /librarian-session/);
  assert.match(res.stderr, /cleared environment/);
  assert.match(res.stderr, /cmux/, "warns about the muse name collision");
});

t("muse: is idempotent -- a second run changes nothing, byte for byte", () => {
  const sb = sandbox();
  assert.equal(install(sb, ["--vault", "/v/notes"]).status, 0);
  const s1 = fs.readFileSync(sb.settings, "utf8");
  const r1 = fs.readFileSync(sb.rules, "utf8");
  const again = install(sb, ["--vault", "/v/notes"]);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stderr, /unchanged/);
  assert.match(again.stderr, /already up to date/);
  assert.equal(fs.readFileSync(sb.settings, "utf8"), s1);
  assert.equal(fs.readFileSync(sb.rules, "utf8"), r1);
});

t("muse: a re-run without --vault keeps the vault the hook already uses", () => {
  const sb = sandbox();
  assert.equal(install(sb, ["--vault", "/v/notes"]).status, 0);
  const again = install(sb, [], { LIBRARIAN_VAULT_PATH: "/somewhere/else" });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stderr, /from the existing hook/);
  assert.match(museCommands(read(sb.settings))[0], /:-\/v\/notes\}/);
});

t("muse: keeps Muse's own settings, other hooks and other MCP servers, and accepts the mcpServers spelling Muse rewrites to", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.museHome, { recursive: true });
  const existing = {
    schema_version: 1,
    tui: { foreign_context_notice_shown: true },
    contributor_mode_enabled: true,
    mcpServers: { other: { transport: "stdio", command: "x", args: [] } },
    hooks: { PostToolUse: [{ hooks: [{ type: "command", command: "echo hi" }] }], Stop: [{ hooks: [{ type: "command", command: "echo other" }] }] },
  };
  fs.writeFileSync(sb.settings, JSON.stringify(existing), "utf8");
  assert.equal(install(sb, ["--vault", "/v/notes"]).status, 0);
  const cfg = read(sb.settings);
  assert.equal(cfg.schema_version, 1);
  assert.deepEqual(cfg.tui, existing.tui);
  assert.equal(cfg.contributor_mode_enabled, true);
  assert.deepEqual(cfg.hooks.PostToolUse, existing.hooks.PostToolUse);
  assert.deepEqual(cfg.mcpServers.other, existing.mcpServers.other);
  assert.ok(cfg.mcpServers.rutter, "wrote under the spelling already present");
  assert.equal("mcp_servers" in cfg, false, "did not create a second spelling");
  assert.equal(museCommands(cfg).length, 2);
  assert.ok(museCommands(cfg).includes("echo other"));
});

t("muse: collapses duplicate rutter hooks to one and moves a stale script path", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.museHome, { recursive: true });
  const old = `LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-/v/notes}" /old/place/hooks/librarian-stop.sh --client muse`;
  fs.writeFileSync(sb.settings, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: old }] }, { hooks: [{ type: "command", command: old }] }] } }), "utf8");
  const res = install(sb);
  assert.equal(res.status, 0, res.stderr);
  const cmds = museCommands(read(sb.settings));
  assert.equal(cmds.length, 1);
  assert.ok(cmds[0].endsWith(`${hookPath} --client muse`));
  assert.match(cmds[0], /:-\/v\/notes\}/, "kept the vault from the old registration");
});

t("muse: refuses invalid JSON, a non-object file, a foreign rutter server, and both MCP spellings -- changing nothing", () => {
  for (const [label, body, pattern] of [
    ["invalid", "{ not json", /not valid JSON/],
    ["array", "[]", /not a JSON object/],
    ["foreign server", JSON.stringify({ mcp_servers: { rutter: { transport: "stdio", command: "other", args: ["thing.js"] } } }), /not this server/],
    ["both spellings", JSON.stringify({ mcp_servers: {}, mcpServers: {} }), /both/],
    ["hooks not an object", JSON.stringify({ hooks: [] }), /non-object "hooks"/],
    ["Stop not an array", JSON.stringify({ hooks: { Stop: {} } }), /non-array hooks.Stop/],
  ] as const) {
    const sb = sandbox();
    fs.mkdirSync(sb.museHome, { recursive: true });
    fs.writeFileSync(sb.settings, body, "utf8");
    const res = install(sb, ["--vault", "/v/notes"]);
    assert.equal(res.status, 1, label);
    assert.match(res.stderr, pattern, label);
    assert.equal(fs.readFileSync(sb.settings, "utf8"), body, `${label}: settings untouched`);
    assert.equal(fs.existsSync(sb.rules), false, `${label}: rules untouched`);
  }
});

t("muse: appends to a user's own AGENTS.md without touching their text, and refreshes only its own block", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.museHome, { recursive: true });
  fs.writeFileSync(sb.rules, "# My rules\nBe terse.\n", "utf8");
  assert.equal(install(sb, ["--vault", "/v/notes"]).status, 0);
  const first = fs.readFileSync(sb.rules, "utf8");
  assert.ok(first.startsWith("# My rules\nBe terse.\n\n"));
  assert.match(first, /BEGIN rutter-capture-rule/);
  // User text after the block survives a refresh, and a stale block is replaced, not duplicated.
  fs.writeFileSync(sb.rules, first.replace(/librarian-session/, "stale-marker") + "\nTrailing user note.\n", "utf8");
  assert.equal(install(sb, ["--vault", "/v/notes"]).status, 0);
  const after = fs.readFileSync(sb.rules, "utf8");
  assert.ok(after.startsWith("# My rules\nBe terse.\n"));
  assert.ok(after.includes("Trailing user note."));
  assert.equal(after.split("BEGIN rutter-capture-rule").length, 2, "exactly one block");
  assert.ok(!after.includes("stale-marker"));
});

t("muse: a damaged rules block is refused before settings.json is written", () => {
  const sb = sandbox();
  fs.mkdirSync(sb.museHome, { recursive: true });
  fs.writeFileSync(sb.rules, "<!-- BEGIN rutter-capture-rule: x -->\nno end marker\n", "utf8");
  const res = install(sb, ["--vault", "/v/notes"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /damaged rutter block/);
  assert.equal(fs.existsSync(sb.settings), false, "nothing written");
});

t("muse: a vault path that would break the shell default is refused", () => {
  const sb = sandbox();
  for (const bad of ['/v/no"tes', "/v/$HOME", "/v/a`b", "/v/a}b"]) {
    const res = install(sb, ["--vault", bad]);
    assert.equal(res.status, 1, bad);
    assert.equal(fs.existsSync(sb.settings), false, `${bad}: nothing written`);
  }
});

t("muse: a path with a space survives the shell quoting in the command", () => {
  const sb = sandbox();
  assert.equal(install(sb, ["--vault", "/v/my notes"]).status, 0);
  const cmd = museCommands(read(sb.settings))[0];
  // Swap the hook script for a child shell that prints what the hook would inherit.
  const probe = `/bin/sh -c 'printf "%s|%s" "$LIBRARIAN_VAULT_PATH" "$LIBRARIAN_NODE"' #`;
  const shell = spawnSync("/bin/sh", ["-c", cmd.replace(`${hookPath} --client muse`, probe)], { encoding: "utf8", env: { PATH: "/usr/bin:/bin" } });
  assert.match(shell.stdout, /^\/v\/my notes\|\//, "the vault default and an absolute node reach the hook, vault as one value");
});

t("muse: --vault is accepted for muse and still refused for claude", () => {
  const sb = sandbox();
  const bad = spawnSync(process.execPath, [script, "--client", "claude", "--vault", "/v"], { env: { ...process.env, HOME: sb.home }, encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /antigravity or muse/);
});
