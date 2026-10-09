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
let vaultArg;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--client") {
    client = args[++i] ?? "";
  } else if (args[i].startsWith("--client=")) {
    client = args[i].slice("--client=".length);
  } else if (args[i] === "--vault") {
    vaultArg = args[++i] ?? "";
  } else if (args[i].startsWith("--vault=")) {
    vaultArg = args[i].slice("--vault=".length);
  } else {
    fail(`unknown argument "${args[i]}" -- usage: install-hook [--client claude|codex|antigravity] [--vault <path>]`);
  }
}
if (vaultArg !== undefined && args.every((a) => a !== "antigravity" && a !== "--client=antigravity")) {
  fail("--vault is only for --client antigravity (other clients read LIBRARIAN_VAULT_PATH from the environment they launch with).");
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

  // ONE vault for both sides. The MCP server's vault is persisted config (its `env` block), but a hook
  // has no config of its own: it inherits the shell agy was launched from. When those two disagreed,
  // captures went to the default vault while reads came from another (seen in testing). So the vault is
  // decided once, here, and written into BOTH: baked into the hook command as the default for
  // LIBRARIAN_VAULT_PATH (a value exported at launch still wins), and into the MCP snippet.
  const expandHome = (v) => (v === "~" ? os.homedir() : v.startsWith("~/") ? path.join(os.homedir(), v.slice(2)) : v);
  const vaultSource = vaultArg !== undefined ? "--vault" : process.env.LIBRARIAN_VAULT_PATH ? "LIBRARIAN_VAULT_PATH in this shell" : "default";
  const vaultRaw = vaultArg !== undefined ? vaultArg : process.env.LIBRARIAN_VAULT_PATH || path.join(os.homedir(), "Documents", "knowledge-vault");
  if (vaultRaw.trim() === "") fail("--vault needs a path.");
  const vault = path.resolve(expandHome(vaultRaw.trim()));
  // The path is embedded in a double-quoted shell default; refuse characters that would change its meaning.
  if (/["$`\\\n\r]/.test(vault)) fail(`vault path ${JSON.stringify(vault)} contains a quote, $, backtick, backslash or newline; pass a plainer path.`);
  const db = process.env.LIBRARIAN_DB_PATH ?? path.join(import.meta.dirname, "..", "data", "librarian.db");
  // `--client agy` is the explicit identity: capture labels records with the host client, and an
  // argument survives every host's hook runner where an environment prefix might not.
  const command = `LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${vault}}" ${hookCommand} --client agy`;

  // Quote for a copy-pasted shell line: a path with a space or other metacharacter must stay one argument.
  const sq = (v) => (/[^A-Za-z0-9_@%+=:,./-]/.test(v) ? `'${v.replaceAll("'", "'\\''")}'` : v);

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
  // A registration under ANOTHER name is left alone, but if it bakes in a different vault it would keep
  // capturing there while the MCP entry printed below reads from this one -- the mismatch this installer
  // exists to prevent. Refuse before changing anything (the rule included); its owner updates or removes it.
  const foreign = Object.entries(cfg).find(
    ([k, v]) =>
      k !== name &&
      Array.isArray(v?.Stop) &&
      v.Stop.some((h) => typeof h?.command === "string" && (h.command.includes(hookPath) || h.command.includes(hookCommand)))
  );
  if (foreign) {
    const cmd = foreign[1].Stop.find((h) => typeof h?.command === "string" && h.command.includes(hookPath)).command;
    const m = cmd.match(/LIBRARIAN_VAULT_PATH="\$\{LIBRARIAN_VAULT_PATH:-([^}"]*)\}"/) ?? cmd.match(/LIBRARIAN_VAULT_PATH=("?)([^"\s]+)\1(?:\s|$)/);
    const theirs = m ? path.resolve(expandHome((m[2] ?? m[1]).trim())) : null;
    if (theirs !== null && theirs !== vault) {
      fail(
        `${settingsPath} already registers this hook as "${foreign[0]}" with vault ${theirs}, but you chose ${vault}. ` +
          `Update or remove that entry (or pass --vault ${theirs}), then re-run (nothing was changed).`
      );
    }
  }
  const ruleStatus = await installAntigravityRule();

  // Our own entry is refreshed in place when the vault (or the script path) changed, so re-running
  // with a different --vault actually moves capture; a registration under another name is left alone.
  const ours = cfg[name]?.Stop;
  const oursIsThis = Array.isArray(ours) && ours.some((h) => typeof h?.command === "string" && h.command.includes(hookPath));
  let hookStatus;
  if (hookRegistered && !oursIsThis) {
    hookStatus = `already registered under another name in ${settingsPath}; left unchanged (its vault is whatever it sets, NOT ${vault})`;
  } else if (oursIsThis && ours.length === 1 && ours[0].command === command && ours[0].type === "command" && ours[0].timeout === 30) {
    hookStatus = `already registered in ${settingsPath}; unchanged`;
  } else {
    // A workspace registration fires alongside the global one (capture dedupes, but report it).
    const workspaceHooks = path.join(process.cwd(), ".agents", "hooks.json");
    try {
      if (fs.existsSync(workspaceHooks) && mentionsHook(JSON.parse(fs.readFileSync(workspaceHooks, "utf8")))) {
        console.error(`[install-hook] note: ${workspaceHooks} also registers this hook; it will fire twice here (capture dedupes).`);
      }
    } catch {
      /* an unreadable workspace file is not ours to judge */
    }
    cfg[name] = { Stop: [{ type: "command", command, timeout: 30 }] };
    const tmp = `${settingsPath}.librarian-tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
    fs.renameSync(tmp, settingsPath);
    hookStatus = `${oursIsThis ? "updated" : "registered"} the Stop hook in ${settingsPath}`;
  }

  const stdio = path.join(import.meta.dirname, "..", "dist", "stdio.js");
  console.error(`[install-hook] ${hookStatus}. Capture rule: ${ruleStatus}.`);
  console.error(`[install-hook] VAULT for capture AND reads: ${vault}  (from ${vaultSource})`);
  if (vaultSource === "default") {
    console.error("[install-hook]   that is the default vault. To use another, re-run with --vault <path>.");
  }
  console.error("[install-hook] Writes (the hook) now default to that vault no matter which shell launches agy; an exported");
  console.error("[install-hook] LIBRARIAN_VAULT_PATH still overrides it, and each capture's stderr line names the vault it wrote to.");
  console.error("[install-hook] Reads (the MCP server) use the vault in its own env block. Register it with the SAME value:");
  console.error(
    `[install-hook]     agy mcp add --env ${sq(`LIBRARIAN_VAULT_PATH=${vault}`)} --env ${sq(`LIBRARIAN_DB_PATH=${db}`)} rutter ${sq(process.execPath)} ${sq(stdio)}`
  );
  console.error("[install-hook]   or put this in ~/.gemini/config/mcp_config.json (literal values; substitution there is undocumented):");
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
  console.error("[install-hook] Check /hooks in agy to review the hook (installing did NOT grant trust, if agy asks for it), then check");
  console.error(`[install-hook] ${vault}/_librarian/sessions/ after your next turn.`);
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

// The command we register carries the explicit client identity (`--client claude|codex`), which
// capture uses to label the records it writes. Compare parsed command strings, not serialized JSON:
// a path containing `"` or `\` is escaped in the serialized form and would never match, appending a
// duplicate. A registration of ours made before the identity existed (the bare script path) is
// updated in place rather than skipped or duplicated.
const identified = `${hookCommand} --client ${client}`;
const isOurs = (h) => typeof h?.command === "string" && (h.command.includes(hookPath) || h.command.includes(hookCommand));
const existing = settings.hooks.Stop.flatMap((group) => (Array.isArray(group?.hooks) ? group.hooks : [])).find(isOurs);
if (existing) {
  if (existing.command === identified) {
    console.error(`[install-hook] already registered in ${settingsPath}; nothing to do.`);
    process.exit(0);
  }
  if (existing.command !== hookPath && existing.command !== hookCommand && !/^\S*librarian-stop\.sh'? --client \S+$/.test(existing.command)) {
    console.error(
      `[install-hook] already registered in ${settingsPath} with a custom command; left unchanged. Add \`--client ${client}\` to it ` +
        `if you want records labeled with the client.`
    );
    process.exit(0);
  }
  existing.command = identified;
  const updatedTmp = `${settingsPath}.librarian-tmp`;
  fs.writeFileSync(updatedTmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  fs.renameSync(updatedTmp, settingsPath);
  console.error(`[install-hook] updated the Stop hook in ${settingsPath} to label records as "${client}".`);
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

const entry = { type: "command", command: identified };
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
