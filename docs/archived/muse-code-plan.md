---
type: plan
status: implemented
created: 2026-10-15
domain: ops
---

# Meta Muse Code support for rutter

**Status:** probed 2026-10-18 and built. Capture and recall both work; see the probe results and
"What shipped" below. The probe section is kept as the evidence for the design.

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
| Malformed hook config | Two cases. Malformed project or managed hook files produce a startup warning. A malformed **user** `settings.json` fails settings validation, which may stop Muse from starting at all. The fix only takes effect in a new session. The probe edits user settings, so it must back them up first (step 4). |
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
4. **Event dump.** First copy `~/.config/muse/settings.json` (and any user rules file the probe
   will touch) to a backup, with checksums, and validate every edit before launching Muse: a
   malformed user settings file can stop Muse from starting. Then add user-level hooks in the
   `hooks` block for `Stop`, `StopFailure`, `SessionEnd` and `PostLLMCall`. Each runs one wrapper
   script that appends one JSON line per invocation to a per-event file
   (`<scratch>/muse-probe/<event>.jsonl`): timestamp, event name, PID, the hook's exit code, and the
   raw stdin verbatim. Append, never overwrite. Because the environment is cleared, use absolute
   paths for `node` and the dump directory. Re-run the install step once to see whether entries
   duplicate.
   - **Turn isolation.** Run at least these turns in one session, in order: (a) a turn whose
     assistant reply plants a `librarian-session` line; (b) a turn with **no** directive anywhere
     (a stale capture would return (a)'s line); (c) a turn where the directive appears only in the
     user's input; (d) a turn where it appears only in tool output (for example, `cat` a file that
     contains one). Only (a) should ever be captured. Record the role/type fields and the turn
     boundary marker (turn ID, sequence number or similar) that let a reader exclude user, tool and
     earlier-turn records.
   - **Transcript readiness.** Inside the `Stop` hook itself, snapshot the transcript file (copy it,
     with size and mtime) at invocation, then compare it with the finished session log. Do this for
     a short reply, a long reply, and a tool-using turn. Record whether the final assistant message
     was present at invocation. If it is absent, keep that snapshot as evidence and poll the
     live transcript path (not the snapshot, which never changes) at fixed intervals up to a
     bounded limit, for example 5 seconds, saving each observation (size, mtime, whether the final
     message is present). Poll both inside the hook and from a detached child after the hook
     returns, since Muse may not flush until the hook exits. Record whether any signal marks
     completion (a trailing record type, a flush, a later event such as `SessionEnd`). The Copilot probe found the
     final message missing at hook time on 10/10 turns, so a log read after the session ends proves
     nothing.
5. **Failure semantics.** Test two layers separately, in separate sessions.
   - **Raw hook.** Swap the `Stop` hook for one that exits 1, one that exits 2, and one that sleeps
     past any timeout. Record what the user sees and whether the turn, the next turn and the
     session continue.
   - **Production-style wrapper.** Repeat with a copy of `hooks/librarian-stop.sh` whose capture
     command is replaced by a failing, crashing and hanging child, and with a bounded child timeout
     added (the shipped wrapper has none, so a hung child would hang the hook). The wrapper already
     converts child failure to exit 0; record whether that is enough.
   - **Host-level failures.** Record separately any failure the wrapper cannot contain, such as the
     host failing to launch it (missing or non-executable script, bad path, cleared `PATH`).
6. **Instruction delivery.** Start a fresh session in a scratch git repo, do an ordinary small task
   with no planting, and check whether a directive appears. Repeat with the instruction in the
   user-level rules file (find its path first), then again in a repo that has its own `AGENTS.md`.
7. **Preserve evidence before cleanup.** Copy the dump directory, the session ID(s), the Muse
   version, and the session-log file(s) into the probe record. Then restore `settings.json` and the
   user rules file from the step 4 backups (not by hand-removing entries), verify the checksums
   match the originals, and confirm Muse still starts.
8. Record the answers to the six questions above in a probe table in this file.

## Probe results (2026-10-18, Muse Code 1.4.10-R6427.1)

Run with `muse exec` (headless, one turn per session) and a pty-driven TUI session (three turns). Not yet
run: installer idempotence, a Muse-native user rules file, `PostLLMCall` payload analysis, the
`hook-dump` wrapper under the TUI for tool-using turns.

| # | Question | Answer |
|---|---|---|
| 1 | When does `Stop` fire? | After **each turn**. One TUI session, three prompts: three `Stop` records, same `session_id`, distinct `turn_id`. `SessionEnd` fires at the end of `exec` runs but did **not** fire when the TUI's pty closed, so it is not reliable. |
| 2 | `Stop` stdin | JSON: `hook_event_name`, `stop_hook_active`, **`last_assistant_message`**, `session_id`, **`turn_id`**, `cwd`, `transcript_path` (always `null`), `model`, `permission_mode`. Same shape as Codex's payload. |
| 3 | Hook schema | The Claude-style shape is accepted: `hooks.<Event>: [{ "hooks": [{ "type": "command", "command": "..." }] }]`. The docs do not specify it. Muse rewrote `mcp_servers` as `mcpServers` in `settings.json`; both keys were accepted. Merge and idempotence **not tested**. |
| 4 | Failure semantics | Exit 1 and exit 2: fail-open (turn completes, no warning, no continuation, `stop_hook_active` stays false). A **hung** hook blocks Muse for its full duration (307 s for a 300 s sleep): the wrapper needs a bounded child timeout. |
| 5 | Session log | `~/.local/share/muse/sessions/YYYY/MM/DD/<session-id>/session.jsonl`, a record stream (`record_type`, `payload_type`, `sequence`, some wrapped in `children`). `muse export` is the supported reader. Not needed for capture. |
| 6 | Instruction delivery | Server `instructions` alone did **not** produce a directive on an ordinary task. A canary rule in **`~/.config/muse/AGENTS.md`** was loaded as a user-level rule (3 of 3 runs in a repo without a project `AGENTS.md` or in a trusted one, but only 1 of 4 in an **untrusted** repo that has its own `AGENTS.md`). Muse also imports the user's global `~/.claude/CLAUDE.md`, which helps only Claude Code users. |

