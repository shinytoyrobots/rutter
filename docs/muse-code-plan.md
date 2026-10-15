---
type: plan
status: blocked-on-probe
created: 2026-10-15
domain: ops
---

# Meta Muse Code support for rutter

**Status:** a probe, not a build. The facts that decide whether capture is possible aren't in
Meta's docs. Run the probe below, then turn this file into a build plan or close it as recall-only.

**Sequencing:** after Copilot CLI (`copilot-cli-plan.md`). The probe is cheap and can run sooner.

## What it is (research 2026-10-15)

- **Muse Code**, Meta's terminal coding agent. The command is `muse`. It launched 2026-08-05 as a beta.
  Whether it has reached general availability is unclear: only an unofficial fan site says it left
  beta on 2026-08-31.
- Install: `curl -fsSL https://dev.meta.ai/install.sh | sh`. This puts a launcher at
  `~/.local/bin/muse`. There is no npm, pip or brew package. The license wasn't found, so treat it
  as proprietary.
- Docs: https://dev.meta.ai/docs/muse-code (configuration, extending, changelog).
- It looks like an independent implementation with Claude-compatible conventions, not a fork. It
  reads `CLAUDE.md`, `~/.claude/skills` and Codex skills, but its hook and MCP schemas are its own.

## What the docs settle

| Need | Muse Code |
|---|---|
| MCP registration | `~/.config/muse/settings.json`. Requires `"schema_version": 1`. Entry: `mcp_servers.rutter = { "transport": "stdio", "command": "npx", "args": ["-y", "rutter-memory"], "mode": "optional" }`. |
| `mode` | The default `required` **aborts the whole run** if the server fails. rutter must register as `optional`. |
| Hook events | 17 events, including `Stop`, `StopFailure`, `PostLLMCall`, `PostToolBatch` and `SessionEnd`. |
| Hook environment | Hooks run outside the sandbox **with a cleared environment**. |
| Project hooks | `<project>/.muse/hooks.json`, and only after the folder is trusted. |

## What the docs don't settle (the probe answers these)

1. **When does `Stop` fire:** after each turn, or once at session end?
2. **What is on `Stop`'s stdin:** the assistant text, a transcript path, neither? And under which field names?
3. **Where do user-level hooks go:** a key inside `settings.json`, or a separate file?
4. **Exit-code meaning:** is a non-zero exit fail-open?
5. **Where is the session log, and in what format?** (`session_retention_days` and `--no-session-log` show one exists.)
6. **Do server `instructions` reach the model?** Muse reads `CLAUDE.md`, so that is a fallback channel for the "write a session line" instruction even if they don't.

## Probe steps

1. **Read `install.sh` before running it.** It pipes a remote script into the shell and downloads a
   second launcher from `api.meta.ai`.
2. **Name collision:** cmux already puts a `muse` at `/Applications/cmux.app/Contents/Resources/bin/muse`
   on this Mac's PATH. Check `which -a muse`, and run Meta's CLI by full path (`~/.local/bin/muse`)
   for the whole probe. getting-started has to warn about this too.
3. Register rutter with `mode: "optional"` and confirm recall works (`/mcp`, then a `librarian-recent` call).
4. Add a user-level `Stop` hook, plus `SessionEnd` and `PostLLMCall`, that each write their stdin to
   a scratch file. Because the environment is cleared, use absolute paths for `node` and the dump
   file. Run two turns that each plant a `librarian-session` line, then exit.
5. Record the answers to the six questions above in a probe table in this file. Remove the hooks.

## Decision after the probe

| Probe result | Path | Size |
|---|---|---|
| `Stop` fires after each turn and carries the assistant text | Codex-style: a payload shape plus `--client muse` | Small |
| `Stop` fires after each turn with a transcript path only | Antigravity-style: a transcript reader | Medium |
| `Stop` fires only at session end | Read the whole session log at `SessionEnd`. Capture stops being incremental, which is a spec question before it is a code question. | Medium, needs a spec decision |
| No hook gives access to the reply | Recall only: a getting-started section, no capture | Docs only |

Whatever the path, the cleared environment means the installer bakes in the vault path (as
Antigravity's `--vault` does) and an absolute `node`, rather than relying on `LIBRARIAN_VAULT_PATH`.

## Open risks

- The product is about ten weeks old and its docs are thin. Hook payloads may change between releases.
  Pin the probed version in this file.
- The install route (`curl | sh`, no package manager) makes it awkward to automate a scratch install in CI. The live check stays manual.
