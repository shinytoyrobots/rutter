---
type: plan
status: proposal
created: 2026-10-19
domain: ops
---

# Grok-native install for rutter

**Status:** proposal, not built. Step 0 (the probe) gates everything else.

**Why:** today's Grok path says "install the Claude Code plugin" (`docs/getting-started.md`
"Grok path", README "Grok"). Grok runs the plugin's server and hook through its Claude
compatibility layer, so a person with Grok and no Claude Code has no documented route.
Every other client installs from npm and writes only its own files. Robin flagged the gap
on 2026-10-19 and wants every client to have an install path that needs no other harness.

## What "supported without Claude Code" means

1. **Recall:** the four `librarian-*` tools work from a Grok session on a machine with no
   Claude Code installed.
2. **Capture:** after each turn, a `librarian-session` (or `librarian-position`) line the
   model wrote lands in the vault, labeled `client: grok`.
3. **Setup:** `rutter-memory install-hook --client grok` installs the capture hook and prints
   the `grok mcp add` line for the person to run (the installer never runs it), and
   getting-started's Grok path no longer mentions Claude Code.

Follows the rules in the "Host integration" section of `docs/memory-of-use.md`: fail-open
hook, user-level files only, edit only rutter's own marked entries, idempotent re-run,
MCP registration never required.

## What Grok's own docs say (read 2026-10-19, `~/.grok/docs/user-guide`)

Read from the installed docs, not yet confirmed by running anything. Every row gets checked in Step 0.

| Need | Grok |
|---|---|
| MCP registration | `grok mcp add <name> [-e KEY=VAL] -- <command…>`, or `[mcp_servers.<name>]` in `~/.grok/config.toml`. `--scope user` is the default. `getting-started.md` currently says there is no `grok mcp add`; the installed docs show one, so that sentence needs a check. |
| User-level hooks | `~/.grok/hooks/*.json`. Files are merged and always trusted. Format: `{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": "…" } ] } ] } }`, the same shape as Claude's. |
| Claude compatibility | `~/.claude/settings.json` hooks and `~/.claude.json` MCP servers are scanned by default (`[compat.claude]`). This is why the current path works, and why a native hook installed beside a Claude one would **double-fire**. |
| Plugins | The existing route loads rutter's own `hooks/hooks.json` through plugin discovery, a path separate from `[compat.claude]`. `getting-started.md` ("Pause capture") records that `GROK_CLAUDE_HOOKS_ENABLED=false` does not reach plugin hooks, so the compat switch says nothing about whether the plugin hook is live. `~/.grok/plugins/` is trusted automatically; a plugin folder can hold `hooks/hooks.json` and `.mcp.json`. `.claude-plugin/` manifests are accepted. |
| Stop payload | Already known from `docs/grok-stop-adapter.md`: snake_case `transcript_path` pointing at an unusable `updates.jsonl`, plus camelCase `lastAssistantMessage` (clipped at 32,768 characters). `capture-cli` already handles this. |

## The design question

Two routes; Step 0 decides.

- **A. Native files.** The installer writes `~/.grok/hooks/rutter.json` (hook) and prints the
  `grok mcp add` line for the server; it does not edit `~/.grok/config.toml`. Mirrors Codex's `install-hook --client codex`.
  Smallest change; needs the double-fire guard below.
- **B. Native plugin.** Ship a Grok-flavored plugin folder under `~/.grok/plugins/`. Heavier;
  only worth it if Grok has no way to set the vault path for a hook except through a plugin.

Default to A unless the probe says otherwise.

## Step 0 — Probe (gates everything else)

Run on a machine, or a fresh macOS user account, with **no Claude Code installed** and no
`~/.claude`. That is the point: every earlier probe ran where Claude Code was present.

