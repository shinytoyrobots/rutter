---
type: plan
status: done
created: 2026-10-16
domain: ops
---

# Move the GitHub Actions workflows off Node 20

**Status:** done in v0.8.2 (2026-10-19). Workflows moved to `actions/checkout@v7` and `actions/setup-node@v7`; `registry.yml` gained the mcp-publisher smoke test and an `ubuntu-26.04` `smoke-test` job. Verified by registry run 39301980927 and release run 39302078806.

## Why

Both v0.7.0 workflow runs warned that `actions/checkout@v4` and `actions/setup-node@v4` target Node 20, which GitHub has deprecated. GitHub is making Node 24 the default runtime for JavaScript actions and removing the opt-out that keeps an action on Node 20. So we shouldn't rely on the runner overriding the runtime an action declares. Move to action versions that declare Node 24 support. The runs were [release](https://github.com/shinytoyrobots/rutter/actions/runs/38853736902) and [registry](https://github.com/shinytoyrobots/rutter/actions/runs/38854008787). The release run also warned that `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19.

## What to change

- `.github/workflows/release.yml`: `actions/checkout@v4` and `actions/setup-node@v4`.
- `.github/workflows/registry.yml`: the same two actions.

Bump each to its current major version. Look up the latest release of each action rather than guessing.

## What must not change

- `node-version: "22"` in `setup-node`. That's the Node the package is built and tested with, not the Node the action runs on.
- The npm trusted-publishing and staging steps in `release.yml`: the npm upgrade, `npm stage publish`, and the tag-versus-version check.
- The pinned, checksum-verified `mcp-publisher` install in `registry.yml`. The smoke-test step below goes after it; the install itself stays as it is.

## Add a binary smoke test to `registry.yml`

A registry run doesn't prove the binary works on the runner image. `scripts/registry-publish.mjs` runs `mcp-publisher` only when a version is missing from the Registry. When every version is already listed, the run skips `login` and `publish` and still succeeds. An `mcp-publisher` binary that can't run on Ubuntu 26 would go unnoticed until the next release needs it.

- Add a step straight after the install that runs the binary and fails the job if it can't, for example `./mcp-publisher --help`. Check which command `mcp-publisher` v1.8.1 actually accepts and that it exits 0; don't guess the flag.
- The step runs in the same job, so it runs on whatever image `ubuntu-latest` resolves to. Have the step print the image (for example `cat /etc/os-release`) so the log shows which Ubuntu it ran on.
- `ubuntu-latest` moves to Ubuntu 26 gradually, from October 19 to November 19, so a correct run in that window may still land on Ubuntu 24. To test Ubuntu 26 for certain, add a separate `smoke-test` job with `runs-on: ubuntu-26.04`. It repeats the pinned, checksum-verified install and the smoke-test step, and nothing else: no OIDC, no publishing. Confirm the `ubuntu-26.04` label is available before relying on it. If it isn't, record Ubuntu 26 verification as pending in the PR until a run lands on Ubuntu 26.
- Keep the `smoke-test` job after the migration. It's cheap, and it pins the image the binary is tested on.

## Checks

- Check whether the Ubuntu 26 move affects either job, for example the `mcp-publisher` binary or Node setup.
- Codex adversarial review. Run `codex exec --sandbox read-only -C . -o <out> - < <prompt-file>`, and feed the prompt on stdin, because a backgrounded `codex exec "<prompt>"` waits on stdin forever.
- After merge, run `gh workflow run registry.yml` by hand. It's safe to rerun at any time. Dispatching it isn't the check; the finished run is. Wait for it with `gh run watch <run-id> --exit-status`, then confirm in `gh run view <run-id> --log` that the `smoke-test` job passed on Ubuntu 26.04, that the `publish` job's smoke-test step passed on whichever image it got, and that there are no Node 20 deprecation warnings.
- The release workflow runs only on a `v*` tag, so the PR should say that the next release verifies it, by the same check: a finished, green run with no Node 20 warnings.
