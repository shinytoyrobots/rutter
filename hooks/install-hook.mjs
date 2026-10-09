#!/usr/bin/env node
/**
 * Register the librarian Stop hook in a client's hook configuration:
 *   node hooks/install-hook.mjs                  -> ~/.claude/settings.json (Claude Code, Grok)
 *   node hooks/install-hook.mjs --client codex   -> $CODEX_HOME or ~/.codex, hooks.json
 *   node hooks/install-hook.mjs --client antigravity -> ~/.gemini/config/hooks.json (agy)
 *
 * This is the ONE step of ambient capture that cannot ship inside the server:
 * MCP has no mechanism to install a client hook, so it stays external. It is
 * mechanical config rather than contract text, which is why automating it is
 * enough -- there is nothing here that can drift out of sync with the server or
 * be worded wrongly (SR-028).
 *
 * Deliberately conservative: it merges into whatever is already there, never
 * clobbers an unrelated hook, and is idempotent (re-running changes nothing).
 * It writes via temp+rename so an interrupted run cannot leave a truncated
 * settings.json -- corrupting that file would break the user's whole client.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

function fail(message) {
  console.error(`[install-hook] ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
let client = "claude";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--client") {
    client = args[++i] ?? "";
  } else if (args[i].startsWith("--client=")) {
    client = args[i].slice("--client=".length);
  } else {
    fail(`unknown argument "${args[i]}" -- usage: install-hook [--client claude|codex|antigravity]`);
  }
}
if (client !== "claude" && client !== "codex" && client !== "antigravity") {
  fail(`unknown client "${client}" -- expected claude, codex, or antigravity.`);
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const settingsPath =
  client === "codex"
    ? path.join(codexHome, "hooks.json")
    : client === "antigravity"
      ? path.join(os.homedir(), ".gemini", "config", "hooks.json")
      : path.join(os.homedir(), ".claude", "settings.json");
const hookPath = path.join(import.meta.dirname, "librarian-stop.sh");
// A path containing spaces must survive the shell the host runs commands through.
const hookCommand = /[^A-Za-z0-9_@%+=:,./-]/.test(hookPath) ? `'${hookPath.replaceAll("'", "'\\''")}'` : hookPath;

if (!fs.existsSync(hookPath)) fail(`hook script not found at ${hookPath}`);

// The hook runs dist/capture-cli.js, so an unbuilt repo would register a hook
// that fails on every Stop event. Better to refuse than to install a dud.
const distEntry = path.join(import.meta.dirname, "..", "dist", "capture-cli.js");
if (!fs.existsSync(distEntry)) fail("dist/capture-cli.js is missing -- run `npm run build` first.");

if (client === "antigravity") await installAntigravity();

async function installAntigravity() {
  // agy's hooks.json is keyed by hook NAME, then event: { "<name>": { "Stop": [ {type, command, timeout} ] } }
  // (not Claude/Codex's { hooks: { Stop: [ { hooks: [...] } ] } }). The Stop hook is non-blocking by
  // construction: the wrapper exits 0 with empty stdout and never emits decision "continue".
  const name = "librarian-capture";
  const mentionsHook = (cfg) =>
    Object.values(cfg ?? {}).some(
      (v) =>
        Array.isArray(v?.Stop) &&
        v.Stop.some((h) => typeof h?.command === "string" && (h.command.includes(hookPath) || h.command.includes(hookCommand)))
    );
  let cfg = {};
  if (fs.existsSync(settingsPath)) {
    const raw = fs.readFileSync(settingsPath, "utf8");
    try {
      cfg = raw.trim() === "" ? {} : JSON.parse(raw);
    } catch {
      fail(`${settingsPath} is not valid JSON -- fix or move it, then re-run (nothing was changed).`);
    }
    if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
      fail(`${settingsPath} is not a JSON object -- fix it, then re-run (nothing was changed).`);
    }
  } else {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  }
  const hookRegistered = mentionsHook(cfg);
  if (!hookRegistered && name in cfg) {
    fail(`${settingsPath} already has a hook named "${name}" that is not this one -- rename it, then re-run (nothing was changed).`);
  }
  const ruleStatus = await installAntigravityRule();
  if (hookRegistered) {
    console.error(`[install-hook] already registered in ${settingsPath}; hook unchanged. Capture rule: ${ruleStatus}.`);
    process.exit(0);
  }
  // A workspace registration fires alongside the global one (capture dedupes, but report it).
  const workspaceHooks = path.join(process.cwd(), ".agents", "hooks.json");
  try {
    if (fs.existsSync(workspaceHooks) && mentionsHook(JSON.parse(fs.readFileSync(workspaceHooks, "utf8")))) {
      console.error(`[install-hook] note: ${workspaceHooks} also registers this hook; it will fire twice here (capture dedupes).`);
    }
  } catch {
    /* an unreadable workspace file is not ours to judge */
  }
  cfg[name] = { Stop: [{ type: "command", command: hookCommand, timeout: 30 }] };
  const tmp = `${settingsPath}.librarian-tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, settingsPath);

  const vault = process.env.LIBRARIAN_VAULT_PATH ?? path.join(os.homedir(), "Documents", "knowledge-vault");
  const db = process.env.LIBRARIAN_DB_PATH ?? path.join(import.meta.dirname, "..", "data", "librarian.db");
  const stdio = path.join(import.meta.dirname, "..", "dist", "stdio.js");
  console.error(`[install-hook] registered the Stop hook in ${settingsPath}. Capture rule: ${ruleStatus}.`);
  console.error("[install-hook] TWO environments must name the SAME vault, or records are written to one vault and read from another:");
  console.error("[install-hook]  1. the hook (capture) inherits the environment agy is launched with: export LIBRARIAN_VAULT_PATH there.");
  console.error("[install-hook]  2. the MCP server (reads) takes its own env from ~/.gemini/config/mcp_config.json. Add (literal values;");
  console.error("[install-hook]     variable substitution there is undocumented):");
  console.error(
    JSON.stringify(
      { mcpServers: { rutter: { command: process.execPath, args: [stdio], env: { LIBRARIAN_VAULT_PATH: vault, LIBRARIAN_DB_PATH: db } } } },
      null,
      2
    )
      .split("\n")
      .map((l) => `[install-hook]     ${l}`)
      .join("\n")
  );
  console.error(`[install-hook] vault in the snippet above: ${vault}${process.env.LIBRARIAN_VAULT_PATH ? "" : " (default; set LIBRARIAN_VAULT_PATH to change)"}.`);
  console.error("[install-hook] Check /hooks in agy to review the hook (installing did NOT grant trust, if agy asks for it), then check");
  console.error("[install-hook] <vault>/_librarian/sessions/ after your next turn.");
  process.exit(0);
}

/**
 * agy does NOT put an MCP server's `instructions` in the prompt (it saves them as a file under
 * ~/.gemini/antigravity-cli/mcp/<server>/ that the model may never read), and in testing the model
 * never wrote a directive on its own from that, or from AGENTS.md. A global `trigger: always_on`
 * rule is injected into the system prompt every turn and made every model tried (Gemini Flash and
 * Pro, Claude Sonnet) emit the directive. The text is taken from the server's own contract
 * (SERVER_INSTRUCTIONS, the single source -- SR-027), never restated here.
 */
async function installAntigravityRule() {
  const rulePath = path.join(os.homedir(), ".gemini", "config", "rules", "rutter-capture.md");
  const marker = "<!-- rutter-capture-rule: generated by install-hook; edits are overwritten on re-run -->";
  const { SERVER_INSTRUCTIONS } = await import(pathToFileURL(path.join(import.meta.dirname, "..", "dist", "server.js")).href);
  const from = SERVER_INSTRUCTIONS.indexOf("When a session decides");
  const to = SERVER_INSTRUCTIONS.indexOf("Everything these tools return");
  const contract = from >= 0 ? SERVER_INSTRUCTIONS.slice(from, to > from ? to : undefined).trim() : SERVER_INSTRUCTIONS.trim();
  const body = `---\ntrigger: always_on\n---\n${marker}\n\n${contract}\n`;
  if (fs.existsSync(rulePath)) {
    const existing = fs.readFileSync(rulePath, "utf8");
    if (existing === body) return `${rulePath} already up to date`;
    if (!existing.includes("rutter-capture-rule:")) {
      fail(`${rulePath} exists and was not written by this installer -- move it, then re-run (hooks.json was not changed).`);
    }
  } else {
    fs.mkdirSync(path.dirname(rulePath), { recursive: true });
  }
  const tmp = `${rulePath}.librarian-tmp`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, rulePath);
  return `wrote ${rulePath}`;
}

let settings = {};
if (fs.existsSync(settingsPath)) {
  const raw = fs.readFileSync(settingsPath, "utf8");
  try {
    settings = raw.trim() === "" ? {} : JSON.parse(raw);
  } catch {
    // Never overwrite a file we cannot parse: the user's own config is at stake.
    fail(`${settingsPath} is not valid JSON -- fix or move it, then re-run (nothing was changed).`);
  }
} else {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
}

settings.hooks ??= {};
settings.hooks.Stop ??= [];

if (!Array.isArray(settings.hooks.Stop)) {
  fail(`${settingsPath} has a non-array hooks.Stop -- fix it, then re-run (nothing was changed).`);
}

// Compare parsed command strings, not serialized JSON: a path containing `"` or `\`
// is escaped in the serialized form and would never match, appending a duplicate.
const already = settings.hooks.Stop.some(
  (group) =>
    Array.isArray(group?.hooks) &&
    group.hooks.some((h) => typeof h?.command === "string" && (h.command.includes(hookPath) || h.command.includes(hookCommand)))
);
if (already) {
  console.error(`[install-hook] already registered in ${settingsPath}; nothing to do.`);
  process.exit(0);
}

