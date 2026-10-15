# rutter on npm and the MCP Registry

## Context

Outside Claude Code, setting up rutter means `git clone`, `npm install` and `npm run build`. That stops casual trials, and it keeps rutter out of the directories where people look for MCP servers. The official MCP Registry stores metadata only: each entry has to point at a published package. PulseMCP reportedly copies from the Registry automatically, so publishing to npm unlocks the rest.

The unscoped name `rutter` on npm belongs to an unrelated router library. **`rutter-memory` is free** (checked 2026-10-15). The brand stays rutter, and only the package name changes.

Outcome: `npx -y rutter-memory` runs the server, `npm install -g rutter-memory` gives a stable hook path for capture, and the Registry lists `io.github.shinytoyrobots/rutter`.

## What has to change, and why

**1. The default database location breaks outside a clone.** `src/config.ts:57` defaults `LIBRARIAN_DB_PATH` to `<package root>/data/librarian.db`. Run from npm, that folder is inside `node_modules` or the npx cache. The npx cache can be wiped at any time, and a global install path may not be writable. The fix: when the package root sits inside a `node_modules` directory, default to `$XDG_DATA_HOME/rutter/librarian.db`, falling back to `~/.local/share/rutter/librarian.db`. A clone keeps `data/`, so existing setups don't move. The database is a regenerable cache (`src/startup-index.ts` rebuilds it at start-up), so the new location needs no migration. An explicit `LIBRARIAN_DB_PATH` and the plugin's `CLAUDE_PLUGIN_DATA` mapping still take precedence.

**2. Package users can't run the helper commands.** `reindex`, `recent` and `install-hook` exist only as `npm run` scripts that run from `src/` via `tsx`, which isn't shipped. Add one entry file, `src/cli.ts`, that dispatches subcommands to existing code without new logic:
- no subcommand, or `serve`: the stdio server (what `src/stdio.ts` does today). A bare `npx -y rutter-memory` in an MCP config must start the server.
- `install-hook [--client …] [--vault …]`: runs `hooks/install-hook.mjs` with the same arguments.
- `reindex` and `recent`: the compiled `dist/reindex.js` and `dist/recent-cli.js`.

In `package.json` → `bin`, add `rutter-memory` pointing at `dist/cli.js`, and keep `rutter` → `dist/stdio.js` so existing configs keep working.

**3. Capture needs a stable hook path, so the docs say install globally.** `hooks/install-hook.mjs` writes the absolute path of `hooks/librarian-stop.sh` into the host's hook config. The npx cache path is temporary, so a hook registered from it would stop working without warning. The docs therefore split two uses:
- **Recall only:** `npx -y rutter-memory` in the MCP config.
- **Recall and capture:** `npm install -g rutter-memory`, then `rutter-memory install-hook --client codex|antigravity|claude`. Grok follows its existing hook steps, pointed at the global path.

Caveat to document: with nvm or another Node version manager, switching Node versions changes the global path. Re-run `install-hook` after switching.

`install-hook.mjs` already refuses to run when `dist/capture-cli.js` is missing. In a published package, `dist/` is always present.

**4. Package contents and metadata** (`package.json`):
- `"name": "rutter-memory"`, version `0.6.0`. Bump `.claude-plugin/plugin.json` to match.
- `"files": ["dist", "hooks", "README.md", "LICENSE", "CHANGELOG.md"]`. Without this, `src/`, `test/`, `docs/`, `spec/` and `assets/` would ship.
- `"mcpName": "io.github.shinytoyrobots/rutter"`. The Registry checks that the npm package carries this exact name.
- `"homepage": "https://ruttermemory.com"`, plus `keywords` (mcp, mcp-server, memory, markdown, obsidian, claude-code, codex).

**5. Registry metadata, `server.json` at the repo root:**
```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.shinytoyrobots/rutter",
  "title": "rutter",
  "description": "Recall past decisions and the notes your AI sessions cited, from a local markdown folder.",
  "websiteUrl": "https://ruttermemory.com",
  "repository": { "url": "https://github.com/shinytoyrobots/rutter", "source": "github" },
  "version": "0.6.0",
  "packages": [{
    "registryType": "npm",
    "identifier": "rutter-memory",
    "version": "0.6.0",
    "transport": { "type": "stdio" },
    "environmentVariables": [
      { "name": "LIBRARIAN_VAULT_PATH", "description": "Folder of markdown notes (an Obsidian vault works)", "isRequired": true, "format": "filepath" },
      { "name": "LIBRARIAN_USER_LABEL", "description": "Name the server uses for whose work this is; defaults to 'the user'", "isRequired": false }
    ]
  }]
}
```
Check the field names against the live schema with `mcp-publisher validate` before merging. The schema is still in preview and may change.

