# rutter on npm

Companion plan: [MCP Registry listing](mcp-registry-plan.md). That plan starts only after this one has shipped.

## Context

Outside Claude Code, setting up rutter means `git clone`, `npm install` and `npm run build`. That stops casual trials, and it keeps rutter out of the directories where people look for MCP servers, which only list published packages.

The unscoped name `rutter` on npm belongs to an unrelated router library. **`rutter-memory` is free** (checked 2026-10-15). The brand stays rutter, and only the package name changes.

Outcome: `npx -y rutter-memory` runs the server, and `npm install -g rutter-memory` gives a stable hook path for capture.

## What has to change, and why

**1. The default database location breaks outside a clone, and must be per vault.** `src/config.ts:57` defaults `LIBRARIAN_DB_PATH` to `<package root>/data/librarian.db`. Run from npm, that folder is inside `node_modules` or the npx cache. The npx cache can be wiped at any time, and a global install path may not be writable.

A single shared location would be wrong too. Every npm install on a machine would share one database even when each client sets a different `LIBRARIAN_VAULT_PATH`. The start-up check in `src/startup-index.ts` compares note counts and modified times, not which vault built the index. So a server could reuse another vault's index, or rebuild over an index another client is using.

The fix, in two parts:
- **Per-vault default path.** When the package root sits inside a `node_modules` directory, default to `$XDG_DATA_HOME/rutter/<vault-id>/librarian.db`, falling back to `~/.local/share/rutter/<vault-id>/librarian.db`. Here `<vault-id>` is the first 16 hex characters of the sha256 of the vault's resolved real path. A clone keeps `data/`, so existing setups don't move.
- **Vault identity in the index, enforced by refusal.** `reindex` writes the resolved vault path to `index_meta`. When the server or `reindex` opens a database recorded for a *different* vault, it refuses. It neither rebuilds nor reads the database, and says on stderr which vault owns it and how to fix it: use the default path, or a separate `LIBRARIAN_DB_PATH`. Every tool call then returns that same message.

  Rebuilding on a mismatch would be unsafe. Suppose client A is running on vault A, and client B starts against the same explicit `LIBRARIAN_DB_PATH` with vault B. If B rebuilt the database, A would silently start reading B's notes, because A only checks ownership at start-up. Refusing keeps the first owner's index intact.

  A database with no recorded vault, built before this change, may hold another vault's index. The count and timestamp checks can't tell, because a different vault with the same number of notes, all older than the last index, looks current. So claiming always means a full rebuild: the first server to open such a database rebuilds it from its own vault, and records ownership only after the rebuild succeeds. Until then it serves no indexed results. `reindex --force` reassigns a database the same way: rebuild first, then record the new owner. With the per-vault default path, a mismatch only happens when someone points two vaults at one explicit path.

  *As built (after two adversarial reviews):* every rebuild, including a routine one of the vault's own index, first marks the database as being rebuilt for that vault, before any table changes. Every server refuses a database in that state, so none reads a half-built index or one that is changing hands. If the rebuild fails, the mark stays: other vaults keep refusing, and this vault retries on its next start. A server reads only a database its own vault owns. The ownership decision and the rebuild run under a lock row in the database, so two servers cannot both claim one. Each tool call checks ownership and reads inside one read transaction.

The database is a regenerable cache, so the new location needs no migration. An explicit `LIBRARIAN_DB_PATH` and the plugin's `CLAUDE_PLUGIN_DATA` mapping still take precedence.

**2. Package users can't run the helper commands.** `reindex`, `recent` and `install-hook` exist only as `npm run` scripts that run from `src/` via `tsx`, which isn't shipped. Add one entry file, `src/cli.ts`, that dispatches subcommands to existing code without new logic:
- no subcommand, or `serve`: the stdio server (what `src/stdio.ts` does today). A bare `npx -y rutter-memory` in an MCP config must start the server.
- `install-hook [--client …] [--vault …]`: runs `hooks/install-hook.mjs` with the same arguments.
- `reindex` and `recent`: the compiled `dist/reindex.js` and `dist/recent-cli.js`.

