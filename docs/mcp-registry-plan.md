# rutter in the MCP Registry

**Depends on:** [npm-plan.md](npm-plan.md). Start only once `rutter-memory` is live on npm and its published `package.json` carries `"mcpName": "io.github.shinytoyrobots/rutter"`. The npm plan ships that field, so no extra npm release is needed.

## Context

The official MCP Registry (registry.modelcontextprotocol.io) is where MCP clients and directory sites look up servers. It stores metadata only, and each entry points at a published package, which is why npm comes first. It is still in preview (checked 2026-10-15), so field names may change.

A Registry entry also feeds other directories. PulseMCP reportedly copies from it automatically. Glama indexes public GitHub MCP repos on its own. Both claims come from secondary sources and need checking after listing.

Outcome: the Registry lists `io.github.shinytoyrobots/rutter`, pointing at the npm package `rutter-memory`, and every later release updates the entry automatically.

## What has to change, and why

**1. Registry metadata, `server.json` at the repo root:**
```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.shinytoyrobots/rutter",
  "title": "rutter",
  "description": "Recall past decisions and the notes your AI sessions cited, from a local markdown folder.",
  "websiteUrl": "https://ruttermemory.com",
  "repository": { "url": "https://github.com/shinytoyrobots/rutter", "source": "github" },
  "version": "0.6.2",
  "packages": [{
    "registryType": "npm",
    "identifier": "rutter-memory",
    "version": "0.6.2",
    "transport": { "type": "stdio" },
    "environmentVariables": [
      { "name": "LIBRARIAN_VAULT_PATH", "description": "Folder of markdown notes (an Obsidian vault works)", "isRequired": true, "format": "filepath" },
      { "name": "LIBRARIAN_USER_LABEL", "description": "Name the server uses for whose work this is; defaults to 'the user'", "isRequired": false }
    ]
  }]
}
```
The `io.github.shinytoyrobots/` namespace is proved by GitHub login, so it needs no DNS setup. Check the field names against the live schema with `mcp-publisher validate` before merging.

The version shown assumes v0.6.1 is the npm plan's trusted-publishing check. Use whatever version the first release carrying `server.json` actually has.

**2. Extend the release workflow** (`.github/workflows/release.yml`, from the npm plan), with steps after `npm publish`:
- Add `server.json` to the version-agreement check.
- Install `mcp-publisher` at a pinned version.
- `mcp-publisher login github-oidc`. This uses the workflow's existing `id-token: write` permission, so it needs no secret.
- `mcp-publisher publish`.

If the Registry step fails, the npm release stands. Re-run the workflow job or publish the metadata by hand from CI. Registry updates are idempotent per version.

**3. Release rule addition:** every release bumps `server.json` (both `version` fields) together with `package.json`, `package-lock.json` and `.claude-plugin/plugin.json`. Each release goes through a bump PR before its tag. The workflow refuses a mismatch.

**4. Other directories** (manual, after the Registry entry is live):
- **PulseMCP and Glama:** confirm rutter appears. Submit by hand only if it doesn't after a week.
- **mcp.so:** web form with the GitHub URL.
- **awesome-mcp-servers:** a PR adding rutter under the memory section.
- **Smithery:** skip. It is built for hosted servers, and rutter is local only.

## Sequence

| Step | Who | What |
|---|---|---|
| 1 | Claude | PR: `server.json`, workflow steps, CHANGELOG |
| 2 | Robin | Merge; push the next version tag. The workflow publishes to npm and the Registry |
| 3 | Claude | Verify the listing; submit mcp.so and the awesome-list PR |
| 4 | Robin | Merge or approve the outside submissions as needed |

## Verification

Before merging:
- `mcp-publisher validate` passes on `server.json`.
- The version-agreement check fails on a deliberately mismatched `server.json` and passes when versions agree.

After the tag ships:
- `curl "https://registry.modelcontextprotocol.io/v0/servers?search=rutter"` returns the entry with the new version.
- The entry's install details let a client start the server with `npx -y rutter-memory` and `LIBRARIAN_VAULT_PATH` set.
- After about a week: rutter appears on PulseMCP and Glama, or a manual submission is logged.

## Out of scope

- The npm package itself: see [npm-plan.md](npm-plan.md).
- Launch posts (Show HN, Reddit). Those wait for an install-and-demo story worth showing.