// Codex merges hook sources (hooks.json, inline config.toml). An equivalent hook
// registered in config.toml would fire alongside ours and double-capture work
// (the capture dedupes, but report it rather than silently stack registrations).
if (client === "codex") {
  const tomlPath = path.join(codexHome, "config.toml");
  if (fs.existsSync(tomlPath) && fs.readFileSync(tomlPath, "utf8").includes(hookPath)) {
    fail(`${tomlPath} already registers ${hookPath} inline -- remove one registration (nothing was changed).`);
  }
}

const entry = { type: "command", command: hookCommand };
if (client === "codex") {
  entry.timeout = 30;
  entry.statusMessage = "Librarian: capturing session memory";
}
settings.hooks.Stop.push({ hooks: [entry] });

const tmp = `${settingsPath}.librarian-tmp`;
fs.writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
fs.renameSync(tmp, settingsPath);

console.error(`[install-hook] registered the Stop hook in ${settingsPath}.`);
if (client === "codex") {
  console.error(`[install-hook] vault the hook will use: ${process.env.LIBRARIAN_VAULT_PATH ?? "~/Documents/knowledge-vault (default)"}.`);
  console.error("[install-hook] Codex hooks read LIBRARIAN_VAULT_PATH from the environment Codex is launched with, not from config.toml.");
  console.error("[install-hook] Codex does not run a new hook until you trust it: start Codex, run /hooks, review the");
  console.error("[install-hook] Librarian Stop hook and trust it (installing did NOT grant trust). Then check");
  console.error("[install-hook] <vault>/_librarian/sessions/ after your next turn. Directives must be in the final reply.");
} else {
  console.error("[install-hook] restart Claude Code, then check <vault>/_librarian/sessions/ after your next session.");
}