In `package.json` → `bin`, point both `rutter-memory` and `rutter` at `dist/cli.js`, which starts with `#!/usr/bin/env node`. Keeping the `rutter` command means existing configs that call it keep working. Pointing it at the dispatcher matters because `dist/stdio.js` has no shebang and can't run directly as an npm executable. A bare `rutter` still starts the server, since `serve` is the default. Configs that run `node dist/stdio.js` explicitly, like the Claude Code plugin, are unaffected.

**3. Capture needs a stable hook path, so the docs say install globally.** `hooks/install-hook.mjs` writes the absolute path of `hooks/librarian-stop.sh` into the host's hook config. The npx cache path is temporary, so a hook registered from it would stop working without warning. The docs therefore split two uses:
- **Recall only:** `npx -y rutter-memory` in the MCP config.
- **Recall and capture:** `npm install -g rutter-memory`, then `rutter-memory install-hook --client codex|antigravity|claude`. Grok follows its existing hook steps, pointed at the global path.

`install-hook.mjs` already refuses to run when `dist/capture-cli.js` is missing. In a published package, `dist/` is always present.

**3a. The Antigravity installer overrides the new database default.** `hooks/install-hook.mjs:90` sets `LIBRARIAN_DB_PATH` to `<package>/data/librarian.db`. Lines 180 and 185 write that value into the `agy mcp add` command and the JSON config it prints. That would undo item 1 for every Antigravity user. The fix: omit `LIBRARIAN_DB_PATH` from the generated config unless the user set it explicitly, so the server's own default applies. Verification checks the printed config.

**3b. Re-running `install-hook` must repair a hook at an old path.** With nvm or another Node version manager, switching Node versions changes the global install path. The installer recognizes its own hook only by the current absolute path (lines 102, 129 and 255), so an entry at the old path looks foreign:
- Claude Code and Codex would gain a second Stop hook beside the broken one. If both paths exist, capture would run twice.
- Antigravity refuses, because the named entry `rutter` exists with a command it doesn't recognize (line 120).

The fix: treat any command whose script path ends in `/hooks/librarian-stop.sh` as ours, wherever it lives. On re-run, rewrite that entry to the current path, keep its `--client`, and print the old and new paths.

Capture and recall must agree on one vault. The installer resolves a single vault, in this order:
1. An explicit `--vault`.
2. The vault the existing hook already sets, since that is where capture has been writing.
3. `LIBRARIAN_VAULT_PATH`.
4. The default.

It writes that vault into the rewritten hook, and into the MCP config it prints. This order applies to Antigravity, the only client whose hook command carries a vault (`LIBRARIAN_VAULT_PATH=…` in the command). Claude Code and Codex hooks carry none. They inherit the client's environment, and `--vault` stays Antigravity-only, as today. For those clients the installer only prints the vault that environment resolves to, so the user can match it in the server registration. It also prints the vault it chose and why. When `--vault` replaces a different preserved vault, it says so, because earlier captures stay in the old vault. Commands a user customized beyond the known shapes stay untouched, as today. The docs then keep the caveat: after switching Node versions, re-run `install-hook`.

**4. Package contents and metadata** (`package.json`):
- `"name": "rutter-memory"`, version `0.6.0`. Bump `.claude-plugin/plugin.json` to match, and regenerate `package-lock.json` so its top-level and root-package entries carry the new name and version.
- `"files": ["dist", "hooks", "README.md", "LICENSE", "CHANGELOG.md"]`. Without this, `src/`, `test/`, `docs/`, `spec/` and `assets/` would ship.
- `"mcpName": "io.github.shinytoyrobots/rutter"`. npm ignores it. The MCP Registry checks that the published package carries this exact name, so shipping it now means the Registry plan needs no extra npm release.
- `"homepage": "https://ruttermemory.com"`, plus `keywords` (mcp, mcp-server, memory, markdown, obsidian, claude-code, codex).

