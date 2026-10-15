---
type: plan
status: proposal
created: 2026-10-15
domain: ops
---

# GitHub Copilot CLI support for rutter

**Status:** proposal, not built. Can start now.

**Why this one first:** the visibility assessment of 2026-10-15 ranked Copilot CLI the strongest
missing harness for capture (Factory Droid second). It has the largest installed base of any
terminal agent rutter doesn't yet support, and its hook system is documented.

## What "supported" means

Same bar as Codex and Antigravity:

1. **Recall:** the four `librarian-*` tools work from a Copilot CLI session.
2. **Capture:** after each turn, a `librarian-session` (or `librarian-position`) line the model
   wrote lands in the vault, labeled with the client `copilot`.
3. **Setup:** `rutter-memory install-hook --client copilot` installs capture, and
   getting-started has a Copilot CLI path.

## What the docs say (research 2026-10-15, docs.github.com; `@github/copilot` 1.0.99)

Read through a summarizing fetch. Every field name below gets confirmed in Step 0 before code depends on it.

| Need | Copilot CLI |
|---|---|
| MCP registration | `~/.copilot/mcp-config.json`, or `copilot mcp add rutter -- npx -y rutter-memory`. Stdio entry: `{ "type": "local", "command", "args", "env", "tools": ["*"] }`. |
| User-level hooks | `~/.copilot/hooks/*.json` (or `$COPILOT_HOME/hooks/`). Every file is loaded and they combine, so rutter can own a file of its own. |
| Hook file schema | `{ "version": 1, "hooks": { "agentStop": [ { "type": "command", "bash": "…", "timeoutSec": 30 } ] } }` |
| After-each-turn event | `agentStop` (alias `Stop`). |
| `agentStop` stdin | camelCase: `sessionId`, `timestamp` (Unix ms), `cwd`, `transcriptPath`, `stopReason` (`"end_turn"`), `stop_hook_active`. **No assistant text.** A VS Code-format variant uses snake_case `session_id`, `transcript_path`, `stop_reason`. |
| Exit codes | 0 is success. Any other non-zero code is logged and the turn continues (fail-open). A timeout kills the hook, also fail-open. |
| Transcript | `~/.copilot/session-state/<sessionId>/events.jsonl`. Undocumented. Third-party sources list `assistant.message` and `assistant.turn_start` / `assistant.turn_end` events. |
| Server `instructions` | Undocumented whether they reach the model. |
| Plugins | `plugin.json` can bundle hooks plus an MCP config, installed with `copilot plugin install`. |

This is the Antigravity situation: a hook that fires after each turn and gives a transcript path
but not the reply. The capture path reuses that design. It reads the current turn's assistant text
from the transcript and hands it to the existing message parser.

## Step 0 — Probe (half a session, gates everything else)

Install `@github/copilot` into a scratch npm prefix. Add a throwaway user hook that writes its
stdin to a scratch file. Run one turn in which the model writes a planted
`<!-- librarian-session … -->` line. Record:

- [ ] Does `agentStop` fire once per turn? Does it fire again on `/exit`?
- [ ] Which payload casing reaches a user-level command hook: camelCase, snake_case, or both? Is `transcriptPath` present?
- [ ] Where does the transcript live, and what records hold the final assistant text? How is the current turn bounded (the last user-message event, or `assistant.turn_start`)?
- [ ] Is the transcript fully written by the time `agentStop` fires, or does the last message land late?
- [ ] Does the model see rutter's server `instructions`? Test: with the MCP server registered and no other instruction, does the model emit a session line unprompted?
- [ ] Does `$COPILOT_HOME` move the hooks folder as documented?

Write the results into this file as a probe table, as `grok-stop-adapter.md` does. The hook gets removed after the read.

**If `transcriptPath` is absent:** derive `~/.copilot/session-state/<sessionId>/events.jsonl`, honoring
`$COPILOT_HOME`. **If the transcript holds no assistant text at all:** stop and re-plan. That is
the only result that kills capture for v1. Recall-only support still ships.

## Step 1 — Capture (`src/capture-cli.ts`, `src/client.ts`)

- Add `copilot` to `CLIENTS` and the classification table in `src/client.ts`.
- **Route on the explicit identity first.** The installer passes `--client copilot`. When that
  identity is present, use the Copilot reader whatever the payload casing. This avoids the Grok trap:
  a snake_case `transcript_path` that points at a non-Claude transcript would send the payload
  down the Claude path and capture nothing, silently.
- Add a payload shape check as well: `sessionId` + `transcriptPath` + `stopReason`, with no
  `conversationId` (that's Antigravity's key). It catches an unlabeled hook. If it can't be told
  apart from Grok or Antigravity with confidence, leave the record unlabeled rather than guess.
- `normalizeCopilot(p)` → `{ session_id, cwd, last_assistant_message }`. It works like
  `normalizeAntigravity`: read the transcript once, keep the assistant text after the current turn's
  boundary, and fail closed with one stderr line if the file is unreadable or the format isn't recognized.
- `stop_hook_active`: capture anyway. rutter's hook never blocks, so it can't cause re-entry. If
  another hook forces a continuation, the second `agentStop` re-reads the same turn. The existing
  no-duplicate guard (SR-013) has to hold there, and a test pins it.

## Step 2 — Installer (`hooks/install-hook.mjs`)

- `--client copilot` writes `$COPILOT_HOME/hooks/rutter.json` (default `~/.copilot/hooks/`).
  The installer owns that file outright, so it never parses or merges the user's own hook files.
  That's simpler and safer than the Claude `settings.json` merge.
- The command is `<prefix>/hooks/librarian-stop.sh --client copilot`, the same as other clients. Running it again rewrites the file, so the installer is idempotent.
- The vault comes from `LIBRARIAN_VAULT_PATH`, the same as Codex. If Step 0 shows the hook gets a
  cleared environment, use Antigravity's baked-in `--vault` instead.
- Print the matching MCP registration (`copilot mcp add …`) for the user to run. Having the installer
  register the server stays out of scope (see `npm-plan.md`).

## Step 3 — Docs and release

- getting-started: a "Copilot CLI path" section between Codex and Antigravity.
- README: add Copilot CLI to the client list.
- If Step 0 shows server instructions don't reach the model: document a line for Copilot's custom
  instructions file, so the model knows to write session lines.
- Port the changed docs to the gh-pages site (hand-ported HTML plus the `sources.json` rehash).
- Release as v0.7.0. A new client is a feature, and it ships through the usual release process.

## Tests

- `test/copilot-capture.test.ts`: camelCase payload, snake_case payload with `--client copilot`,
  missing transcript, unrecognized format, a directive from an earlier turn that must not be
  re-captured, a second `agentStop` on the same turn, and a position line.
- `test/install-hook.test.ts`: writes `rutter.json` under a scratch `COPILOT_HOME`, re-running is
  idempotent, and the user's other hook files are untouched.
- `test/client-label.test.ts`: a classification row for `copilot`.
- Live check: recall and capture from a real Copilot turn, plus one other client (the
  personal-projects rule about testing with multiple MCP clients).

## Later, not v1

- **Copilot plugin:** a `plugin.json` that bundles the hook and the MCP config, so setup is one
  `copilot plugin install`. A listing in the default copilot-plugins marketplace is also a
  visibility channel. Worth its own plan once v1 capture is proven.

## Open risks

- Every payload field comes from a summarizing fetch of docs that changed as recently as v1.0.72.
  Step 0 exists for this reason.
- The `events.jsonl` format is undocumented and reportedly varies by model family. The reader must
  fail closed, and the probe should run one turn on a Claude model and one on a GPT model.