**6. Publish from GitHub, never from a laptop.** This follows Robin's global rule. Add `.github/workflows/release.yml`, triggered when a `v*` tag is pushed:
- `permissions: id-token: write, contents: read`.
- Set up Node 22 with the npm registry URL, then `npm ci`, `npm run build`, `npm test`.
- `npm publish --provenance --access public`.
- Install `mcp-publisher`, run `mcp-publisher login github-oidc`, then `mcp-publisher publish`.
- A step that fails if the tag, `package.json` version and `server.json` versions disagree.

npm authentication: the first publish needs a publishing token, because npm trusted publishing (GitHub OIDC) can only be set up on a package that already exists. Robin creates it:
- npmjs.com → Access Tokens → Generate New Token → **Granular Access Token**.
- Permissions: **Read and write** on packages. Choose "All packages", because `rutter-memory` doesn't exist yet and can't be selected.
- Tick **Bypass two-factor authentication**, so CI can publish without a one-time code.
- Expiry: 7 days. It only has to survive the first publish.
- Save it as the GitHub repo secret `NPM_TOKEN` (Settings → Secrets and variables → Actions). The workflow passes it to `npm publish` as `NODE_AUTH_TOKEN`.

After v0.6.0 is live: on the package's npm settings page, add `shinytoyrobots/rutter` + `release.yml` as the trusted publisher, then revoke the token and delete the secret. The workflow then publishes with OIDC alone.

**7. Docs** (a separate PR after the package is live, so no instruction points at a package that doesn't exist):
- `docs/getting-started.md`: Codex, Grok and Antigravity paths swap clone and build for `npm install -g rutter-memory` plus `rutter-memory install-hook`. Keep "from a clone" as a contributor path. Add a recall-only `npx` snippet. The Claude Code plugin path is unchanged.
- `README.md` install section to match.
- This edits a ported page, so the gh-pages re-port, `sources.json` rehash, `sitemap.xml` lastmod bump and `llms.txt` review all apply (see the gh-pages publish process).
- `CHANGELOG.md` entry for v0.6.0.

## Sequence

| Step | Who | What |
|---|---|---|
| 1 | Claude | PR A: items 1–6 (code, package metadata, `server.json`, workflow, CHANGELOG) |
| 2 | Robin | Create or log in to the npm account; create the publishing token (item 6) and save it as `NPM_TOKEN`; merge PR A |
| 3 | Robin | Push tag `v0.6.0`; the workflow publishes to npm and the Registry |
| 4 | Claude | Verify the live listings (see Verification); PR B: docs (item 7) and gh-pages port |
| 5 | Robin | Merge PR B; set up trusted publishing, then revoke the token and delete the `NPM_TOKEN` secret |
| 6 | Later, separate | mcp.so form and an awesome-mcp-servers PR (both need the npm package to exist first) |

## Verification

Before PR A merges, all local and nothing published:
- `npm run typecheck`, `npm test`.
- New tests: the database-path default (inside `node_modules` vs a clone vs an explicit env var), and the CLI dispatcher routing (`serve` is the default, unknown subcommands exit non-zero with usage).
- `npm pack --dry-run`: only `dist/`, `hooks/` and the listed docs ship, and `hooks/librarian-stop.sh` stays executable.
- Install the tarball into a scratch prefix (`npm install -g --prefix <scratch> ./rutter-memory-0.6.0.tgz`):
  - `rutter-memory` starts the server. An MCP `tools/list` returns the four `librarian-*` tools, the database is created under the XDG path, and nothing is written into the package folder.
  - `rutter-memory install-hook --client codex` with a scratch `CODEX_HOME` writes the global-prefix hook path. Piping a sample Codex Stop payload (with a `librarian-session` line in `last_assistant_message`) to that hook writes an entry into a scratch vault.
- `mcp-publisher validate` passes on `server.json`.

After the tag ships:
- `npm view rutter-memory` shows 0.6.0 with provenance.
- `curl "https://registry.modelcontextprotocol.io/v0/servers?search=rutter"` returns the entry.
- Per the personal-projects rules, check recall from at least two clients (Claude Code, plus Codex or Antigravity) launched with `npx -y rutter-memory`.

## Out of scope

- New harnesses. GitHub Copilot CLI is the next candidate and gets its own plan.
- Smithery. It's built for hosted servers, and rutter is local only.
- Renaming internal `librarian-*` tools, env vars or `_librarian/`. The brand-vs-mechanism split stays.