**5. Publish from GitHub, never from a laptop.** This follows Robin's global rule. Add `.github/workflows/release.yml`, triggered when a `v*` tag is pushed:
- `permissions: id-token: write, contents: read`.
- Set up Node 22.14.0 or later with the npm registry URL, then `npm install -g npm@^11.5.1`. Node 22 ships npm 10, which can't do trusted publishing. Without the upgrade, the first token-based release would succeed and every release after the token is removed would fail.
- `npm ci`, `npm run build`, `npm test`.
- A step that fails if the tag disagrees with the version in `package.json`, `package-lock.json` (both entries) or `.claude-plugin/plugin.json`.
- `npm publish --provenance --access public`.

npm authentication: the first publish needs a publishing token, because npm trusted publishing (GitHub OIDC) can only be set up on a package that already exists. Robin creates it:
- npmjs.com → Access Tokens → Generate New Token → **Granular Access Token**.
- Permissions: **Read and write** on packages. Choose "All packages", because `rutter-memory` doesn't exist yet and can't be selected.
- Tick **Bypass two-factor authentication**, so CI can publish without a one-time code.
- Expiry: 30 days. It has to last until the trusted-publishing check below (v0.6.1) succeeds.
- Save it as the GitHub repo secret `NPM_TOKEN` (Settings → Secrets and variables → Actions). The workflow passes it to `npm publish` as `NODE_AUTH_TOKEN`.

After v0.6.0 is live, switch to trusted publishing:
1. On the package's npm settings page, add `shinytoyrobots/rutter` + `release.yml` as the trusted publisher.
2. Explicitly allow that publisher to run `npm publish`. Allowing staged publishing alone does not authorize this workflow.

   *As built (2026-10-15):* Robin chose manual approval instead. The trusted publisher allows staging only, and the workflow runs `npm stage publish`. Each release waits on npmjs.com until it is approved with 2FA. A plain `npm publish` under that setting is refused with 403 "OIDC permission denied for this action", which is how the first v0.6.1 run failed.
3. Delete the `NPM_TOKEN` secret, so the workflow has no token to fall back on.
4. Ship a patch release (v0.6.1) through the workflow. A release PR first bumps `package.json`, `package-lock.json` and `.claude-plugin/plugin.json` to 0.6.1 and adds a CHANGELOG line. Tagging an unbumped commit would fail the version check. Confirm the release succeeds and `npm view rutter-memory` shows provenance.
5. Only then revoke the token on npm. If step 4 fails, the token still exists to restore while the settings are fixed.

