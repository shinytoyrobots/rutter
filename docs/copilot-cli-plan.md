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
| MCP registration | `~/.copilot/mcp-config.json`, or `copilot mcp add rutter -- npx -y rutter-memory`. Stdio entry: `{ "type": "local", "command", "args", "env", "tools": ["*"] }`. A local server inherits only `PATH` from the environment. Every other variable, `LIBRARIAN_VAULT_PATH` included, has to be set in `env` (add-mcp-servers how-to, checked 2026-10-15). |
| User-level hooks | `~/.copilot/hooks/*.json` (or `$COPILOT_HOME/hooks/`). Every file is loaded and they combine, so rutter can own a file of its own. |
| Hook file schema | `{ "version": 1, "hooks": { "agentStop": [ { "type": "command", "bash": "…", "timeoutSec": 30 } ] } }` |
| After-each-turn event | `agentStop` (alias `Stop`). |
| `agentStop` stdin | camelCase: `sessionId`, `timestamp` (Unix ms), `cwd`, `transcriptPath`, `stopReason` (`"end_turn"`), `stop_hook_active`. **No assistant text.** A VS Code-format variant uses snake_case `session_id`, `transcript_path`, `stop_reason`. |
| Exit codes | 0 is success. Any other non-zero code is logged and the turn continues (fail-open). A timeout kills the hook, also fail-open. |
| Transcript | `~/.copilot/session-state/<sessionId>/events.jsonl`. Undocumented. Third-party sources list `assistant.message` and `assistant.turn_start` / `assistant.turn_end` events. |
| Server `instructions` | Loaded lazily by default. The CLI reference, for `--allow-all-mcp-server-instructions`: "By default, only allowlisted server instructions are included up front; other servers' instructions are retrieved on demand." The model may not see rutter's capture contract until it calls a rutter tool, and many sessions never do. Where the allowlist lives is not yet known. |
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
- [ ] Where does the transcript live, and what records hold the final assistant text? How is the current turn bounded (the last user-message event, or `assistant.turn_start`)? Does the user-message event echo text the user typed, such as a pasted directive template?
- [ ] Is the transcript fully written by the time `agentStop` fires, or does the last message land late? Check over at least ten turns, including a long reply and a turn that ends right after a tool call.
- [ ] Instruction delivery, in a fresh session. Register the server, start a new session, and give a real task that doesn't need rutter (for example, a small refactor). Make sure no rutter tool is called. Does the model write a session line? Then repeat with each candidate setup: `--allow-all-mcp-server-instructions`, the allowlist if one can be configured per user, and a line in Copilot's user-level custom-instructions file. Record which setups work without a per-launch flag.
- [ ] Does `$COPILOT_HOME` move the hooks folder as documented?
- [ ] Does the hook's environment carry the user's `PATH`? `librarian-stop.sh` calls bare `node`, which nvm users only have on an interactive `PATH`. Does `LIBRARIAN_VAULT_PATH` from the launching shell survive?
- [ ] Do user-level hooks fire in a repository Copilot hasn't been told to trust? Does a repository's own hook config replace the user-level hooks or run alongside them?

Write the results into this file as a probe table, as `grok-stop-adapter.md` does. The hook gets removed after the read.

### Probe results (2026-10-15, Copilot CLI 1.0.98, macOS)

Run with the installed CLI, not a scratch prefix, because a scratch `COPILOT_HOME` was tested separately below.
Only `gpt-6-luna` is available on this account, so the GPT-versus-Claude transcript comparison was not run.
All turns used non-interactive `-p`. The sandbox the probe ran in has no pseudo-terminal, so no interactive turn was probed.
The throwaway hook was removed afterwards.

| Question | Finding |
|---|---|
| `agentStop` once per turn? | Yes: 10 hook calls for 10 turns in one resumed session, plus 8 more in later runs. Within a turn the model can produce several `assistant.turn_start`/`turn_end` pairs (one per tool round), but `agentStop` fires once, at the end. With `-p`, process exit doesn't fire an extra one. `/exit` in interactive mode: not probed. |
| Payload casing | camelCase only: `sessionId`, `timestamp` (Unix ms), `cwd`, `transcriptPath`, `stopReason: "end_turn"`. The one snake_case key is `stop_hook_active: false`. `transcriptPath` was present on every call. |
| Transcript location | `$COPILOT_HOME/session-state/<sessionId>/events.jsonl`. Every record has the shape `{ type, data, id, parentId, timestamp }`. |
| Final assistant text | `assistant.message` records, `data.content`. The last one in a turn has `data.phase: "final_answer"`; earlier ones (tool-call rounds) have no phase and carry `toolRequests`. |
| Turn boundary | `user.message.data.interactionId`. Every `assistant.message` in that turn carries the same `interactionId`, so the current turn is "assistant messages whose `interactionId` equals the last user message's". It is a record field, not a position guess. |
| User message echoes text | Yes. `user.message.data.content` and `transformedContent` hold the typed prompt verbatim, directive lines included. Filtering to `assistant.message` is required. |
| `hook.start` in the transcript | Copilot writes a `hook.start` record whose `data.input` is the hook's own stdin payload, including the same `timestamp`. It is written after the turn's last `assistant.message` and `assistant.turn_end`. |
| Complete when `agentStop` fires? | **No.** A copy taken the instant the hook started missed the current turn's assistant message on 10 of 10 turns; the file ended at `assistant.turn_start`. The records are timestamped before the hook starts, but the file write lags. Polling inside the hook found the rest within 50–100 ms on 8 of 8 turns (short, ~900-word, and tool-call turns). Once the matching `hook.start` (same `data.input.timestamp`) was in the file, the current turn's directive was present every time. |
| Instruction delivery | See the gate 4 table below. |
| `$COPILOT_HOME` | Moves both `hooks/` and `session-state/`. Hooks under `~/.copilot/hooks` did not fire when `COPILOT_HOME` pointed elsewhere. Copilot also exports `COPILOT_HOOK_DIR` to the hook. |
| Hook `PATH` | The full launching-shell `PATH` (Homebrew `node` resolved). `LIBRARIAN_VAULT_PATH` from the launching shell reached the hook unchanged. nvm-only `node` was not tested. |
| Untrusted repo / repo hooks | User-level hooks fired in an untrusted scratch folder and an untrusted scratch git repo. That repo's own `.github/hooks/repo.json` did not fire, so it didn't replace the user hook. Trusted-repo behavior (alongside or instead) was not probed. |

