---
type: plan
status: next-up
created: 2026-10-16
domain: ops
---

# Move the GitHub Actions workflows off Node 20

**Status:** do this first in the next session, before anything else (Robin, 2026-10-16). Delete this file in the PR that finishes it.

## Why

Both v0.7.0 workflow runs warned that `actions/checkout@v4` and `actions/setup-node@v4` target Node 20, which GitHub has deprecated. GitHub currently forces them onto Node 24, and that forcing won't last. The runs were [release](https://github.com/shinytoyrobots/rutter/actions/runs/38853736902) and [registry](https://github.com/shinytoyrobots/rutter/actions/runs/38854008787). The release run also warned that `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19.

## What to change

- `.github/workflows/release.yml`: `actions/checkout@v4` and `actions/setup-node@v4`.
- `.github/workflows/registry.yml`: the same two actions.

Bump each to its current major version. Look up the latest release of each action rather than guessing.

## What must not change

- `node-version: "22"` in `setup-node`. That's the Node the package is built and tested with, not the Node the action runs on.
- The npm trusted-publishing and staging steps in `release.yml`: the npm upgrade, `npm stage publish`, and the tag-versus-version check.
- The pinned, checksum-verified `mcp-publisher` install in `registry.yml`.

## Checks

- Check whether the Ubuntu 26 move affects either job, for example the `mcp-publisher` binary or Node setup.
- Codex adversarial review. Run `codex exec --sandbox read-only -C . -o <out> - < <prompt-file>`, and feed the prompt on stdin, because a backgrounded `codex exec "<prompt>"` waits on stdin forever.
- After merge, run `gh workflow run registry.yml` by hand. It's safe to rerun at any time. The release workflow runs only on a `v*` tag, so the PR should say that the next release verifies it.