**6. Docs** (a separate PR after the package is live, so no instruction points at a package that doesn't exist):
- `docs/getting-started.md`: Codex and Antigravity paths swap clone and build for `npm install -g rutter-memory` plus `rutter-memory install-hook`, and register the server as `rutter-memory` rather than an absolute path. Keep "from a clone" as a contributor path. Add a recall-only `npx` snippet, the Node-version-switch caveat, and a short "upgrading" section. The Claude Code and Grok paths are unchanged.
- `README.md` install section to match.
- This edits a ported page, so the gh-pages re-port, `sources.json` rehash, `sitemap.xml` lastmod bump and `llms.txt` review all apply (see the gh-pages publish process).
- `CHANGELOG.md` entry for v0.6.0.

## Ongoing release rule

From v0.6.0 on, the Claude Code plugin follows `main`, while npm users get only tagged versions. Tag every merge that changes how rutter behaves, including dependency security bumps, or the two groups drift apart. A tag only stages the release: it reaches npm users once it is approved on npmjs.com, so a release is not done until that approval. Published npm versions can't be removed after 72 hours, only deprecated.

## Sequence

| Step | Who | What |
|---|---|---|
| 1 | Claude | PR A: items 1–5, including 3a and 3b (code, installer fixes, package metadata, release workflow, CHANGELOG) |
| 2 | Robin | Create or log in to the npm account (two-factor on); create the publishing token (item 5) and save it as `NPM_TOKEN`; merge PR A |
| 3 | Robin | Push tag `v0.6.0`; the workflow publishes to npm |
| 4 | Claude | Verify the live package (see Verification); PR B: docs (item 6) and gh-pages port |
| 5 | Robin | Merge PR B; set up trusted publishing with direct publish allowed, and delete the secret |
| 6 | Claude | PR C: release bump to 0.6.1 (manifests, lockfile, CHANGELOG) |
| 7 | Robin | Merge PR C, tag v0.6.1, and revoke the token only after that release succeeds |

## Verification

Before PR A merges, all local and nothing published:
- `npm run typecheck`, `npm test`.
- New tests:
  - The database-path default: inside `node_modules` vs a clone vs an explicit env var.
  - Two vaults: two different vault paths get two different default databases. A database built from vault A, opened with vault B, is refused: it is neither rebuilt nor read, and the error names the owning vault.
  - Concurrent clients: server A runs on vault A against an explicit database path. Server B starts on vault B against the same path and refuses. A's searches still return vault A's notes afterward. `reindex --force` reassigns a database by rebuilding it first.
  - Legacy claim: build an unowned database from vault A, then open it with vault B, which has the same note count and older modified times. The server rebuilds from vault B before answering, and a search for a note only in vault A returns nothing. A failed rebuild leaves the database unowned, and the tools return the error.
  - The Antigravity installer's printed config has no `LIBRARIAN_DB_PATH` unless one was set.
  - Two install prefixes: install the hook from prefix A, re-run `install-hook` from prefix B, for each of `claude`, `codex` and `antigravity`. Each config ends with exactly one rutter Stop hook, pointing at prefix B. The vault in the rewritten hook matches the vault in the printed server config. For Antigravity, running again with an explicit `--vault` replaces the preserved vault in both.
  - CLI dispatcher routing: `serve` is the default, and unknown subcommands exit non-zero with usage.
- `npm pack --dry-run`: only `dist/`, `hooks/` and the listed docs ship, and `hooks/librarian-stop.sh` stays executable.
- Install the tarball into a scratch prefix (`npm install -g --prefix <scratch> ./rutter-memory-0.6.0.tgz`):
  - Both installed commands, `rutter-memory` and `rutter`, run directly from the prefix's `bin/` and start the server.
  - `rutter-memory` starts the server. An MCP `tools/list` returns the four `librarian-*` tools, the database is created under the XDG path, and nothing is written into the package folder.
  - `rutter-memory install-hook --client codex` with a scratch `CODEX_HOME` writes the global-prefix hook path. Piping a sample Codex Stop payload (with a `librarian-session` line in `last_assistant_message`) to that hook writes an entry into a scratch vault.

After the tag ships:
- `npm view rutter-memory` shows 0.6.0 with provenance.
- The switch to trusted publishing counts as done only when v0.6.1 has published through OIDC with no token present.
- Per the personal-projects rules, check recall from at least two clients (Claude Code, plus Codex or Antigravity) launched with `npx -y rutter-memory`.

## Out of scope

- The MCP Registry and other directory listings: see [mcp-registry-plan.md](mcp-registry-plan.md).
- New harnesses: GitHub Copilot CLI ([copilot-cli-plan.md](copilot-cli-plan.md)) and Meta Muse Code ([muse-code-plan.md](muse-code-plan.md)).
- Renaming internal `librarian-*` tools, env vars or `_librarian/`. The brand-vs-mechanism split stays.
- Having `install-hook` also register the MCP server. That would merge two setup steps per harness and is worth its own plan.
