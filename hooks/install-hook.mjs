#!/usr/bin/env node
/**
 * Register the librarian Stop hook in a client's hook configuration:
 *   node hooks/install-hook.mjs                  -> ~/.claude/settings.json (Claude Code, Grok)
 *   node hooks/install-hook.mjs --client codex   -> $CODEX_HOME or ~/.codex, hooks.json
 *   node hooks/install-hook.mjs --client antigravity -> ~/.gemini/config/hooks.json (agy)
 *   node hooks/install-hook.mjs --client copilot -> $COPILOT_HOME or ~/.copilot, hooks/rutter.json
 *   node hooks/install-hook.mjs --client muse    -> ~/.config/muse, settings.json + AGENTS.md (Muse Code)
 *   node hooks/install-hook.mjs --client grok    -> $GROK_HOME or ~/.grok, hooks/rutter.json (no Claude Code needed)
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
    fail(`unknown argument "${args[i]}" -- usage: install-hook [--client claude|codex|antigravity|copilot|muse|grok] [--vault <path>]`);
  }
}
if (vaultArg !== undefined && client !== "antigravity" && client !== "muse" && client !== "codex") {
  fail("--vault is only for --client antigravity, muse or codex (other clients read LIBRARIAN_VAULT_PATH from the environment they launch with).");
}
if (client !== "claude" && client !== "codex" && client !== "antigravity" && client !== "copilot" && client !== "muse" && client !== "grok") {
  fail(`unknown client "${client}" -- expected claude, codex, antigravity, copilot, muse, or grok.`);
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

/**
 * The Node path to print in an MCP registration. `process.execPath` is the resolved binary, which
 * on Homebrew is a versioned Cellar folder (`/opt/homebrew/Cellar/node/26.7.0/bin/node`) that the
 * next `brew upgrade` deletes, silently breaking recall. The first `node` on PATH (the stable
 * `/opt/homebrew/bin/node` link) is printed instead, but only when it is this same binary (a
 * different node on PATH could be too old for the server) and does not live somewhere that is
 * cleared on logout or reboot: fnm puts a per-shell link first on PATH, under its multishell
 * folder or XDG_RUNTIME_DIR, and printing that would break the registration the same way.
 */
function stableNode() {
  let self;
  try {
    self = fs.realpathSync(process.execPath);
  } catch {
    return process.execPath;
  }
  const real = (p) => {
    try {
      return fs.realpathSync(p);
    } catch {
      return undefined;
    }
  };
  const under = (p, roots) => roots.some((r) => p === r || p.startsWith(r.endsWith(path.sep) ? r : r + path.sep));
  // Each root as written and resolved (/tmp is /private/tmp on macOS). A "temporary" root that holds
  // your home or a system bin folder (TMPDIR=/ or /opt) isn't temporary, so it is ignored rather than
  // letting it rule out /opt/homebrew/bin.
  const lasting = [os.homedir(), "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin", "/bin"].flatMap((d) => [d, real(d) ?? d]);
  const transient = [process.env.FNM_MULTISHELL_PATH, process.env.XDG_RUNTIME_DIR, os.tmpdir()]
    .filter((d) => typeof d === "string" && d !== "" && path.isAbsolute(d))
    .map((d) => [path.resolve(d), real(d) ?? path.resolve(d)])
    .filter((forms) => !lasting.some((l) => under(l, forms)))
    .flat();
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir || !path.isAbsolute(dir)) continue;
    const candidate = path.join(dir, process.platform === "win32" ? "node.exe" : "node");
    try {
      // A shell skips a directory named node; so does this.
      if (!fs.statSync(candidate).isFile()) continue;
      fs.accessSync(candidate, fs.constants.X_OK);
    } catch {
      continue; // not here; keep looking
    }
    // The first executable `node` on PATH is what a shell would run; use it only if it is us and lasts.
    // The directory as written and resolved: a temp-folder link to a lasting folder still vanishes.
    const forms = [path.resolve(dir), real(dir) ?? path.resolve(dir)];
    if (real(candidate) !== self || forms.some((f) => under(f, transient) || /fnm_multishells/.test(f))) return process.execPath;
    return candidate;
  }
  return process.execPath;
}

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
if (client === "copilot") await installCopilot();
if (client === "muse") await installMuse();
if (client === "grok") await installGrok();

/**
 * Copilot CLI loads EVERY file in $COPILOT_HOME/hooks/ and combines them, so rutter owns one
 * file of its own and never parses or merges the user's others. A filename doesn't prove
 * ownership: an existing rutter.json is replaced only when it is exactly the shape written here
 * (version 1, one agentStop entry running this hook, at this path or an old one); anything else
 * is refused with nothing changed. The hook inherits the launching shell's environment (probed
 * 2026-10-15), so no vault is baked in; the MCP server gets only PATH, so its registration below
 * carries the vault explicitly.
 */