**Gate 4 runs.** Each run was a fresh session with rutter registered for that session only through `--additional-mcp-config`. The task was the same each time: read `config.js` and decide whether a retry count should stay at 3 or become 5. No rutter tool was called in any run.

| Setup | Contract in the system prompt? | Session line written? |
|---|---|---|
| A. Server registered, nothing else (2 runs) | No. Loaded lazily, as the docs say. | 0 of 2 |
| B. `--allow-all-mcp-server-instructions` (2 runs) | Yes | 0 of 2 |
| C. Contract in `~/.copilot/copilot-instructions.md`, no flag (2 runs) | Yes. The file loaded and the server's text loaded too. | 0 of 2 |

No per-user setting for the server-instructions allowlist turned up in `copilot help config` or `copilot help environment`.

### Gate verdicts

1. **Holds.** Every turn's assistant text is in the transcript, and `transcriptPath` is always sent.
2. **Fails as written.** The text is not in the file when the hook starts. The probe does support a fix: the reader waits until the `hook.start` record matching this payload's `timestamp` appears, then reads. Copilot writes that record after the turn's messages, so its presence means the turn is on disk. The wait is bounded, for example 3 s of 50 ms polls against the 30 s hook timeout. If the time runs out, the reader fails closed with one stderr line. This needs a review before it is built.
3. **Holds,** through `interactionId`.
4. **Fails in non-interactive mode on `gpt-6-luna`.** Setups B and C both put the contract in front of the model, so delivery works, but the model didn't follow it. Interactive mode and Claude models are still untested, and interactive is how people use Copilot day to day. By this plan's rule, capture is not built until a setup passes.

**Gates.** Capture is built only if all four hold. Recall-only support ships either way.

1. **The transcript holds the current turn's assistant text.** If `transcriptPath` is absent, derive
   `~/.copilot/session-state/<sessionId>/events.jsonl`, honoring `$COPILOT_HOME`.
2. **That text is complete when `agentStop` fires,** on every probed turn. If the last message
   sometimes lands late, the single read in Step 1 loses captures. Stop and re-plan; a bounded
   retry or a read on the next turn's hook are the candidates, and both need their own design.
3. **The current turn can be bounded reliably** by a record type, not by guessing from position.
   If not, an earlier turn's directive could be captured again or shadow the current one. Stop and re-plan.

4. **At least one setup delivers the capture contract in a fresh session.** "Delivers" means it
   passes the fresh-session test above: a real task, no rutter tool called, and a session line is
   written. Step 3 documents the setup that passed, preferring one with no per-launch flag. If every
   candidate fails, the custom-instructions line included, ship recall-only and re-plan capture.
   Documenting a setup that failed the test does not count.

## Step 1 — Capture (`src/capture-cli.ts`, `src/client.ts`)

- Add `copilot` to `CLIENTS`. Add a `copilot` shape column and a `copilot` row to the
  classification table in `src/client.ts`, and decide every new cell in the table itself. The
  likeliest mistake is the cell for an explicit `claude` identity on a Copilot-shaped payload.
- **Route on the explicit identity first.** The installer passes `--client copilot`. When that
  identity is present, use the Copilot reader whatever the payload casing. This avoids the Grok trap:
  a snake_case `transcript_path` that points at a non-Claude transcript would send the payload
  down the Claude path and capture nothing, silently.
