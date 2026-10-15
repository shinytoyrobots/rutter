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

v0.6.1 is already on npm, so the first release carrying `server.json` is v0.6.2 or later. Use whatever version that release actually has.

**2. A separate Registry workflow, `.github/workflows/registry.yml`.** The Registry steps can't go in `release.yml`. That workflow only *stages* the npm release (`npm stage publish`), and the version stays invisible to installs until Robin approves it on npmjs.com with 2FA. The Registry checks that the npm version exists and carries the right `mcpName`, so publishing from the release job would fail every time. The Registry step has to run after approval, in its own workflow.

`release.yml` changes in one way only: `server.json` (both `version` fields) joins the version-agreement check, so a mismatched release is refused before it is staged.

`registry.yml`:
- **Triggers:** `workflow_dispatch` with an optional version input, and a daily `schedule`.
- **Permissions:** `id-token: write`, `contents: read`. No secrets.
- **Concurrency:** `concurrency: { group: registry-publish, cancel-in-progress: false }`, one fixed group shared by manual and scheduled runs. Without it, a manual run and the daily run can both find a version missing and both try to publish it; one wins and the other gets the Registry's duplicate-version error. With it, the second run waits, and by the time it looks, the version is there and matches. GitHub keeps only one *waiting* run per group, so a newer waiting run replaces an older one. That loses nothing: a run with no version input covers every eligible tag, and a dropped manual run can be started again.
- **Steps:**
  1. **Build the candidate list.** With a version input, the list is that one version. Without one (the daily run, or a manual run with no input), the list is every release that could belong in the Registry: each `v*` tag whose tree contains `server.json` (`git cat-file -e v<version>:server.json`), sorted oldest first by semver. Fetch tags with `fetch-depth: 0`. Tags from before `server.json` existed, such as v0.6.1, are never candidates, so they can't fail the run. Don't pick a single version from npm's `latest` dist-tag: before the first Registry-enabled release is approved, `latest` points at a tag without `server.json`, and if two releases are approved between daily runs, the earlier one would never be published.
  2. **Fetch npm's public versions once:** `npm view rutter-memory versions --json`, plus `npm view rutter-memory mcpName`, which must be `io.github.shinytoyrobots/rutter`. Staged versions don't appear until approved.
  3. **For each candidate, oldest first:**
     1. If the version isn't in npm's public list, log "v<version>: not approved on npm yet" and skip it. That is the normal state between tag and approval, not an error.
     2. Read `server.json` from that tag (`git show v<version>:server.json`), not from `main`, and confirm both of its version fields equal the candidate version.
     3. Look up that exact version in the Registry (`GET /v0/servers/{url-encoded name}/versions/{version}`; confirm the path against the live API).
        - **Not found:** check out the tag, then `mcp-publisher publish`. Install `mcp-publisher` at a pinned version and run `mcp-publisher login github-oidc` once, before the loop. If the publish fails with the duplicate-version error, something else published the version between the lookup and the publish (the concurrency group should prevent this, but a publish from outside the workflow can't be ruled out). Don't fail on that alone: look the version up again and apply the "Found" rules below.
        - **Found:** compare it with the tag's `server.json` (see "Comparing metadata" below). If equal, log "v<version>: already published" and move on.
        - **Found but different:** record a failure for that version and carry on with the rest. The Registry refuses a name and version that already exist, even with identical metadata, so a published version can't be corrected. The fix is a new release.
  4. **Finish:** the run fails if any version recorded a failure, and passes otherwise, including when every candidate was skipped or already published.

**Comparing metadata.** The Registry's answer isn't `server.json` with extra fields. It is a wrapper, `{ "server": {…}, "_meta": {…} }`, and its serializer leaves out optional fields that hold their default value, such as `"isRequired": false`, which the sample above writes explicitly. A plain comparison would report every rerun as a mismatch. So compare a normalized form of both sides:
- Take the Registry side from `.server`, and ignore `_meta` entirely.
- On both sides, drop keys whose value is `false`, `null`, `""`, `[]` or `{}`, recursively, then sort object keys.
- Compare the results. Any other difference is a real mismatch.

Check this against one real published entry before relying on it (see Verification). If the Registry turns out to fill in defaults rather than omit them, the same normalization still works.

The duplicate check is what makes reruns safe. Without it, a second run for the same version fails with the Registry's duplicate-version error. With it, every run publishes each approved version once and leaves the rest alone. Because the daily run walks every eligible tag, it is a real backstop: if Robin approves one or several releases and doesn't trigger the workflow, the Registry catches up within a day and no version is skipped. Publishing oldest first keeps the Registry's history in order. If the Registry marks the most recently *published* entry as latest rather than the highest version, publishing a gap after a newer release would mislabel it, so check how it sets `isLatest` before relying on backfill.

**If the Registry step fails, the npm release stands.** Rerun `registry.yml` only, by hand with the version as input. Never rerun `release.yml` to fix a Registry failure: that would try to stage an npm version that already exists.

**3. Release rule addition:** every release bumps `server.json` (both `version` fields) together with `package.json`, `package-lock.json` and `.claude-plugin/plugin.json`. Each release goes through a bump PR before its tag. The release workflow refuses a mismatch. A release now finishes in three steps: push the tag (npm stages it), approve it on npmjs.com, then the Registry workflow publishes the metadata (by hand right away, or on its daily run).

**4. Other directories** (manual, after the Registry entry is live):
- **PulseMCP and Glama:** confirm rutter appears. Submit by hand only if it doesn't after a week.
- **mcp.so:** web form with the GitHub URL.
- **awesome-mcp-servers:** a PR adding rutter under the memory section.
- **Smithery:** skip. It is built for hosted servers, and rutter is local only.

## Sequence

| Step | Who | What |
|---|---|---|
| 1 | Claude | PR: `server.json`, `registry.yml`, the `server.json` line in the `release.yml` version check, CHANGELOG |
| 2 | Robin | Merge; push the next version tag. `release.yml` stages the version on npm |
| 3 | Robin | Approve the staged version on npmjs.com (2FA) |
| 4 | Robin | Run `registry.yml` with that version, or leave it for the daily run |
| 5 | Claude | Verify the listing; submit mcp.so and the awesome-list PR |
| 6 | Robin | Merge or approve the outside submissions as needed |

## Verification

Before merging:
- `mcp-publisher validate` passes on `server.json`.
- The version-agreement check fails on a deliberately mismatched `server.json` and passes when versions agree.
- The single-version Registry lookup path in `registry.yml` matches the live API: it returns an existing entry (any listed server will do) and a not-found for a version that doesn't exist.
- The metadata comparison, run against a real published entry that has an optional field set to its default, treats the entry's `.server` as equal to its source `server.json`, and as different when one field is changed.
- With no version input, the candidate list on today's repo is empty (no tag has `server.json` yet), and the run passes.
- The Registry's rule for `isLatest` is known: highest version, or most recently published.
- Duplicate-error fallback: keep the per-version logic in a script the workflow calls, so it can be tested with stand-ins. With a stand-in `mcp-publisher` that exits with the duplicate-version error, and a lookup that first says "not found" and then returns a matching entry, the script reports "already published" and passes. With a non-matching entry on the second lookup, it records a failure.

Between tag and approval:
- `registry.yml` exits successfully with "not approved on npm yet" and publishes nothing.

After approval:
- `registry.yml` publishes the entry.
- Running `registry.yml` again for the same version exits successfully with "already published", with no Registry error.
- Overlapping runs: start `registry.yml` by hand twice in quick succession before the version is in the Registry. The second run shows as waiting in the Actions tab until the first finishes, then reports "already published". Both runs pass.
- `curl "https://registry.modelcontextprotocol.io/v0/servers?search=rutter"` returns the entry with the new version.
- The entry's install details let a client start the server with `npx -y rutter-memory` and `LIBRARIAN_VAULT_PATH` set.
- After about a week: rutter appears on PulseMCP and Glama, or a manual submission is logged.

## Out of scope

- The npm package itself: see [npm-plan.md](npm-plan.md).
- Launch posts (Show HN, Reddit). Those wait for an install-and-demo story worth showing.