async function installCopilot() {
  const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
  const hooksFile = path.join(home, "hooks", "rutter.json");
  const command = `${hookCommand} --client copilot`;
  const body = `${JSON.stringify({ version: 1, hooks: { agentStop: [{ type: "command", bash: command, timeoutSec: 30 }] } }, null, 2)}\n`;

  const isOurs = (cfg) => {
    if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) return false;
    if (Object.keys(cfg).some((k) => k !== "version" && k !== "hooks") || cfg.version !== 1) return false;
    const hooks = cfg.hooks;
    if (hooks === null || typeof hooks !== "object" || Array.isArray(hooks) || Object.keys(hooks).join() !== "agentStop") return false;
    const list = hooks.agentStop;
    if (!Array.isArray(list) || list.length !== 1) return false;
    const [h] = list;
    if (h === null || typeof h !== "object" || Object.keys(h).some((k) => !["type", "bash", "timeoutSec"].includes(k))) return false;
    return h.type === "command" && parseOurs(h.bash)?.client === "copilot";
  };

  // Decide everything before writing anything, so a refusal leaves both files untouched.
  let hookStatus;
  let writeHook = true;
  if (fs.existsSync(hooksFile)) {
    const raw = fs.readFileSync(hooksFile, "utf8");
    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      fail(`${hooksFile} exists but is not valid JSON, so it may not be rutter's -- move it, then re-run (nothing was changed).`);
    }
    if (!isOurs(cfg)) {
      fail(`${hooksFile} exists and is not the hook file this installer writes (other hooks, events or fields) -- move it, then re-run (nothing was changed).`);
    }
    if (raw === body) {
      hookStatus = `already registered in ${hooksFile}; unchanged`;
      writeHook = false;
    } else {
      const old = parseOurs(cfg.hooks.agentStop[0].bash).script;
      hookStatus = `updated ${hooksFile}${old !== hookPath ? ` (moved from ${old} to ${hookPath})` : ""}`;
    }
  } else {
    hookStatus = `registered the agentStop hook in ${hooksFile}`;
  }
  const rule = await prepareCopilotInstructions(home);
  if (writeHook) {
    fs.mkdirSync(path.dirname(hooksFile), { recursive: true });
    const tmp = `${hooksFile}.librarian-tmp`;
    fs.writeFileSync(tmp, body, "utf8");
    fs.renameSync(tmp, hooksFile);
  }
  const ruleStatus = rule.write();

  const envVault = process.env.LIBRARIAN_VAULT_PATH?.trim();
  const vault = envVault || path.join(os.homedir(), "Documents", "knowledge-vault");
  const db = process.env.LIBRARIAN_DB_PATH?.trim() || undefined;
  const sq = (v) => (/[^A-Za-z0-9_@%+=:,./-]/.test(v) ? `'${v.replaceAll("'", "'\\''")}'` : v);
  const stdio = path.join(import.meta.dirname, "..", "dist", "stdio.js");
  console.error(`[install-hook] ${hookStatus}. Capture instructions: ${ruleStatus}.`);
  console.error(
    `[install-hook] VAULT the hook will use: ${envVault ? `${vault} (LIBRARIAN_VAULT_PATH in this shell)` : `${vault} (the default)`}` +
      " -- whatever LIBRARIAN_VAULT_PATH is when Copilot starts."
  );
  console.error("[install-hook] The MCP server gets only PATH from Copilot, so register it with the vault set explicitly:");
  console.error(
    `[install-hook]     copilot mcp add --env ${sq(`LIBRARIAN_VAULT_PATH=${vault}`)}${db ? ` --env ${sq(`LIBRARIAN_DB_PATH=${db}`)}` : ""} rutter -- ${sq(stableNode())} ${sq(stdio)}`
  );
  console.error("[install-hook] Then start a new Copilot session and check <vault>/_librarian/sessions/ after a turn.");
  console.error("[install-hook] The capture line is an HTML comment, so Copilot's screen hides it; the hook still reads it.");
  process.exit(0);
}

/**
 * Copilot loads MCP server instructions lazily, so the model may never see the capture contract.
 * A personal instructions file is in the system prompt every session, and with it the model wrote
 * the directive in an interactive probe. rutter owns its own file under instructions/ rather than
 * editing the user's copilot-instructions.md. Returns a deferred write, so the caller can refuse a
 * foreign hooks file before anything changes.
 */
async function prepareCopilotInstructions(home) {
  const rulePath = path.join(home, "instructions", "rutter.instructions.md");
  const marker = "<!-- rutter-capture-rule: generated by install-hook; edits are overwritten on re-run -->";
  // With the contract alone, Copilot's model wrote no line on an ordinary task (live check,
  // 2026-10-16). This lead says when the contract applies; the contract itself stays the
  // server's own text (SR-027).
  const lead =
    "This user keeps a record of what their AI sessions decide, through rutter's capture hook. " +
    "End every reply that settles a question, makes a decision, or finishes a change with the " +
    "session line described below. It applies whether or not you called a rutter tool, and even " +
    "though Copilot hides the line from the screen. Leave it out only for small talk or a reply " +
    "that settles nothing.";
  const body = `---\napplyTo: "**"\n---\n${marker}\n\n${lead}\n\n${await captureContract()}\n`;
  if (fs.existsSync(rulePath)) {
    const existing = fs.readFileSync(rulePath, "utf8");
    if (existing === body) return { write: () => `${rulePath} already up to date` };
    if (!existing.includes("rutter-capture-rule:")) {
      fail(`${rulePath} exists and was not written by this installer -- move it, then re-run (nothing was changed).`);
    }
  }
  return {
    write: () => {
      fs.mkdirSync(path.dirname(rulePath), { recursive: true });
      const tmp = `${rulePath}.librarian-tmp`;
      fs.writeFileSync(tmp, body, "utf8");
      fs.renameSync(tmp, rulePath);
      return `wrote ${rulePath}`;
    },
  };
}

/** The capture part of the server's own contract (SERVER_INSTRUCTIONS, the single source -- SR-027), never restated here. */
async function captureContract() {
  const { SERVER_INSTRUCTIONS } = await import(pathToFileURL(path.join(import.meta.dirname, "..", "dist", "server.js")).href);
  const from = SERVER_INSTRUCTIONS.indexOf("When a session decides");
  const to = SERVER_INSTRUCTIONS.indexOf("Everything these tools return");
  return from >= 0 ? SERVER_INSTRUCTIONS.slice(from, to > from ? to : undefined).trim() : SERVER_INSTRUCTIONS.trim();
}