- **One resolver, two separate answers.** Today `main` in `src/capture-cli.ts` picks the reader from
  the payload shape, and `classifyClient` picks the label from shape plus identity. Routing on
  identity adds a second input to the reader choice, so put both in one resolver that returns
  `{ reader, client }` as separate fields. Don't derive the reader from the label: an undefined
  label means "attribution uncertain", not "no reader". For example, an Antigravity envelope with a
  conflicting `--client codex` must still go through the Antigravity adapter and be captured
  without a label (pinned by `test/client-label.test.ts`, "codex identity on an Antigravity
  envelope is a conflict"). The same rule holds for a Copilot-shaped payload with a conflicting identity.
- Add a payload shape check as well: `sessionId` + `transcriptPath` + `stopReason`, with no
  `conversationId` (that's Antigravity's key). It catches an unlabeled hook. If it can't be told
  apart from Grok or Antigravity with confidence, leave the record unlabeled rather than guess.
- `normalizeCopilot(p)` → `{ session_id, cwd, last_assistant_message }`. It works like
  `normalizeAntigravity`: read the transcript once, keep only assistant-message records after the
  current turn's boundary, and fail closed with one stderr line if the file is unreadable or the
  format isn't recognized. Filtering on assistant records matters because a user message can echo
  a directive template. The result must not carry `transcript_path`. If it did, `resolveDirective`
  would run the Claude transcript reader over `events.jsonl` before reaching the Copilot text.
- `stop_hook_active`: capture anyway. rutter's hook never blocks, so it can't cause re-entry. If
  another hook forces a continuation, the second `agentStop` re-reads the same turn. The existing
  no-duplicate guard (SR-013) has to hold there, and a test pins it.

## Step 2 — Installer (`hooks/install-hook.mjs`)

- `--client copilot` writes `$COPILOT_HOME/hooks/rutter.json` (default `~/.copilot/hooks/`).
  It never parses or merges the user's other hook files.
- **A filename doesn't prove ownership.** If `rutter.json` already exists, replace it only when it is
  recognizably ours: valid JSON, `version: 1`, and exactly one `agentStop` entry whose command
  matches the shape the installer writes. The existing command matcher in `install-hook.mjs`
  already recognizes that shape, including a copy left at an old install path. Anything else, such
  as hand-edited hooks, other events, or unparseable JSON, means refuse with a message and change nothing.
- The command is `<prefix>/hooks/librarian-stop.sh --client copilot`, the same as other clients.
  Running the installer again rewrites a file it owns, so it is idempotent.
- **Recall and capture must use the same vault.** The hook can inherit `LIBRARIAN_VAULT_PATH`, but
  the MCP server can't: Copilot passes only `PATH` to it. So the printed registration always carries
  the vault explicitly: `copilot mcp add --env LIBRARIAN_VAULT_PATH=<vault> rutter …`, the same
  as Antigravity's printout. The installer prints which vault the hook will use, and the getting-started
  check confirms that a recalled note and a captured session land in the same folder.
- If Step 0 shows the hook gets a cleared environment, bake the vault into the hook command the way
  Antigravity does. That also means widening the `--vault` guard in `install-hook.mjs`, which today
  rejects `--vault` for every client other than antigravity, and the client check beside it.
- Having the installer register the server stays out of scope (see `npm-plan.md`).

## Step 3 — Docs and release

- getting-started: a "Copilot CLI path" section between Codex and Antigravity.
- README, the `package.json` description, and any client list in the plugin manifest: add Copilot CLI.
- Document the instruction-loading setup that passed gate 4, as a required step in the Copilot path, not a tip.
- Port the changed docs to the gh-pages site (hand-ported HTML plus the `sources.json` rehash).
- Release as v0.7.0. A new client is a feature, and it ships through the usual release process.

## Tests

- `test/copilot-capture.test.ts`: camelCase payload, snake_case payload with `--client copilot`,
  missing transcript, unrecognized format, a directive from an earlier turn that must not be
  re-captured, a directive template echoed in a user message that must not be captured, a second
  `agentStop` on the same turn, a position line, and a snake_case payload whose normalized form
  carries no `transcript_path`.
- `test/install-hook.test.ts`: writes `rutter.json` under a scratch `COPILOT_HOME`, re-running is
  idempotent, and the user's other hook files are untouched. Collision: an existing `rutter.json`
  that isn't ours (an extra hook, another event, invalid JSON) makes the installer refuse and leaves
  the file byte-for-byte unchanged. The printed MCP registration carries `LIBRARIAN_VAULT_PATH`.
- `test/client-label.test.ts`: every new cell in the classification table. Conflicts: a
  Copilot-shaped payload with a conflicting identity is captured through the Copilot reader with no
  label, and the existing Antigravity-with-`--client codex` test still passes unchanged.
- Live check, in a fresh session: a real task with no rutter tool call yet, using the documented
  instruction setup, must produce a capture. Then recall from the same session, confirming it reads the
  vault capture wrote to. Repeat recall on one other client (the personal-projects rule about
  testing with multiple MCP clients).

## Later, not v1

- **Copilot plugin:** a `plugin.json` that bundles the hook and the MCP config, so setup is one
  `copilot plugin install`. A listing in the default copilot-plugins marketplace is also a
  visibility channel. Worth its own plan once v1 capture is proven.

## Open risks

- Every payload field comes from a summarizing fetch of docs that changed as recently as v1.0.72.
  Step 0 exists for this reason.
- The `events.jsonl` format is undocumented and reportedly varies by model family. The reader must
  fail closed, and the probe should run one turn on a Claude model and one on a GPT model.
