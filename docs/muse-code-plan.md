---
type: plan
status: blocked-on-probe
created: 2026-10-15
domain: ops
---

# Meta Muse Code support for rutter

**Status:** a probe, not a build. The facts that decide whether capture is possible aren't in
Meta's docs. Run the probe below, then turn this file into a build plan or close it as recall-only.

**Sequencing:** Copilot CLI support is already implemented (`copilot` is in `CLIENTS` in
`src/client.ts`, with installer and capture code). Whether Muse ships in the same release or a later
one is a release-order decision. The probe is cheap and can run any time.

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
| User hooks | A first-class `hooks` block in `~/.config/muse/settings.json` (plus a `managed_hooks_path` pointer for managed hooks). No separate trust step. |
| Hook environment | Hooks run outside the sandbox **with a cleared environment** and a small allowlist. |
| Project hooks | `<project>/.muse/hooks.json`, and only after the folder is trusted. |
| Malformed hook config | A startup warning; the fix only takes effect in a new session. |
| Instruction files | At each directory level up to the `.git` boundary, the first of `AGENTS.md`, `CLAUDE.md`, `.agents/AGENTS.md`, `.claude/CLAUDE.md` wins; the others at that level are ignored. Project rules load only in trusted workspaces and win over user rules. Machine-wide user rules always load, but the docs don't give their path. |

**Consequence:** `CLAUDE.md` is not a reliable fallback for the "write a session line" instruction.
Any project with an `AGENTS.md` shadows it, untrusted checkouts ignore it, and the installer must not
write into users' project files anyway. The only non-invasive channel is the user-level rules file,
whose path the probe has to find.

## What the docs don't settle (the probe answers these)

1. **When does `Stop` fire:** after each turn, or once at session end?
2. **What is on `Stop`'s stdin:** the assistant text, a transcript path, neither? And under which field names?
3. **Hook schema and merging:** what fields a `hooks` entry takes; how user, project and managed hooks
   combine; and whether re-running the installer can be made idempotent (no duplicate entries,
   other users' hooks untouched).
4. **Failure semantics:** what a non-zero exit, a crash, or a hang does. Fail-open, a warning, or a
   blocked or aborted turn? Does exit code 2 mean something special, as it does elsewhere?
5. **Where is the session log, and in what format?** (`session_retention_days` and `--no-session-log` show one exists.)
6. **Instruction delivery:** in a fresh session doing ordinary work, does the model emit a
   `librarian-session` line from rutter's server `instructions` alone? If not, where is the
   user-level rules file, and does a rule placed there work even in a project with its own `AGENTS.md`?

## Probe steps

1. **Read `install.sh` before running it.** It pipes a remote script into the shell and downloads a
   second launcher from `api.meta.ai`.
2. **Name collision:** cmux already puts a `muse` at `/Applications/cmux.app/Contents/Resources/bin/muse`
   on this Mac's PATH. Check `which -a muse`, and run Meta's CLI by full path (`~/.local/bin/muse`)
   for the whole probe. getting-started has to warn about this too. Record `muse --version`.
3. Register rutter with `mode: "optional"` and confirm recall works (`/mcp`, then a `librarian-recent` call).
4. **Event dump.** Add user-level hooks in the `hooks` block for `Stop`, `StopFailure`, `SessionEnd`
   and `PostLLMCall`. Each runs one wrapper script that appends one JSON line per invocation to a
   per-event file (`<scratch>/muse-probe/<event>.jsonl`): timestamp, event name, PID, the hook's
   exit code, and the raw stdin verbatim. Append, never overwrite. Because the environment is
   cleared, use absolute paths for `node` and the dump directory. Run two turns that each plant a
   `librarian-session` line, then exit. Re-run the install step once to see whether entries duplicate.
5. **Failure semantics.** In separate sessions, swap the `Stop` hook for one that exits 1, one that
   exits 2, and one that sleeps past any timeout. Record what the user sees and whether the turn,
   the next turn and the session continue.
6. **Instruction delivery.** Start a fresh session in a scratch git repo, do an ordinary small task
   with no planting, and check whether a directive appears. Repeat with the instruction in the
   user-level rules file (find its path first), then again in a repo that has its own `AGENTS.md`.
7. **Preserve evidence before cleanup.** Copy the dump directory, the session ID(s), the Muse
   version, and the session-log file(s) into the probe record. Then remove the hooks.
8. Record the answers to the six questions above in a probe table in this file.

## Decision after the probe

| Probe result | Path | Size |
|---|---|---|
| `Stop` fires after each turn and carries the assistant text | Codex-style: a payload shape plus `--client muse` | Small |
| `Stop` fires after each turn with a transcript path only | Antigravity-style: a transcript reader | Medium |
| `Stop` fires only at session end | Read the whole session log at `SessionEnd`. Capture stops being incremental, which is a spec question before it is a code question. | Medium, needs a spec decision |
| No hook gives access to the reply | Recall only: a getting-started section, no capture | Docs only |

Capture is only viable if two more answers come back right: a hook failure must not block or abort
the user's turn (the fail-open rule in the host-integration section; otherwise rutter's hook is a liability), and some instruction channel must reliably
make the model emit directives without editing project files. If either fails, fall back to recall only.

Whatever the path, the installer follows the [host-integration rules](./memory-of-use.md#host-integration).
Here that means baking in the vault path and an absolute `node` (the environment is cleared), touching
only `settings.json` and the user rules file, and registering the server as `optional`.

## Open risks

- The product is about ten weeks old and its docs are thin. Hook payloads may change between releases.
  Pin the probed version in this file.
- The install route (`curl | sh`, no package manager) makes it awkward to automate a scratch install in CI. The live check stays manual.
