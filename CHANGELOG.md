# Changelog

Notable changes to rutter, newest first. Detailed per-ship records — grounds,
disclosed gaps, and what is being watched — are kept by the maintainer
outside this repository.

## v0.5.0 — 2026-10-09

- **Records name the client that wrote them.** Each session entry and position event now carries
  a `client` label: `claude`, `grok`, `codex`, or `agy`. It answers "which client stopped writing
  summaries?" from the records. It is the host, not the model: `agy` runs Gemini and Claude
  models and no hook payload says which. This reverses the 0.4.0 note that records do not name
  the client. The label is metadata only (the summary and stance stay byte-verbatim), sits in the
  frontmatter rather than the body, and is not part of duplicate detection.
- **A label is left off rather than guessed.** The hook classifies the original Stop envelope
  before Antigravity normalization and combines it with the identity the installer passes
  (`--client`, or `RUTTER_CLIENT`). Conflicts, an unrecognized identity, direct payloads, and
  Codex without an identity get no label. Records from before this release show none.
- **Re-run the installer to label an existing hook.** `npm run install-hook -- --client
  <claude|codex|antigravity>` updates a registration in place to pass the identity; the plugin's
  own hook already does. Hooks registered by hand stay unlabeled until then.
- **Update every writer to 0.4.1 first.** Older writers strip the label on append.

## v0.4.1 — 2026-10-09

- **A capture never overwrites a record it cannot read.** If a day's session file or a month's
  position file already exists but fails validation, the append is refused: the file is left
  byte-identical and the hook reports `FAILED to write ...` on stderr instead of claiming a
  capture. An absent file still starts fresh. Before, an unreadable file was treated as "no
  record yet" and rewritten from the one new entry, which deleted the rest of the day.
- **Session and position capture run independently.** A failure or unexpected error in one no
  longer skips the other.
- **Records accept an optional `client` field.** Nothing writes it yet. This release only teaches
  readers and writers to preserve it, because an older writer drops unknown keys on every append
  and would erase labels from a day it appends to. Update every writer (the Claude plugin, and the
  Codex and Antigravity clones: `git pull`, `npm run build`) before the release that starts
  writing labels. Capture diagnostics now name the build version so a stale writer is visible.

## v0.4.0 — 2026-10-09

- **Antigravity joins Claude Code, Grok, and Codex: one memory across all four.** A decision
  captured in any of them is recalled in the others, because they all write to the same notes
  folder and read it through the same server. The README opens with this, with a table of how
  each client captures and where to set it up, and the overview and tutorials carry it too.
  Grok, Codex, and the Antigravity CLI now have their own README setup section instead of
  sitting under the Claude plugin install. Records do not name the client that wrote them.
- **Antigravity as a capture host.** `npm run install-hook -- --client antigravity` registers
  the Stop hook in `~/.gemini/config/hooks.json` and writes an `always_on` capture rule to
  `~/.gemini/config/rules/rutter-capture.md`, built from the server's own contract text.
  Antigravity's Stop event carries no reply text, so `capture-cli` reads the current turn's
  `PLANNER_RESPONSE` records from the transcript (after the last `USER_INPUT`; tool results
  and echoed prompts are ignored) and skips a turn that ended with an error. The conversation
  id is the session id and the first workspace path is the working directory.
- **Why the rule file.** `agy` saves an MCP server's instructions as a file instead of putting
  them in the prompt, so the model never wrote a summary line from them (nor from `AGENTS.md`).
  An `always_on` rule is injected every turn; with it Gemini Flash and Pro and Claude Sonnet all
  wrote the line after a decision and none after a trivial question.
- **One vault for capture and reads.** The installer now takes the vault once (`--vault`, else
  `LIBRARIAN_VAULT_PATH`, else the default, and says which) and writes it to both the hook (as a
  default an exported `LIBRARIAN_VAULT_PATH` can still override) and the printed MCP entry.
  Before, the hook inherited whatever shell launched `agy` while the MCP server kept its own
  stored vault, so a capture from a shell without the variable went to the default vault while
  reads came from another. Re-running with a different `--vault` updates the hook in place.
  Every capture now names the vault it wrote to on stderr, and flags the default fallback.
- Verified with `agy` 1.3.2 against a disposable vault: a three-turn conversation captured the
  decision, skipped a trivial turn, captured the reversal; a replayed payload was a no-op; and a
  run from a shell with no vault variable wrote to the installed vault, not the default one.

## v0.3.3 — 2026-10-02

- **The privacy policy now lists everything rutter writes.** It said three kinds of
  file and put stance lines in the session records. The server actually writes five:
  session records, position records (`_librarian/positions/`), the note-identity
  ledger (`_librarian/note-identity.md`), the usage log, and the search index. It
  also said rutter "runs no other programs", which left out the capture hook; it now
  says exactly what runs. No behavior change.
- **No binary-looking source file.** `src/identity.ts` held a literal NUL byte as a
  key separator, so git and grep treated the whole file as binary. It is now the
  escape `\u0000`, which behaves identically.

## v0.3.2 — 2026-10-02

- **A credential in your git remote is no longer copied into your notes.** Each
  session record stores the git remote URL of the working directory, read from
  `.git/config`. A remote written as `https://<token>@host/org/repo` would have put
  that token into a markdown file that may be synced or committed. Any user-info
  part, query string or fragment is now removed before the URL is stored. Ordinary
  remotes, including `git@host:org/repo.git`, are unchanged. Records already written
  are never edited (they are append-only); in the author's vault none contained one.

## v0.3.1 — 2026-10-02

- **Hosts that don't fill in the plugin's options no longer break the server.**
  Grok fills in `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` but not the
  plugin's notes-folder and name options, so the server searched a folder literally
  named `${user_config.vault_path}` and found nothing, and told the client it was
  reading "${user_config.user_label}'s work". An unresolved or empty setting is now
  treated as unset: the default applies and a line on stderr says why. To point a
  host like that at other notes, set `LIBRARIAN_VAULT_PATH` where it launches.
- **No stray server when you work in this repo.** The plugin's server is declared
  inside `plugin.json` rather than a root `.mcp.json`. Claude Code also reads a
  root `.mcp.json` as a project server, where `${CLAUDE_PLUGIN_ROOT}` is never
  filled in, so opening Claude in a clone showed a second `rutter` failing with
  `CONNECTION_CLOSED` beside the working one.

## v0.3.0 — 2026-10-02

- **Installable from GitHub.** The repository is now its own Claude Code plugin
  marketplace: `/plugin marketplace add shinytoyrobots/rutter`, then
  `/plugin install rutter@rutter`. Claude Code installs the dependencies from the
  lockfile, so there is no build step.
- **The index builds itself.** Installed as a plugin there is no clone and no
  `npm run reindex`, so a fresh install answered every search with "No notes
  matched". The server now builds its index when it starts if none exists, and
  rebuilds it only when your notes, session records or position streams have
  changed, added or removed since the last build. It never rebuilds from a partial
  picture: if the notes folder is missing or has an unreadable subfolder, it keeps
  the existing index and logs why. A rebuild that fails part-way cannot leave an
  index that still looks up to date.
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
