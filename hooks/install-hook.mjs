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

// A registration is ours wherever it lives, not only at this install's path: switching Node
// versions (nvm and friends) moves a global install, and a hook left at the old path would
// otherwise look foreign -- stacking a second hook beside it, or refusing outright. Only the
// shapes this installer writes are recognized; anything else is a user's custom command.
const unquote = (v) => (v.startsWith("'") ? v.slice(1, -1).replaceAll("'\\''", "'") : v);
/** `<script>[ --client <name>]`, the script bare or single-quoted and ending in /hooks/librarian-stop.sh. */
function parseOurs(command) {
  const m = typeof command === "string" ? command.match(/^('(?:[^']|'\\'')*'|[^\s']+)(?: --client (\S+))?$/) : null;
  if (!m) return null;
  const script = unquote(m[1]);
  return script.endsWith("/hooks/librarian-stop.sh") ? { script, client: m[2] } : null;
}
/** Antigravity's shape: the same, optionally behind a baked-in vault default. */
function parseAgy(command) {
  const m = typeof command === "string" ? command.match(/^LIBRARIAN_VAULT_PATH="\$\{LIBRARIAN_VAULT_PATH:-([^}"]*)\}" (.*)$/s) : null;
  const parsed = parseOurs(m ? m[2] : command);
  return parsed && { ...parsed, vault: m ? m[1] : undefined };
}

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

  const expandHome = (v) => (v === "~" ? os.homedir() : v.startsWith("~/") ? path.join(os.homedir(), v.slice(2)) : v);
  const isOursCmd = (c) => typeof c === "string" && (parseAgy(c) !== null || c.includes(hookPath) || c.includes(hookCommand));
  const mentionsHook = (cfg) => Object.values(cfg ?? {}).some((v) => Array.isArray(v?.Stop) && v.Stop.some((h) => isOursCmd(h?.command)));
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
  const ours = Array.isArray(cfg[name]?.Stop) ? cfg[name].Stop : undefined;
  const namedIsOurs = ours !== undefined && ours.some((h) => isOursCmd(h?.command));
  if (name in cfg && !namedIsOurs) {
    fail(`${settingsPath} already has a hook named "${name}" that is not this one -- rename it, then re-run (nothing was changed).`);
  }
  const foreign = Object.entries(cfg).find(([k, v]) => k !== name && Array.isArray(v?.Stop) && v.Stop.some((h) => isOursCmd(h?.command)));
  const vaultIn = (cmd) => {
    const m = cmd.match(/LIBRARIAN_VAULT_PATH="\$\{LIBRARIAN_VAULT_PATH:-([^}"]*)\}"/) ?? cmd.match(/LIBRARIAN_VAULT_PATH=("?)([^"\s]+)\1(?:\s|$)/);
    return m ? path.resolve(expandHome((m[2] ?? m[1]).trim())) : undefined;
  };
  const foreignCmd = foreign?.[1].Stop.find((h) => isOursCmd(h?.command))?.command;
  const ownCmd = ours?.find((h) => isOursCmd(h?.command))?.command;

  // ONE vault for both sides. The MCP server's vault is persisted config (its `env` block), but a hook
  // has no config of its own: it inherits the shell agy was launched from. When those two disagreed,
  // captures went to the default vault while reads came from another (seen in testing). So the vault is
  // decided once, here, and written into BOTH: baked into the hook command as the default for
  // LIBRARIAN_VAULT_PATH (a value exported at launch still wins), and into the MCP snippet.
  // Order: --vault, then the vault the existing hook already sets (where capture has been writing, so a
  // re-run after a Node switch does not quietly move it), then this shell's LIBRARIAN_VAULT_PATH, then
  // the default.
  const preserved = (ownCmd && vaultIn(ownCmd)) ?? (foreignCmd && vaultIn(foreignCmd)) ?? undefined;
  const vaultSource =
    vaultArg !== undefined
      ? "--vault"
      : preserved !== undefined
        ? "the existing hook"
        : process.env.LIBRARIAN_VAULT_PATH
          ? "LIBRARIAN_VAULT_PATH in this shell"
          : "default";
  const vaultRaw =
    vaultArg !== undefined ? vaultArg : preserved ?? (process.env.LIBRARIAN_VAULT_PATH || path.join(os.homedir(), "Documents", "knowledge-vault"));
  if (vaultRaw.trim() === "") fail("--vault needs a path.");
  const vault = path.resolve(expandHome(vaultRaw.trim()));
  // The path is embedded in a double-quoted shell default; refuse characters that would change its meaning.
  if (/["$`\\\n\r]/.test(vault)) fail(`vault path ${JSON.stringify(vault)} contains a quote, $, backtick, backslash or newline; pass a plainer path.`);
  // Only an explicitly set database path is passed on. Otherwise the server picks its own default (a
  // per-vault index for an npm install, `data/` in a clone); baking in `<package>/data/` would put an
  // npm install's index inside node_modules.
  const db = process.env.LIBRARIAN_DB_PATH?.trim() || undefined;
  // `--client agy` is the explicit identity: capture labels records with the host client, and an
  // argument survives every host's hook runner where an environment prefix might not.
  const command = `LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${vault}}" ${hookCommand} --client agy`;

  // Quote for a copy-pasted shell line: a path with a space or other metacharacter must stay one argument.
  const sq = (v) => (/[^A-Za-z0-9_@%+=:,./-]/.test(v) ? `'${v.replaceAll("'", "'\\''")}'` : v);

  // A registration under ANOTHER name is left alone, but if it bakes in a different vault it would keep
  // capturing there while the MCP entry printed below reads from this one -- the mismatch this installer
  // exists to prevent. Refuse before changing anything (the rule included); its owner updates or removes it.
  if (foreign) {
    const theirs = vaultIn(foreignCmd);
    if (theirs !== undefined && theirs !== vault) {
      fail(
        `${settingsPath} already registers this hook as "${foreign[0]}" with vault ${theirs}, but you chose ${vault}. ` +
          `Update or remove that entry (or pass --vault ${theirs}), then re-run (nothing was changed).`
      );
    }
  }
  const ruleStatus = await installAntigravityRule();

  // Our own entry is refreshed in place when the vault or the script path changed, so re-running with a
  // different --vault actually moves capture, and re-running from a new install repairs a hook left at
  // the old path. A registration under another name is left alone.
  const oldScript = ownCmd ? parseAgy(ownCmd)?.script : undefined;
  let hookStatus;
  if (foreign && !namedIsOurs) {
    const theirScript = parseAgy(foreignCmd)?.script;
    hookStatus = `already registered under another name in ${settingsPath}; left unchanged (its vault is whatever it sets, NOT ${vault})`;
    if (theirScript !== undefined && theirScript !== hookPath) {
      hookStatus += `. It runs ${theirScript}, not this install's ${hookPath}; update "${foreign[0]}" if that path no longer exists`;
    }
  } else if (namedIsOurs && ours.length === 1 && ours[0].command === command && ours[0].type === "command" && ours[0].timeout === 30) {
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
    hookStatus = `${namedIsOurs ? "updated" : "registered"} the Stop hook in ${settingsPath}`;
    if (oldScript !== undefined && oldScript !== hookPath) hookStatus += ` (moved from ${oldScript} to ${hookPath})`;
  }
  if (vaultArg !== undefined && preserved !== undefined && preserved !== vault) {
    console.error(
      `[install-hook] note: capture moves from ${preserved} to ${vault}. Sessions captured so far stay in ${preserved}; ` +
        "they are not copied."
    );
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
    `[install-hook]     agy mcp add --env ${sq(`LIBRARIAN_VAULT_PATH=${vault}`)}${db ? ` --env ${sq(`LIBRARIAN_DB_PATH=${db}`)}` : ""} rutter ${sq(process.execPath)} ${sq(stdio)}`
  );
  console.error("[install-hook]   or put this in ~/.gemini/config/mcp_config.json (literal values; substitution there is undocumented):");
  console.error(
    JSON.stringify(
      { mcpServers: { rutter: { command: process.execPath, args: [stdio], env: { LIBRARIAN_VAULT_PATH: vault, ...(db ? { LIBRARIAN_DB_PATH: db } : {}) } } } },
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

// The vault a Claude Code or Codex hook writes to is not in its command: it inherits the environment
// the client is launched from. Say which vault that is here, so the server registration can match it.
const envVault = process.env.LIBRARIAN_VAULT_PATH?.trim();
const vaultNote = () =>
  console.error(
    `[install-hook] vault the hook will use: ${envVault ? `${envVault} (LIBRARIAN_VAULT_PATH in this shell)` : "~/Documents/knowledge-vault (the default)"}` +
      " -- whatever LIBRARIAN_VAULT_PATH is when the client starts. Register the MCP server with the same value."
  );

// The command we register carries the explicit client identity (`--client claude|codex`), which
// capture uses to label the records it writes. Compare parsed command strings, not serialized JSON:
// a path containing `"` or `\` is escaped in the serialized form and would never match, appending a
// duplicate. Any registration in a shape this installer writes counts as ours, at this path or an old
// one (a Node version switch moves a global install): the first is rewritten to this path, keeping
// its `--client`, and any others are removed so exactly one hook fires.
const known = [];
let custom = false;
for (const group of settings.hooks.Stop) {
  for (const h of Array.isArray(group?.hooks) ? group.hooks : []) {
    const parsed = parseOurs(h?.command);
    if (parsed) known.push({ group, hook: h, parsed });
    else if (typeof h?.command === "string" && (h.command.includes(hookPath) || h.command.includes(hookCommand))) custom = true;
  }
}
if (known.length === 0 && custom) {
  console.error(
    `[install-hook] already registered in ${settingsPath} with a custom command; left unchanged. Add \`--client ${client}\` to it ` +
      `if you want records labeled with the client.`
  );
  vaultNote();
  process.exit(0);
}
if (known.length > 0) {
  const [keep, ...extra] = known;
  const target = `${hookCommand} --client ${keep.parsed.client ?? client}`;
  if (extra.length === 0 && keep.hook.command === target) {
    console.error(`[install-hook] already registered in ${settingsPath}; nothing to do.`);
    vaultNote();
    process.exit(0);
  }
  keep.hook.command = target;
  for (const { group, hook } of extra) group.hooks = group.hooks.filter((h) => h !== hook);
  settings.hooks.Stop = settings.hooks.Stop.filter((group) => !Array.isArray(group?.hooks) || group.hooks.length > 0);
  const updatedTmp = `${settingsPath}.librarian-tmp`;
  fs.writeFileSync(updatedTmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  fs.renameSync(updatedTmp, settingsPath);
  console.error(`[install-hook] updated the Stop hook in ${settingsPath} to label records as "${keep.parsed.client ?? client}".`);
  if (keep.parsed.script !== hookPath) console.error(`[install-hook] moved it from ${keep.parsed.script} to ${hookPath}.`);
  if (extra.length > 0) {
    console.error(
      `[install-hook] removed ${extra.length} more registration(s) of this hook (${extra.map((e) => e.parsed.script).join(", ")}), so capture runs once.`
    );
  }
  vaultNote();
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

const entry = { type: "command", command: `${hookCommand} --client ${client}` };
if (client === "codex") {
  entry.timeout = 30;
  entry.statusMessage = "Librarian: capturing session memory";
}
settings.hooks.Stop.push({ hooks: [entry] });

const tmp = `${settingsPath}.librarian-tmp`;
fs.writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
fs.renameSync(tmp, settingsPath);

console.error(`[install-hook] registered the Stop hook in ${settingsPath}.`);
vaultNote();
if (client === "codex") {
  console.error("[install-hook] Codex hooks read LIBRARIAN_VAULT_PATH from the environment Codex is launched with, not from config.toml.");
  console.error("[install-hook] Codex does not run a new hook until you trust it: start Codex, run /hooks, review the");
  console.error("[install-hook] Librarian Stop hook and trust it (installing did NOT grant trust). Then check");
  console.error("[install-hook] <vault>/_librarian/sessions/ after your next turn. Directives must be in the final reply.");
} else {
  console.error("[install-hook] restart Claude Code, then check <vault>/_librarian/sessions/ after your next session.");
}
