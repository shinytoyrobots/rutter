# Changelog

Notable changes to rutter, newest first. Detailed per-ship records — grounds,
disclosed gaps, and what is being watched — are kept by the maintainer
outside this repository.

## Unreleased

- **The index builds itself.** Installed as a plugin there is no clone and no
  `npm run reindex`, so a fresh install answered every search with "No notes
  matched". The server now builds its index when it starts if none exists, and
  rebuilds it only when your notes, session records or position streams have
  changed since the last build. It never replaces a good index with an empty one
  when the notes folder is missing or unreadable.
- **Capture instructions no longer get cut off.** Claude Code truncates server
  instructions at 2,048 characters, and ours were about 4,250: the style contract,
  the "describe only what is new" rule and the whole position-line instruction
  never reached the client. The instructions now fit, with everything needed to
  capture inside the limit. The guidance for reporting recalled summaries and
  stances moved into the descriptions of `librarian-recent` and
  `librarian-positions`. If you wondered why no positions were being captured,
  this is the likely reason.

## v0.2.0 — 2026-10-01

The first release since v0.1.0 (2026-08-04). Three things changed for users:

- **Positions.** rutter now records the stances your client forms, not just
  what a session did, and answers "what do I think about X?" with the new
  `librarian-positions` tool — four MCP tools in all.
- **Refs survive renames.** A note recorded in memory-of-use is followed
  across a rename instead of going dead.
- **Capture runs on Claude Code, Grok, and Codex.**

Per-change detail follows, newest first. Footers on the published site cite this
tag from this release on.

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

## 2026-08-13 — Positions: capture and recall

Decision-graph Phases A and B. Records of what you *decided* now sit beside
records of what you *did*. Both shipped as gated ships (ship-2026-08-13-0001,
-0002); the disclosed gaps and watches are in their ship records.

### Added

- **Position capture.** When your client forms, changes, reaffirms, or retires a
  stance on a topic, it leaves a `librarian-position` directive. The Stop hook
  appends it to `<notes>/_librarian/positions/<YYYY-MM>.md`, a separate
  append-only stream from session records. Routed by directive kind alone, stored
  byte-verbatim, idempotent per distinct directive. A turn with both a session
  summary and a position captures both. The position wire format is marked
  provisional (`position-event@1-provisional`).
- **`librarian-positions`.** Query one topic by key, search stances by free text,
  or find the positions that reference a note. Each answer carries when the
  position was formed and last revised; `chain: true` returns the full history.
  Retired topics show a stub with the retirement's own text, and long-untouched
  ones are marked dormant. It is a projection rebuilt at each `npm run reindex`,
  so a position captured since the last reindex appears after the next one.
- An empty or whitespace-only stance is treated as no directive, with a stderr
  diagnostic, and a non-kebab-case topic key is stored as written and reported.

### Known limits

- Recall lags capture until the next reindex.

## 2026-08-05 — Refs survive renames (note identity)

Decision-graph Phase 0 (ship-2026-08-05-0001, a metastable ship). The project is
also renamed from my-librarian to **rutter** on brand surfaces; the mechanism
keeps its `librarian-*` names.

### Added

- **Durable note identity.** A ref recorded in a session summary is a (path,
  content hash) pair. When a note is renamed, an exact hash match rebinds the ref
  automatically; an ambiguous match is surfaced with its candidates, never
  guessed. Confirmation is by CLI only (`npm run identity-confirm`).
- An append-only ledger at `_librarian/note-identity.md`. Stored session bytes are
  never rewritten; resolution happens at read time and the projections rebuild
  from the ledger.
- Unresolved refs render with their candidates on `librarian-recent` and in search
  enrichment.

### Known limits

- A ref whose note was both renamed and edited has no hash to match, so it shows
  as unresolved on `librarian-recent` only; enrichment is candidate-anchored.
