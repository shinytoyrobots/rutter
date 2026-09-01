# Changelog

Notable changes to rutter, newest first. Detailed per-ship records — grounds,
disclosed gaps, and what is being watched — live under
`efforts/<effort>/shipped/<ship>/comms/`.

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