/**
 * Grok (xAI's terminal agent), without Claude Code. Probed 2026-10-19 on Grok 1.0.62 in a clean
 * Linux Codespace: every *.json in $GROK_HOME/hooks is merged and trusted, in the Claude shape
 * ({ hooks: { Stop: [{ hooks: [{ type, command }] }] } }); the hook inherits the launching shell's
 * environment, so no vault is baked in; and the server's instructions reach the model on their own,
 * so there is no rules file. Grok fires Stop twice per run (end_turn, then a message-less shutdown);
 * capture ignores the second. rutter owns hooks/rutter.json and nothing else.
 *
 * Grok also loads rutter's hook by two other routes: the Claude Code plugin's hooks/hooks.json and
 * ~/.claude/settings.json. A second hook beside either one fires twice (the capture dedupes, so the
 * record is written once, but stacking registrations is still wrong). So when one of those routes
 * is found this installer creates nothing, says which, and still keeps an entry it already owns
 * current. [compat.claude] does not switch plugin hooks off, so it is not consulted.
 */
async function installGrok() {
  const home = process.env.GROK_HOME || path.join(os.homedir(), ".grok");
  const hooksDir = path.join(home, "hooks");
  const hooksFile = path.join(hooksDir, "rutter.json");
  const command = `${hookCommand} --client grok`;
  const body = `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command }] }] } }, null, 2)}\n`;

  // Exactly what this installer writes: an absolute script path, quoted only if it needs it, then the
  // literal client flag. parseOurs is looser (it also accepts `echo>/x/hooks/librarian-stop.sh`), which is
  // fine for finding stale registrations of the other clients but not for deciding to overwrite a user's command.
  const ownCommand = (command) => {
    const parsed = parseOurs(command);
    return parsed?.client === "grok" && path.isAbsolute(parsed.script) && command === `${/[^A-Za-z0-9_@%+=:,./-]/.test(parsed.script) ? `'${parsed.script.replaceAll("'", "'\\''")}'` : parsed.script} --client grok`;
  };
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const isOurs = (cfg) => {
    if (!isObj(cfg) || Object.keys(cfg).join() !== "hooks" || !isObj(cfg.hooks) || Object.keys(cfg.hooks).join() !== "Stop") return false;
    const groups = cfg.hooks.Stop;
    if (!Array.isArray(groups) || groups.length !== 1 || !isObj(groups[0]) || Object.keys(groups[0]).join() !== "hooks") return false;
    const list = groups[0].hooks;
    if (!Array.isArray(list) || list.length !== 1 || !isObj(list[0])) return false;
    const [h] = list;
    return Object.keys(h).sort().join() === "command,type" && h.type === "command" && ownCommand(h.command);
  };
  const readJson = (file) => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return undefined;
    }
  };
  // The command RUNS the script (after any VAR=value prefixes), not merely names it: `echo /x/hooks/librarian-stop.sh` does not.
  const invokesHook = (command) =>
    typeof command === "string" &&
    (/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:'[^']*'|"[^"]*"|[^\s'"])*\/hooks\/librarian-stop\.sh(?=["']?(?:\s|$))/.test(command) ||
      /^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:'[^']*\/hooks\/librarian-stop\.sh'|"[^"]*\/hooks\/librarian-stop\.sh")(?:\s|$)/.test(command));
  // Does this JSON file register rutter's script as a Stop command? Parsed, so escaped slashes decode and
  // a SessionStart hook or a mention in a description does not count. A file Grok could not parse is not
  // loaded by Grok either, so it is not a competitor.
  const runsHook = (file) => {
    const cfg = readJson(file);
    const groups = isObj(cfg) && isObj(cfg.hooks) && Array.isArray(cfg.hooks.Stop) ? cfg.hooks.Stop : [];
    return groups.some((g) => (Array.isArray(g?.hooks) ? g.hooks : []).some((h) => invokesHook(h?.command)));
  };
  // Grok reads ~/.claude/settings.json hooks only while [compat.claude] hooks is on (env beats config.toml).
  // Plugin hooks are not governed by it (checked on Grok 1.0.50), so the plugin routes below ignore it.
  const claudeSettingsOn = () => {
    const env = process.env.GROK_CLAUDE_HOOKS_ENABLED?.trim().toLowerCase();
    if (env) return !["false", "0", "no", "off"].includes(env);
    let toml;
    try {
      toml = fs.readFileSync(path.join(home, "config.toml"), "utf8");
    } catch {
      return true;
    }
    // Line by line, tracking the current table: `[compat.claude]` with a trailing comment or odd spacing,
    // a quoted key, a dotted key at the top, or an inline `claude = { hooks = false }` under [compat].
    const unq = (v) => v.trim().replace(/^(["'])(.*)\1$/, "$2");
    let table = "";
    for (const raw of toml.split(/\r?\n/)) {
      const line = raw.replace(/\s+#.*$/, "").trim();
      const header = line.match(/^\[([^\[\]]+)\]$/);
      if (header) {
        table = header[1].split(".").map(unq).join(".");
        continue;
      }
      const kv = line.match(/^((?:"[^"]*"|'[^']*'|[A-Za-z0-9_-]+)(?:\s*\.\s*(?:"[^"]*"|'[^']*'|[A-Za-z0-9_-]+))*)\s*=\s*(.*)$/);
      if (!kv) continue;
      const full = [table, ...kv[1].split(".").map(unq)].filter(Boolean).join(".");
      if (full === "compat.claude.hooks" && /^false\b/.test(kv[2])) return false;
      if (full === "compat.claude" && /\bhooks\s*=\s*false\b/.test(kv[2])) return false;
    }
    return true;
  };

  // Other routes by which Grok would run rutter's hook.
  const competing = [];
  const claudeDir = path.join(os.homedir(), ".claude");
  if (claudeSettingsOn()) {
    for (const name of ["settings.json", "settings.local.json"]) {
      const file = path.join(claudeDir, name);
      if (runsHook(file)) competing.push(`${file} (a rutter Stop hook)`);
    }
  }
  // The Claude Code plugin, as installed: its hooks/hooks.json under each recorded install path.
  const installed = readJson(path.join(claudeDir, "plugins", "installed_plugins.json"));
  for (const [id, entries] of Object.entries(isObj(installed) && isObj(installed.plugins) ? installed.plugins : {})) {
    for (const e of Array.isArray(entries) ? entries : []) {
      const file = typeof e?.installPath === "string" ? path.join(e.installPath, "hooks", "hooks.json") : "";
      if (file && runsHook(file)) competing.push(`${file} (the ${id} plugin)`);
    }
  }
  // A plugin folder placed directly under Grok's own plugins directory.
  try {
    for (const d of fs.readdirSync(path.join(home, "plugins"), { withFileTypes: true })) {
      const file = path.join(home, "plugins", d.name, "hooks", "hooks.json");
      if ((d.isDirectory() || d.isSymbolicLink()) && runsHook(file)) competing.push(`${file} (a Grok plugin)`);
    }
  } catch {
    // no plugins directory
  }
  // Another file in the hooks folder that runs the hook.
  try {
    for (const name of fs.readdirSync(hooksDir)) {
      const file = path.join(hooksDir, name);
      if (name !== "rutter.json" && name.endsWith(".json") && runsHook(file)) competing.push(`${file} (a hook file rutter did not write)`);
    }
  } catch {
    // no hooks directory
  }

  // Decide everything before writing anything, so a refusal leaves the file untouched.
  let status;
  let write = true;
  let entry;
  try {
    entry = fs.lstatSync(hooksFile);
  } catch {
    // absent
  }
  if (entry?.isSymbolicLink() || (entry && !entry.isFile())) {
    fail(`${hooksFile} is a symlink or not a regular file, so this installer will not replace it -- move it, then re-run (nothing was changed).`);
  }
  if (entry) {
    const raw = fs.readFileSync(hooksFile, "utf8");
    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      fail(`${hooksFile} exists but is not valid JSON, so it may not be rutter's -- move it, then re-run (nothing was changed).`);
    }
    if (!isOurs(cfg)) {
      fail(`${hooksFile} exists and is not the hook file this installer writes (other hooks, events or fields) -- move it, then re-run (nothing was changed).`);
    }
    if (raw === body) {
      status = `already registered in ${hooksFile}; unchanged`;
      write = false;
    } else {
      const old = parseOurs(cfg.hooks.Stop[0].hooks[0].command).script;
      status = `updated ${hooksFile}${old !== hookPath ? ` (moved from ${old} to ${hookPath})` : ""}`;
    }
  } else if (competing.length > 0) {
    status = `nothing written: Grok already runs rutter's hook by another route`;
    write = false;
  } else {
    status = `registered the Stop hook in ${hooksFile}`;
  }
  if (write) {
    fs.mkdirSync(hooksDir, { recursive: true });
    // A unique, exclusively created temp file: a fixed name could be a symlink that writeFileSync would follow.
    const tmp = `${hooksFile}.${process.pid}.${Date.now()}.librarian-tmp`;
    try {
      fs.writeFileSync(tmp, body, { encoding: "utf8", flag: "wx" });
      fs.renameSync(tmp, hooksFile);
    } catch (err) {
      if (err?.code !== "EEXIST") fs.rmSync(tmp, { force: true }); // never delete an entry this run did not create
      throw err;
    }
  }

  const envVault = process.env.LIBRARIAN_VAULT_PATH?.trim();
  const vault = envVault || path.join(os.homedir(), "Documents", "knowledge-vault");
  const db = process.env.LIBRARIAN_DB_PATH?.trim() || undefined;
  const sq = (v) => (/[^A-Za-z0-9_@%+=:,./-]/.test(v) ? `'${v.replaceAll("'", "'\\''")}'` : v);
  const stdio = path.join(import.meta.dirname, "..", "dist", "stdio.js");
  console.error(`[install-hook] ${status}.`);
  if (competing.length > 0) {
    console.error("[install-hook] Grok appears to already load rutter's hook from:");
    for (const c of competing) console.error(`[install-hook]     ${c}`);
    console.error(
      entry && !write
        ? "[install-hook] rutter's own hooks/rutter.json is also present, so the hook now runs twice per turn; the capture writes one record either way. Remove one registration to stop the double run."
        : entry
          ? "[install-hook] rutter's own hooks/rutter.json was kept current, but the hook now runs twice per turn; the capture writes one record either way. Remove one registration to stop the double run."
          : "[install-hook] That is enough for capture; a second, native hook would only run it twice. To go without Claude Code, remove those and re-run this. (If you have disabled that plugin inside Grok, nothing runs it: remove it and re-run.)"
    );
  }
  console.error(
    `[install-hook] VAULT the hook will use: ${envVault ? `${vault} (LIBRARIAN_VAULT_PATH in this shell)` : `${vault} (the default)`}` +
      " -- whatever LIBRARIAN_VAULT_PATH is when Grok starts."
  );
  console.error("[install-hook] Register the MCP server yourself (this installer does not run it), with the same vault:");
  console.error(
    `[install-hook]     grok mcp add rutter -e ${sq(`LIBRARIAN_VAULT_PATH=${vault}`)}${db ? ` -e ${sq(`LIBRARIAN_DB_PATH=${db}`)}` : ""} -- ${sq(stableNode())} ${sq(stdio)}`
  );
  console.error("[install-hook] Then start a new Grok session and check <vault>/_librarian/sessions/ after a turn.");
  process.exit(0);
}

/**
 * Muse Code (Meta's terminal agent, `muse`). Probed 2026-10-18 against 1.4.10: user hooks live in
 * `hooks` in ~/.config/muse/settings.json in the Claude shape ({ Stop: [{ hooks: [{ type, command }] }] }),
 * `Stop` fires after every turn and carries `last_assistant_message`, and a hook that fails or exits
 * non-zero is ignored -- but a hook that HANGS holds the turn, which the wrapper bounds.
 *
 * Muse runs hooks with a cleared environment (no shell PATH, no LIBRARIAN_*), so the command bakes
 * in an absolute node and the vault. settings.json is the user's own file, shared with Muse's other
 * settings and rewritten by Muse itself, so this parses it, changes only the rutter hook and the
 * `rutter` MCP entry, and refuses anything it cannot parse. The server's instructions alone did not
 * make Muse's model write a session line; a user-level rules file did, so a marked block goes in
 * ~/.config/muse/AGENTS.md and nothing is written into any project.
 */
async function installMuse() {
  const museHome = path.join(os.homedir(), ".config", "muse");
  const cfgPath = path.join(museHome, "settings.json");
  const rulesPath = path.join(museHome, "AGENTS.md");
  const BEGIN = "<!-- BEGIN rutter-capture-rule: generated by install-hook; edits inside this block are overwritten on re-run -->";
  const END = "<!-- END rutter-capture-rule -->";
  const sq = (v) => (/[^A-Za-z0-9_@%+=:,./-]/.test(v) ? `'${v.replaceAll("'", "'\\''")}'` : v);
  const expandHome = (v) => (v === "~" ? os.homedir() : v.startsWith("~/") ? path.join(os.homedir(), v.slice(2)) : v);
  const mentionsScript = (c) => typeof c === "string" && c.includes("/hooks/librarian-stop.sh");
  // Exactly the command this installer writes, and nothing else, counts as ours. A user's own command
  // that merely runs the script (`... && my-audit`) is custom and is never rewritten or removed.
  // Bare tokens are limited to the generator's own safe alphabet, and the parsed pieces must regenerate the
  // command byte for byte, so shell syntax the generator never emits (`;`, `&&`, `|`) cannot be mistaken for it.
  const TOKEN = String.raw`('(?:[^']|'\\'')*'|[A-Za-z0-9_@%+=:,./-]+)`;
  const OURS = new RegExp(String.raw`^LIBRARIAN_NODE=${TOKEN} LIBRARIAN_VAULT_PATH="\$\{LIBRARIAN_VAULT_PATH:-([^}"$\`\\\n]*)\}" ${TOKEN} --client muse$`);
  const parseOursCmd = (c) => {
    const m = typeof c === "string" ? c.match(OURS) : null;
    if (!m) return null;
    const [, nodeTok, vaultDefault, scriptTok] = m;
    const script = unquote(scriptTok);
    if (!script.endsWith("/hooks/librarian-stop.sh")) return null;
    const regenerated = `LIBRARIAN_NODE=${sq(unquote(nodeTok))} LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${vaultDefault}}" ${sq(script)} --client muse`;
    return regenerated === c ? { vault: path.resolve(expandHome(vaultDefault.trim())), script } : null;
  };

  // A symlinked file would be silently replaced by a regular one on rename, cutting it off from wherever it
  // is managed (dotfiles). Refuse rather than guess a policy.
  for (const f of [cfgPath, rulesPath]) {
    let st;
    try {
      st = fs.lstatSync(f);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) fail(`${f} is a symlink -- edit the real file by hand, or replace the link with a regular file, then re-run (nothing was changed).`);
    if (!st.isFile()) fail(`${f} is not a regular file (nothing was changed).`);
  }
  const readIf = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined);

  // ---- read and validate everything before writing anything ----
  const cfgRaw = readIf(cfgPath);
  const rulesRaw = readIf(rulesPath);
  let cfg = {};
  if (cfgRaw !== undefined) {
    try {
      cfg = cfgRaw.trim() === "" ? {} : JSON.parse(cfgRaw);
    } catch {
      fail(`${cfgPath} is not valid JSON -- fix or move it, then re-run (nothing was changed). A broken settings.json can stop Muse from starting.`);
    }
    if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
      fail(`${cfgPath} is not a JSON object -- fix it, then re-run (nothing was changed).`);
    }
  }
  // Muse's validation requires this on the user file; a fresh file would otherwise fail it.
  if (Object.keys(cfg).length === 0) cfg = { schema_version: 1 };
  if (cfg.hooks !== undefined && (cfg.hooks === null || typeof cfg.hooks !== "object" || Array.isArray(cfg.hooks))) {
    fail(`${cfgPath} has a non-object "hooks" -- fix it, then re-run (nothing was changed).`);
  }
  if (cfg.hooks?.Stop !== undefined && !Array.isArray(cfg.hooks.Stop)) {
    fail(`${cfgPath} has a non-array hooks.Stop -- fix it, then re-run (nothing was changed).`);
  }
  if ("mcp_servers" in cfg && "mcpServers" in cfg) {
    fail(`${cfgPath} has both "mcp_servers" and "mcpServers" -- keep one, then re-run (nothing was changed).`);
  }
  const mcpKey = "mcpServers" in cfg ? "mcpServers" : "mcp_servers";
  if (cfg[mcpKey] !== undefined && (cfg[mcpKey] === null || typeof cfg[mcpKey] !== "object" || Array.isArray(cfg[mcpKey]))) {
    fail(`${cfgPath} has a non-object "${mcpKey}" -- fix it, then re-run (nothing was changed).`);
  }

  const stop = Array.isArray(cfg.hooks?.Stop) ? cfg.hooks.Stop : [];
  const known = [];
  const custom = [];
  for (const group of stop) {
    for (const h of Array.isArray(group?.hooks) ? group.hooks : []) {
      const parsed = parseOursCmd(h?.command);
      if (parsed) known.push({ group, hook: h, parsed });
      else if (mentionsScript(h?.command)) custom.push(h.command);
    }
  }

  // ONE vault for the hook and the server, decided here: the hook cannot inherit a shell's.
  const preserved = known.length > 0 ? known[0].parsed.vault : undefined;
  const vaultSource =
    vaultArg !== undefined ? "--vault" : preserved !== undefined ? "the existing hook" : process.env.LIBRARIAN_VAULT_PATH ? "LIBRARIAN_VAULT_PATH in this shell" : "default";
  const vaultRaw =
    vaultArg !== undefined ? vaultArg : preserved ?? (process.env.LIBRARIAN_VAULT_PATH || path.join(os.homedir(), "Documents", "knowledge-vault"));
  if (vaultRaw.trim() === "") fail("--vault needs a path.");
  const vault = path.resolve(expandHome(vaultRaw.trim()));
  // Embedded in a double-quoted shell default; refuse characters that would change its meaning.
  if (/["$`\\\n\r}]/.test(vault)) fail(`vault path ${JSON.stringify(vault)} contains a quote, $, backtick, backslash, brace or newline; pass a plainer path.`);
  const db = process.env.LIBRARIAN_DB_PATH?.trim() || undefined;
  const node = stableNode();
  if (/[\n\r]/.test(node)) fail("the node path contains a newline.");
  const command = `LIBRARIAN_NODE=${sq(node)} LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${vault}}" ${hookCommand} --client muse`;

  // The server entry is ours only if it runs THIS package's stdio.js, identified by the package it
  // belongs to, not by a filename another product could share.
  const stdio = path.join(import.meta.dirname, "..", "dist", "stdio.js");
  // Judged by the entrypoint it runs, resolved through any symlinks; a registration whose install has since
  // vanished (a Node switch moved a global install) is still ours if it names rutter-memory's own layout.
  const isRutterStdio = (a) => {
    if (typeof a !== "string" || !path.isAbsolute(a) || !/[\\/]dist[\\/]stdio\.js$/.test(a)) return false;
    let real;
    try {
      real = fs.realpathSync(a);
    } catch {
      return /[\\/]rutter-memory[\\/]dist[\\/]stdio\.js$/.test(a);
    }
    try {
      return JSON.parse(fs.readFileSync(path.join(path.dirname(real), "..", "package.json"), "utf8")).name === "rutter-memory";
    } catch {
      return false;
    }
  };
  const existingMcp = cfg[mcpKey]?.rutter;
  if (existingMcp !== undefined) {
    const ok =
      existingMcp !== null &&
      typeof existingMcp === "object" &&
      !Array.isArray(existingMcp) &&
      typeof existingMcp.command === "string" &&
      /^node(\.exe)?$/.test(path.basename(existingMcp.command)) &&
      Array.isArray(existingMcp.args) &&
      existingMcp.args.length === 1 &&
      isRutterStdio(existingMcp.args[0]);
    if (!ok) fail(`${cfgPath} already has a "${mcpKey}.rutter" entry that is not this server (it must be node running rutter-memory's own dist/stdio.js) -- rename or remove it, then re-run (nothing was changed).`);
  }
  const mcpEntry = {
    ...(existingMcp ?? {}),
    transport: "stdio",
    command: node,
    args: [stdio],
    env: { ...(existingMcp?.env ?? {}), LIBRARIAN_VAULT_PATH: vault, ...(db ? { LIBRARIAN_DB_PATH: db } : {}) },
    // `required` (Muse's default) aborts the whole run when the server fails to start.
    mode: "optional",
  };

  const lead =
    "This user keeps a record of what their AI sessions decide, through rutter's capture hook. " +
    "End every reply that settles a question, makes a decision, or finishes a change with the " +
    "session line described below. It applies whether or not you called a rutter tool. Leave it " +
    "out only for small talk or a reply that settles nothing.";
  const block = `${BEGIN}\n${lead}\n\n${await captureContract()}\n${END}`;
  let rulesBody;
  let rulesStatus;
  if (rulesRaw !== undefined) {
    // Markers count only on a line of their own and outside a code fence; the same words anywhere else
    // (prose, an example, a fenced sample) make the file ambiguous, so it is refused, not edited.
    const lines = rulesRaw.split("\n");
    // A fence opens with 3+ backticks or tildes (up to 3 spaces of indent) and closes only with the same
    // character, at least as many, and nothing after them but whitespace.
    let fence = null;
    let markerInFence = false;
    const begins = [];
    const ends = [];
    lines.forEach((line, i) => {
      const bareLine = line.replace(/\r$/, "");
      if (fence !== null) {
        const close = bareLine.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
        if (close && close[1][0] === fence.ch && close[1].length >= fence.len) {
          fence = null;
          return;
        }
      } else {
        const open = bareLine.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
        if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
          fence = { ch: open[1][0], len: open[1].length };
          return;
        }
      }
      const bare = line.replace(/\r$/, "").trim();
      if (bare !== BEGIN && bare !== END) return;
      if (fence !== null) markerInFence = true;
      else (bare === BEGIN ? begins : ends).push(i);
    });
    const stems = (rulesRaw.match(/(BEGIN|END) rutter-capture-rule/g) ?? []).length;
    if (stems === 0 && fence !== null) {
      fail(`${rulesPath} ends inside an unclosed code fence, so a block added at the end would land inside it -- close the fence, then re-run (nothing was changed).`);
    }
    if (stems === 0) {
      // Append only: every existing byte stays as it is.
      rulesBody = rulesRaw === "" ? `${block}\n` : `${rulesRaw}${rulesRaw.endsWith("\n") ? "\n" : "\n\n"}${block}\n`;
      rulesStatus = `added the rutter block to your existing ${rulesPath}`;
    } else if (!markerInFence && begins.length === 1 && ends.length === 1 && stems === 2 && begins[0] < ends[0]) {
      rulesBody = [...lines.slice(0, begins[0]), block, ...lines.slice(ends[0] + 1)].join("\n");
      rulesStatus = rulesBody === rulesRaw ? `${rulesPath} already up to date` : `updated the rutter block in ${rulesPath}`;
    } else {
      fail(
        `${rulesPath} mentions the rutter block's markers somewhere other than one well-formed block on lines of their own ` +
          "(unmatched, repeated, edited, or inside a code fence) -- fix or remove them, then re-run (nothing was changed)."
      );
    }
  } else {
    rulesBody = `${block}\n`;
    rulesStatus = `wrote ${rulesPath}`;
  }

  // ---- build the new settings ----
  cfg.hooks ??= {};
  cfg.hooks.Stop ??= [];
  let hookStatus;
  if (known.length > 0) {
    const [keep, ...extra] = known;
    keep.hook.type = "command";
    keep.hook.command = command;
    for (const { group, hook } of extra) group.hooks = group.hooks.filter((h) => h !== hook);
    cfg.hooks.Stop = cfg.hooks.Stop.filter((g) => !Array.isArray(g?.hooks) || g.hooks.length > 0);
    hookStatus = `updated the Stop hook in ${cfgPath}${extra.length > 0 ? ` (removed ${extra.length} duplicate registration(s))` : ""}`;
  } else if (custom.length > 0) {
    // The user already runs this script their own way; adding ours would fire it twice.
    hookStatus = `left your own Stop hook that runs this script unchanged in ${cfgPath} (its vault is whatever it sets, NOT necessarily ${vault})`;
  } else {
    cfg.hooks.Stop.push({ hooks: [{ type: "command", command }] });
    hookStatus = `registered the Stop hook in ${cfgPath}`;
  }
  cfg[mcpKey] ??= {};
  cfg[mcpKey].rutter = mcpEntry;
  const cfgNext = `${JSON.stringify(cfg, null, 2)}\n`;
  const cfgChanged = cfgNext !== cfgRaw;
  const rulesChanged = rulesBody !== rulesRaw;
  if (!cfgChanged) hookStatus = `already registered in ${cfgPath}; unchanged`;

  // ---- stage both files, then commit ----
  // Unique, exclusively-created temp files (a predictable name could be a planted symlink, or shared
  // with a second installer), both staged before either destination is replaced, and each original
  // re-read just before its rename: a settings.json Muse saved in the meantime is never overwritten
  // with a stale copy. A narrow window remains between that check and the rename.
  const staged = [];
  const uniq = (dest, kind) => `${dest}.librarian-${kind}-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
  const writeNew = (file, body, mode) => {
    const fd = fs.openSync(file, "wx", mode);
    try {
      fs.fchmodSync(fd, mode); // the umask would otherwise narrow an existing file's permissions
      fs.writeFileSync(fd, body, "utf8");
    } finally {
      fs.closeSync(fd);
    }
  };
  const stage = (dest, body, original) => {
    const mode = fs.existsSync(dest) ? fs.statSync(dest).mode & 0o777 : dest === cfgPath ? 0o600 : 0o644;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const entry = { dest, tmp: uniq(dest, "tmp"), undo: original === undefined ? undefined : uniq(dest, "undo"), original, body };
    staged.push(entry);
    writeNew(entry.tmp, body, mode);
    // The way back is prepared now, as a file that can be renamed into place atomically.
    if (entry.undo) writeNew(entry.undo, original, mode);
  };
  const cleanup = () => staged.forEach(({ tmp, undo }) => (fs.rmSync(tmp, { force: true }), undo && fs.rmSync(undo, { force: true })));
  try {
    if (cfgChanged) stage(cfgPath, cfgNext, cfgRaw);
    if (rulesChanged) stage(rulesPath, rulesBody, rulesRaw);
  } catch (err) {
    cleanup();
    fail(`could not stage the new files (${err.code ?? err.message}); nothing was changed.`);
  }
  const done = [];
  const rollback = () => {
    const stuck = [];
    for (const s of done.reverse()) {
      try {
        if (readIf(s.dest) !== s.body) continue; // someone else has written since; leave their file alone
        if (s.undo) fs.renameSync(s.undo, s.dest);
        else fs.rmSync(s.dest, { force: true });
      } catch {
        stuck.push(s);
      }
    }
    return stuck;
  };
  try {
    for (const s of staged) {
      // Checked file by file, immediately before each rename: the original must be unchanged and still a regular file.
      if (readIf(s.dest) !== s.original || (fs.existsSync(s.dest) && !fs.lstatSync(s.dest).isFile())) {
        const e = new Error(`${s.dest} changed while the installer was running (Muse or another editor saved it)`);
        e.code = "ECHANGED";
        throw e;
      }
      fs.renameSync(s.tmp, s.dest);
      done.push(s);
    }
  } catch (err) {
    const stuck = rollback();
    const pending = staged.filter((s) => !done.includes(s));
    pending.forEach(({ tmp }) => fs.rmSync(tmp, { force: true }));
    staged.filter((s) => !stuck.includes(s)).forEach(({ undo }) => undo && fs.rmSync(undo, { force: true }));
    if (stuck.length > 0) {
      fail(
        `could not finish (${err.code ?? err.message}) and could NOT roll back ${stuck.map((s) => s.dest).join(", ")}. ` +
          `Your original is saved at ${stuck.map((s) => s.undo ?? "(it did not exist)").join(", ")}; copy it back over the file.`
      );
    }
    fail(err.code === "ECHANGED" ? `${err.message} -- re-run; nothing was changed.` : `could not write ${err.path ?? "the files"} (${err.code ?? err.message}); any earlier change was rolled back.`);
  }
  staged.forEach(({ undo }) => undo && fs.rmSync(undo, { force: true }));

  console.error(`[install-hook] ${hookStatus}. Server entry: ${mcpKey}.rutter (mode optional). Capture rule: ${rulesStatus}.`);
  console.error(`[install-hook] VAULT for capture AND reads: ${vault}  (from ${vaultSource})`);
  if (vaultSource === "default") console.error("[install-hook]   that is the default vault. To use another, re-run with --vault <path>.");
  console.error("[install-hook] Muse runs hooks with a cleared environment, so this vault is baked into the hook; start a new Muse session to pick it up.");
  if (custom.length > 0 && known.length > 0) {
    console.error(`[install-hook] note: another Stop hook already runs this script by a custom command (${custom.length}); it will fire too (capture dedupes).`);
  }
  console.error("[install-hook] The `muse` command may collide with another tool on PATH (cmux ships one): run Meta's by full path, ~/.local/bin/muse.");
  console.error(`[install-hook] Then check ${vault}/_librarian/sessions/ after a turn. The session line must be in the final reply.`);
  process.exit(0);
}

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
    `[install-hook]     agy mcp add --env ${sq(`LIBRARIAN_VAULT_PATH=${vault}`)}${db ? ` --env ${sq(`LIBRARIAN_DB_PATH=${db}`)}` : ""} rutter ${sq(stableNode())} ${sq(stdio)}`
  );
  console.error("[install-hook]   or put this in ~/.gemini/config/mcp_config.json (literal values; substitution there is undocumented):");
  console.error(
    JSON.stringify(
      { mcpServers: { rutter: { command: stableNode(), args: [stdio], env: { LIBRARIAN_VAULT_PATH: vault, ...(db ? { LIBRARIAN_DB_PATH: db } : {}) } } } },
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
  const body = `---\ntrigger: always_on\n---\n${marker}\n\n${await captureContract()}\n`;
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

// The vault a Claude Code hook writes to is not in its command: it inherits the environment the client
// is launched from. Say which vault that is here, so the server registration can match it. A Codex hook
// gets its vault baked in (below), because Codex's MCP server takes its vault from config.toml while its
// hooks do not, so the two silently disagreed (probed 2026-10-19: captures landed in the default vault).
const envVault = process.env.LIBRARIAN_VAULT_PATH?.trim();
const expandHome = (v) => (v === "~" ? os.homedir() : v.startsWith("~/") ? path.join(os.homedir(), v.slice(2)) : v);
/** The vault Codex's MCP server is configured with ([mcp_servers.rutter.env] in config.toml), if any. */
function codexMcpVault() {
  try {
    const toml = fs.readFileSync(path.join(codexHome, "config.toml"), "utf8");
    const section = toml.match(/^\[mcp_servers\.rutter\.env\][^\n]*\n((?:(?!\[).*\n?)*)/m);
    return section?.[1].match(/^\s*LIBRARIAN_VAULT_PATH\s*=\s*"([^"\n]*)"/m)?.[1].trim() || undefined;
  } catch {
    return undefined;
  }
}
/**
 * Codex only: the one vault the hook writes to. Order: --vault, the vault the existing hook already
 * sets (so a re-run does not quietly move it), this shell's LIBRARIAN_VAULT_PATH, then the vault the
 * MCP server is configured with. Undefined leaves the command bare, as before.
 */
let codexVaultSource = "";
function codexVault(preserved) {
  if (client !== "codex") return undefined;
  const picks = [
    [vaultArg, "--vault"],
    [preserved, "the existing hook"],
    [envVault, "LIBRARIAN_VAULT_PATH in this shell"],
    [codexMcpVault(), "the MCP server's config.toml entry"],
  ];
  const [raw, source] = picks.find(([v]) => v !== undefined && (v !== "" || v === vaultArg)) ?? [];
  if (raw === undefined) return undefined;
  if (raw.trim() === "") fail("--vault needs a path.");
  const vault = path.resolve(expandHome(raw.trim()));
  if (/["$`\\\n\r]/.test(vault)) fail(`vault path ${JSON.stringify(vault)} contains a quote, $, backtick, backslash or newline; pass a plainer path.`);
  codexVaultSource = source;
  return vault;
}
const commandFor = (name, vault) => (vault ? `LIBRARIAN_VAULT_PATH="\${LIBRARIAN_VAULT_PATH:-${vault}}" ${hookCommand} --client ${name}` : `${hookCommand} --client ${name}`);
const vaultNote = (vault) =>
  console.error(
    vault
      ? `[install-hook] vault the hook will use: ${vault} (from ${codexVaultSource}); LIBRARIAN_VAULT_PATH exported when Codex starts still overrides it.`
      : `[install-hook] vault the hook will use: ${envVault ? `${envVault} (LIBRARIAN_VAULT_PATH in this shell)` : "~/Documents/knowledge-vault (the default)"}` +
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
    const parsed = (client === "codex" ? parseAgy : parseOurs)(h?.command);
    if (parsed) known.push({ group, hook: h, parsed });
    else if (typeof h?.command === "string" && (h.command.includes(hookPath) || h.command.includes(hookCommand))) custom = true;
  }
}
if (known.length === 0 && custom) {
  console.error(
    `[install-hook] already registered in ${settingsPath} with a custom command; left unchanged. Add \`--client ${client}\` to it ` +
      `if you want records labeled with the client.`
  );
  vaultNote(codexVault(undefined));
  process.exit(0);
}
if (known.length > 0) {
  const [keep, ...extra] = known;
  const vault = codexVault(keep.parsed.vault);
  const target = commandFor(keep.parsed.client ?? client, vault);
  if (extra.length === 0 && keep.hook.command === target) {
    console.error(`[install-hook] already registered in ${settingsPath}; nothing to do.`);
    vaultNote(vault);
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
  vaultNote(vault);
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

const newVault = codexVault(undefined);
const entry = { type: "command", command: commandFor(client, newVault) };
if (client === "codex") {
  entry.timeout = 30;
  entry.statusMessage = "Librarian: capturing session memory";
}
settings.hooks.Stop.push({ hooks: [entry] });

const tmp = `${settingsPath}.librarian-tmp`;
fs.writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
fs.renameSync(tmp, settingsPath);

console.error(`[install-hook] registered the Stop hook in ${settingsPath}.`);
vaultNote(newVault);
if (client === "codex") {
  if (!newVault) console.error("[install-hook] Codex hooks read LIBRARIAN_VAULT_PATH from the environment Codex is launched with, not from config.toml; pass --vault to fix one.");
  console.error("[install-hook] Codex does not run a new hook until you trust it: start Codex, run /hooks, review the");
  console.error("[install-hook] Librarian Stop hook and trust it (installing did NOT grant trust). Then check");
  console.error("[install-hook] <vault>/_librarian/sessions/ after your next turn. Directives must be in the final reply.");
} else {
  console.error("[install-hook] restart Claude Code, then check <vault>/_librarian/sessions/ after your next session.");
}
