# Changelog

Notable changes to rutter, newest first. Detailed per-ship records — grounds,
disclosed gaps, and what is being watched — live under
`efforts/<effort>/shipped/<ship>/comms/`.

## 2026-10-01 — Codex as a capture host

Codex fires the same Stop hook after each turn; `capture-cli` now reads its event.

### Added

- **`capture-cli` reads Codex's `last_assistant_message`.** Grok's camelCase
  `lastAssistantMessage` is used when it is a string, otherwise Codex's snake_case
  field. One shared selector serves both the session and position paths; sources
  are never concatenated, and a real Claude transcript directive still wins.
- **`npm run install-hook -- --client codex`** merges the hook into
  `~/.codex/hooks.json` (idempotent, refuses malformed config, reports an
  equivalent registration in `config.toml`). The no-argument form still targets
  Claude's settings. Installing does not trust the hook; review it with `/hooks`.
- `CODEX-1..7` and installer tests, run against temp vaults and config dirs.

### Verified

- Codex 0.160.0 accepts the wrapper's empty stdout with exit 0, so no
  Codex-specific JSON wrapper was needed. A real turn captured both a session
  summary and a position, one entry each.

### Known limits

- **Final message only.** Codex's rollout file keeps assistant text under
  `payload.content`, which the Claude transcript reader does not read, so a
  directive emitted only in earlier commentary is not recovered.

## 2026-09-01 — Grok as a capture host

Ambient capture is no longer Claude Code only. Grok fires the same Stop hook
(both hosts read `~/.claude/settings.json`), so the one adapter change makes the
directive land from either.

### Added

- **`capture-cli` reads the Grok Stop envelope.** When a `transcript_path`
  extract yields no directive, both the session path (`resolveDirective`) and the
  position path (`positionDirectiveSourceText`) fall through to the Stop event's
  `lastAssistantMessage` field — the assistant text Grok sends, where Claude's
  `transcript_path` points at an ACP `updates.jsonl` stream that carries no
  directive in `message.content`. A real Claude transcript still wins and never
  consults `lastAssistantMessage`; the substitution only ever reaches a source
  the transcript extract already found empty, so it cannot narrow the Claude scan.
- Seven tests pinning the Grok path (`GROK-1..6`, `GROK-5`/`GROK-5b`) across
  `test/capture.test.ts` and `test/position-cli.test.ts`, including the
  transcript-wins precedence guard the fixtures exist to hold.
- `docs/grok-stop-adapter.md` — the design record, including the real-Claude-wire
  verification (camel `lastAssistantMessage` is absent on the Claude envelope, so
  the subset invariant cannot fail there).

### Changed

- Server instructions and docs generalized from "Claude Code sessions" to AI
  coding sessions, and the "Stop hook is Claude Code specific" claim corrected to
  "Claude Code and Grok" — both write to, and recall from, the one shared store.

### Known limits

- **Grok's `lastAssistantMessage` is clipped at 32,768 characters.** A long Grok
  turn can drop a trailing directive; Claude reads the whole transcript and has no
  such clip. The `chat_history.jsonl` file scan that closes this gap is designed
  but deferred (v2 in the adapter doc).
