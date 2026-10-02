#!/usr/bin/env node
/**
 * Register the librarian Stop hook in a client's hook configuration:
 *   node hooks/install-hook.mjs                  -> ~/.claude/settings.json (Claude Code, Grok)
 *   node hooks/install-hook.mjs --client codex   -> $CODEX_HOME or ~/.codex, hooks.json
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
    fail(`unknown argument "${args[i]}" -- usage: install-hook [--client claude|codex]`);
  }
}
if (client !== "claude" && client !== "codex") fail(`unknown client "${client}" -- expected claude or codex.`);

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const settingsPath =
  client === "codex" ? path.join(codexHome, "hooks.json") : path.join(os.homedir(), ".claude", "settings.json");
const hookPath = path.join(import.meta.dirname, "librarian-stop.sh");
// A path containing spaces must survive the shell the host runs commands through.
const hookCommand = /[^A-Za-z0-9_@%+=:,./-]/.test(hookPath) ? `'${hookPath.replaceAll("'", "'\\''")}'` : hookPath;

if (!fs.existsSync(hookPath)) fail(`hook script not found at ${hookPath}`);

// The hook runs dist/capture-cli.js, so an unbuilt repo would register a hook
// that fails on every Stop event. Better to refuse than to install a dud.
const distEntry = path.join(import.meta.dirname, "..", "dist", "capture-cli.js");
if (!fs.existsSync(distEntry)) fail("dist/capture-cli.js is missing -- run `npm run build` first.");

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

const already = JSON.stringify(settings.hooks.Stop).includes(hookPath) || JSON.stringify(settings.hooks.Stop).includes(hookCommand);
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
  console.error("[install-hook] Codex does not run a new hook until you trust it: start Codex, run /hooks, review the");
  console.error("[install-hook] Librarian Stop hook and trust it (installing did NOT grant trust). Then check");
  console.error("[install-hook] <vault>/_librarian/sessions/ after your next turn. Directives must be in the final reply.");
} else {
  console.error("[install-hook] restart Claude Code, then check <vault>/_librarian/sessions/ after your next session.");
}