- [ ] Does `grok mcp add rutter -e LIBRARIAN_VAULT_PATH=… -- npx -y rutter-memory` register a server that answers `librarian-recent`?
- [ ] Does a `~/.grok/hooks/rutter.json` Stop hook fire once per turn? Again at `/exit`?
- [ ] Is the Stop payload the same as `grok-stop-adapter.md` recorded: `lastAssistantMessage` present, `transcript_path` unusable?
- [ ] Does the hook's environment carry the launching shell's `PATH` (does bare `node` resolve) and `LIBRARIAN_VAULT_PATH`? Does Grok clear the environment, as Muse does?
- [ ] **Double-fire, plugin route.** With the Claude Code plugin installed as documented today (plugin `hooks/hooks.json`, not `settings.json`) *and* the native hook, does Grok run the hook twice per turn? Which of `grok inspect` or `/hooks` lists plugin hooks, so the installer can detect them?
- [ ] **Double-fire, settings route.** With a hook registered in `~/.claude/settings.json` (`install-hook` for Claude) *and* the native hook, does Grok run the hook twice per turn? Does it dedupe identical commands? If it fires twice, SR-013's no-duplicate behavior must absorb it, or the installer must detect rutter's Claude-side entries and skip.
- [ ] Does the server's `instructions` contract reach the model without a tool call, or does Grok need a rules file (`12-project-rules.md`, user scope) as Copilot and Antigravity do?
- [ ] Is the `grok` client label still inferred correctly when the hook comes from `~/.grok/hooks`, or should the installer pass `--client grok` explicitly, as the other installers do?
- [ ] Does the hook run in an untrusted project directory?

Write the results into this file as a probe table, as `copilot-cli-plan.md` does. Remove any throwaway hook after the read.

## Steps after the probe

1. **Installer.** Add `grok` to `hooks/install-hook.mjs` (`--client claude|codex|antigravity|copilot|muse|grok`). Writes only its own marked entries; idempotent; separates the installer's **own** registration from **competing** ones. Own: the marked entry in `~/.grok/hooks/rutter.json` (and any instructions file it generated). The installer updates that in place: it rewrites the hook command when the absolute `node` or the package path has moved (a Node version change, a relocated npm prefix), leaves the file untouched when the content is already current, and refreshes a stale generated instructions file the same way. Competing: a rutter hook reachable by any other route Grok loads, namely the plugin's `hooks/hooks.json` (installed under `~/.claude/plugins/` or `~/.grok/plugins/`), `~/.claude/settings.json` and `settings.local.json`, or a `~/.grok/hooks` file that is not the installer's own marked one. If a competing hook is found, the installer says which and exits 0 without **creating** a native entry; it still updates an existing owned entry, and warns that both now exist. Detection must not depend on `[compat.claude]`, since that switch does not control plugin hooks. If detection cannot be made reliable, the fallback is a prominent warning plus SR-013 absorbing the duplicate.
2. **Registration.** The installer prints the `grok mcp add` line, with the same baked-in vault as the hook, and does not run it, per the "Host integration" rule in `docs/memory-of-use.md`. Registration is never required for capture.
3. **Instructions file** only if the probe shows the contract does not arrive on its own.
4. **Tests** in `test/install-hook.test.ts`: fresh install, re-run, uninstall, no `~/.claude` present, the guard against each competing route separately (plugin `hooks.json`, `settings.json`, a foreign `~/.grok/hooks` file), and the owned-entry cases: re-run with unchanged content writes nothing (file mtime and bytes identical); re-run after the `node` or package path moved rewrites the command in place without adding a second entry; re-run with a stale generated instructions file refreshes it; re-run while a competing hook exists still updates the owned entry but creates none. Plus one coexistence run against a real plugin installation on Grok, not a fixture, confirming one firing per turn.
5. **Docs.** Rewrite "Grok path" in `getting-started.md` and the README Grok section so they stand alone and name the Claude Code route as an alternative, not a prerequisite. Fix the "no `grok mcp add`" sentence if the probe confirms the command. Update the overview table row ("The Claude Code plugin, plus one environment variable"). Port to the site (gh-pages) and rehash `sources.json`.
6. **Changelog** and a minor version bump.

## Gates

Build only if all hold; recall-only Grok support is the fallback.

1. A Stop hook in `~/.grok/hooks` fires once per turn on a machine with no Claude Code.
2. It receives the current turn's final message (`lastAssistantMessage`) there too.
3. The double-fire case is either harmless or detectable, for the plugin route and the settings route alike.

## Out of scope

- The Claude Code plugin path for Grok stays as it is for people who already use it.
- `chat_history.jsonl` capture (v2 in `grok-stop-adapter.md`).
- Claiming any other client works without Claude Code. That needs its own test on a clean machine; this plan covers Grok only, though the Step 0 machine could be reused for a quick recall check on the others.

## Exit

A person with Grok and no Claude Code follows getting-started's Grok path to a captured
record labeled `client: grok` and a working `librarian-recent`, and the test for it ran on
a machine that has never had Claude Code.