Also: the hook environment is cleared to `HOME, LANG, LOGNAME, MUSE_SESSION_ID, MUSE_THREAD_ID, PATH, PWD,
SHELL, TERM, TMPDIR, USER` and a few shell variables, so `LIBRARIAN_VAULT_PATH` is not passed. Replaying the
recorded `Stop` payloads through `hooks/librarian-stop.sh` captured exactly the turn that carried a directive;
no-directive, user-input-only, tool-output-only and long-reply turns captured nothing. A `muse` binary from
cmux was not on PATH in the probe shell.

**Verdict:** the capture gate passes. The instruction gate passes only conditionally: the user-level rules file
loaded in every run in a repo without a project `AGENTS.md` and in a trusted one, but in just 1 of 4 runs in an
**untrusted** repo that has its own `AGENTS.md`, so instruction delivery stays unresolved there. The wrapper is
fail-open once it bounds its child (a raw hung hook is not). Live check with the shipped installer and a
throwaway vault: four of five ordinary tasks produced a captured entry labeled `muse`, and the small-talk turn
correctly produced none. Muse support ships as capture plus recall, with that caveat documented.

## What shipped

- `muse` joins `CLIENTS` as an explicit-only label (the payload shape is the same as Claude's and Codex's).
- `hooks/librarian-stop.sh` now runs the capture under `hooks/supervise-capture.mjs`, a small Node supervisor
  that owns the child and a wall-clock limit (`LIBRARIAN_CAPTURE_TIMEOUT_SEC`, default 20 s, positive number
  up to 600; TERM, then KILL after 2 s), discards the child's stdout, and always exits 0. An earlier shell
  watchdog, then a `ps` poll, were both replaced after review found races and a dependency on `ps`. The
  wrapper also accepts `LIBRARIAN_NODE` and appends the system directories to a bare `PATH`. This changes the
  hook for every client: each capture now starts one extra Node process.
- `install-hook --client muse` merges into `~/.config/muse/settings.json` (hook, plus the `rutter` server
  with `mode: optional`, under whichever of `mcp_servers` / `mcpServers` the file already uses) and adds a
  marked block to `~/.config/muse/AGENTS.md`. It bakes in the vault and an absolute node, is idempotent, and
  refuses unparseable files, symlinks, a `rutter` server that is not this package's, and marker words outside
  one well-formed block (CommonMark-style fences, an unclosed fence included), all before writing. It treats
  only the exact command it generates as its own and a server only if it is `node` running rutter-memory's
  `dist/stdio.js`; both files are staged with unique exclusive temp files plus an undo copy, re-checked just
  before each rename, and rolled back by atomic rename. Adversarial review
  (Codex, PR #113) drove this hardening.
- Getting-started has a Muse Code path, including the `muse` name collision.

## Still unverified

- A project `AGENTS.md` in an **untrusted** workspace may suppress the user-level rule (1 of 4 runs loaded it).
- `SessionEnd` did not fire when a TUI pty closed, so nothing depends on it.
- Muse's own rewrite of `settings.json` renames `mcp_servers` to `mcpServers`; the installer accepts both.
- Whether Muse honors a `timeout` field on a hook entry: untested, so the installer does not write one.
- Behavior on Muse versions other than 1.4.10.
- A narrow window between the installer's last re-check and its rename, if Muse saves `settings.json` in it.
- Huge `Stop` payloads through the wrapper.
- The installer's rollback path is reviewed but has no integration test that forces a rename failure.

## Decision after the probe

| Probe result | Path | Size |
|---|---|---|
| `Stop` fires after each turn and carries the assistant text | Codex-style: a payload shape plus `--client muse` | Small |
| `Stop` fires after each turn with a transcript path only | Antigravity-style: a transcript reader. Only if the final message is complete at hook time, or a bounded completion signal was observed, **and** the current turn can be isolated from user, tool and earlier-turn records. | Medium |
| `Stop` fires only at session end | Read the whole session log at `SessionEnd`. Capture stops being incremental, which is a spec question before it is a code question. | Medium, needs a spec decision |
| No hook gives access to the reply | Recall only: a getting-started section, no capture | Docs only |

Capture is only viable if two more answers come back right. First, the **production-style wrapper**
(with a bounded child timeout) must not block or abort the user's turn, even when the capture
process fails or hangs (the fail-open rule in the host-integration section; otherwise rutter's hook
is a liability). A raw hook that blocks on non-zero exit does not fail this gate by itself, because
the wrapper contains that. Failures the wrapper cannot contain (the host failing to launch it) are
separate evidence and do fail it if they block the turn. Second, some instruction channel must
reliably make the model emit directives without editing project files. If either fails, fall back to
recall only.

Whatever the path, the installer follows the [host-integration rules](../memory-of-use.md#host-integration).
Here that means baking in the vault path and an absolute `node` (the environment is cleared), touching
only `settings.json` and the user rules file, and registering the server as `optional`.

## Open risks

- The product is about ten weeks old and its docs are thin. Hook payloads may change between releases.
  Pin the probed version in this file.
- The install route (`curl | sh`, no package manager) makes it awkward to automate a scratch install in CI. The live check stays manual.
