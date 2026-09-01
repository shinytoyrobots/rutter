---
type: reference
status: implemented
created: 2026-08-31
implemented: 2026-08-31
domain: ops
---

# Grok Stop adapter for rutter capture

**Implemented 2026-08-31.** Both substitution paths landed in `src/capture-cli.ts`
(`resolveDirective`, `positionDirectiveSourceText` + `isPositionShaped`); tests
`GROK-1..6` and `GROK-5`/`GROK-5b` in `test/capture.test.ts` and
`test/position-cli.test.ts` (196 pass); `npm run build` refreshed `dist/`. Wire
verified against a real Claude Stop envelope 2026-09-01 (see [Wire
verification](#wire-verification-2026-09-01-real-claude-stop-envelope)): camel
`lastAssistantMessage` is absent on the Claude wire, so the subset invariant
cannot fail on Claude. Live capture confirmed on both a Claude and a Grok turn.
Only remaining glance: the session-end Stop's no-duplicate check at an actual
`/exit` (structurally safe via SR-013). The plan below is the design record.

Grok already *runs* the Claude Stop hook (`~/.claude/settings.json` → `hooks/librarian-stop.sh` → `dist/capture-cli.js`). Capture still no-ops: `resolveDirective` takes the `transcript_path` branch unconditionally (`capture-cli.ts:130-132`), Grok sets that field to `updates.jsonl`, Claude `extractText` finds no directive, and `lastAssistantMessage` is never consulted.

The adapter’s job is to give `capture-cli` a text blob it can already parse. It must not infer a summary (INV-6). It must not concatenate sources (see [Placeholder last-wins](#placeholder-last-wins)).

## v1, one sentence

When a `transcript_path` extract yields no directive, scan `lastAssistantMessage` instead. Session path and position path each do that substitution in their own shape. `updates.jsonl` is dead weight. `chat_history.jsonl` is v2.

## Approach

Extend `src/capture-cli.ts` with one more **input shape**. Leave `librarian-stop.sh` and the Claude settings registration alone. Do not add a second hook under `~/.grok/hooks/`.

Rationale: `capture-cli` already accepts `sessionId` (camelCase) and a direct `{summary, refs, sessionId, cwd}` payload. The parsers (`parseSessionDirective`, `parsePositionDirective`) are the right place to scan new text. A bash wrapper that greps HTML comments out of JSON will mis-parse the first real summary that contains a quote or a nested comment. Grok already loads `~/.claude/settings.json`; a `~/.grok/hooks` copy would double-fire.

Claude’s production path stays first: if `transcript_path` *does* yield a directive (real Claude JSONL), that result wins and `lastAssistantMessage` is not consulted.

## Host files (which this plan touches)

| Source | Shape | Plan |
|---|---|---|
| Stop field `lastAssistantMessage` | String. Grok docs clip at 32,768 characters with a `… [+N chars]` marker ([Hooks — Stop Decision Control](file:///Users/shinytoyrobots/.grok/docs/user-guide/10-hooks.md)). Probe observed 348 chars, unclipped. | **v1 source** |
| `updates.jsonl` (the path in `transcript_path` / `transcriptPath`) | ACP `session/update` stream. Token appeared only inside tool-call `rawInput`. Claude `extractText` (`message.content`) scored 0 hits. | **Never.** Dead weight for v1 and v2. Do not sniff it. Do not add a `transcriptPath` camelCase alias — Grok already sends `transcript_path`, and the existing key is what makes the trap fire. |
| `chat_history.jsonl` | `{type, content}`. Finished assistant records are `{type: "assistant", content: string}`. Tool-call stubs have empty `content`. | **v2 only.** Assistant/content sniff runs against this file, never against `updates.jsonl`. |

## Probe result (2026-08-31, this session)

Planted `grok-capture-probe-2026-08-31` as a raw `<!-- librarian-session … -->`. Dump at `/tmp/rutter-grok-stop-probe/`. Hook reverted after the read.

| Check | Result |
|---|---|
| Stop fired | Yes. `hookEventName: stop`, `reason: end_turn` |
| `cwd` / `sessionId` | Both present. Also snake_case aliases `session_id`, `hook_event_name`, `permission_mode` |
| `lastAssistantMessage` | **Contains the raw directive** (348 chars, token present). No `last_assistant_message` snake alias on the wire |
| `transcript_path` / `transcriptPath` | **Present** — both point at this session’s `updates.jsonl` |
| Claude `extractText` on that file | **0 hits** |
| `chat_history.jsonl` | Finished assistant record also has the raw directive (`type: "assistant"`, 348 chars) |
| Session record written | No. Control holds: today’s `capture-cli` still no-ops |

**Trap:** do not treat “`transcript_path` is set” as “this is a Claude transcript.” Grok fills that field.

## Wire verification (2026-09-01, real Claude Stop envelope)

The unit fixtures pin the parser; only the real Stop wire can prove the subset
invariant holds and that v1's camel-only read is safe. Dumped one real Claude
Stop stdin (same wrap-and-revert probe), corroborated by a second concurrent
Claude session in a different repo. Both showed:

| Field | Observed | Verdict |
|---|---|---|
| `transcript_path` | Claude JSONL; `extractText` scored 2 nonce hits (>0) | Claude production path intact |
| `session_id` / `cwd` | Present (`2833413b-…`, a Claude UUID, not Grok's `01a059e9-…` v7) | SR-013 / SR-015 satisfied |
| `lastAssistantMessage` (camel) | **Absent** | The field v1 reads is not on the Claude wire |
| `last_assistant_message` (snake) | Present (len 2457, held the nonce); ⊆ transcript extract | v1 ignores it; Claude added it, adapter reads camel only |

**Conclusion:** because camel `lastAssistantMessage` is absent on the Claude
wire, `resolveDirective`'s fall-through branch is never entered for a Claude
Stop — the subset invariant cannot fail on Claude, and snake
`last_assistant_message` is structurally unreachable by v1. Do NOT add a
`last_assistant_message` alias to Claude's tests: that would create a second
Claude source the invariant was never checked against. Live capture confirmed
the same turn (session record appended under the Claude `session_id`); a live
Grok turn also logged a `lastAssistantMessage`-fallback capture the same day.
Not re-verified: precedence-on-the-wire (moot — needs camel LAM, which Claude
does not send; fixtures GROK-6 / GROK-5b cover it) and the session-end Stop's
no-duplicate glance at `/exit` (structurally safe via SR-013).

**Both legs now confirmed for both hosts (2026-09-01).** Write: Claude via
`transcript_path`, Grok via the `lastAssistantMessage` fallback, into the one
shared store. Reference: a Grok session reached my-librarian's MCP recall tools
against that same store. Claude and Grok are peers on this store; cross-host
records mix on recall by design (their session-ids can't collide — Claude UUID
vs Grok UUIDv7). Only standing inequality: Grok's 32k `lastAssistantMessage`
clip on write (v2 `chat_history.jsonl` scan is the backup).

## StopPayload delta (exact)

Add one optional field to `StopPayload`:

```ts
lastAssistantMessage?: string;
```

Do not add `transcriptPath`. Grok sends `transcript_path`; the existing key already catches it. Do not add `last_assistant_message`; the probe wire did not include it. `sessionId` / `session_id` and `cwd` already exist and are populated.

## Two resolve paths (not one edit)

`resolveDirective` returns a *parsed* directive or null. `positionDirectiveSourceText` returns *raw text* or null; the caller parses. “Fall through if no directive” is therefore a different code shape on each side. **Do not concatenate** transcript extract + `lastAssistantMessage` (see [Placeholder last-wins](#placeholder-last-wins)). **Substitute:** if the transcript extract has no directive of that kind, use `lastAssistantMessage` as the sole source instead.

**Load-bearing invariant:** both ladders assume `lastAssistantMessage` ⊆ the transcript extract. That subset property — not the if-order — is what makes the substitution non-lossy: the fall-through to `lastAssistantMessage` is only ever reached when the transcript extract has *no* directive of that kind, and since LAM is a subset it has none either, so the substitution can never narrow the Claude scan window and drop a directive an earlier turn emitted. On Grok it is moot (the `updates.jsonl` extract is always empty); on Claude it holds today. If a future host — or a Claude transcript-format change — ever made LAM carry text the extract omits, item 1’s precedence would stop preventing divergence, silently. Re-check this before trusting the ladder on any third host.

### Session — `resolveDirective`

Keep the direct `summary` escape hatch. Then:

1. If `payload.transcript_path` is set, `parseSessionDirective(getTranscriptText())`. If that returns a directive, return it (Claude path unchanged).
2. Else if `payload.lastAssistantMessage` is a string, `parseSessionDirective(payload.lastAssistantMessage)` and return that (including null).
3. Else return null.

Grok hits (1), gets null from `updates.jsonl`, then (2). Claude hits (1) with a real directive and never reaches (2).

### Position — `positionDirectiveSourceText`

Keep the direct `position` escape hatch. Then **detect “this text yields no position-shaped comment” before substituting**, using the same two functions the caller already uses (`parsePositionDirective` or `findEmptyStancePositionDirective` — the latter so an empty-stance diagnostic still fires on whichever source is chosen):

1. If `payload.transcript_path` is set, take `getTranscriptText()`. If that text is position-shaped (parse succeeds **or** empty-stance diagnostic would fire), return it.
2. Else if `payload.lastAssistantMessage` is a string, return it (caller parses / diagnoses).
3. Else if `payload.transcript_path` was set, return the transcript extract (preserves today’s “had a source” path when there is no LAM).
4. Else return null.

Same intent as the session path; not a copy-paste of its if-ladder.

## Placeholder last-wins

`parseSessionDirective` keeps the **last** `<!-- librarian-session … -->` match, then rejects it via `PLACEHOLDER_SUMMARY` (`directive.ts:53-62`). Rejection returns **null for the entire scan**. A trailing template `{"summary":"<one plain-English line>",…}` after a real directive does not “protect” the real one — it eats it.

v1 is safe because it **never concatenates** non-assistant text (and `lastAssistantMessage` is the finished reply, not the system prompt). Do not claim the placeholder guard makes concatenation safe. If a later v2 concatenates sources, this hazard is live within a single turn.

## What not to touch

- `librarian-stop.sh` (still `node dist/capture-cli.js || true; exit 0`).
- `~/.claude/settings.json` hook registration.
- Record schema, SR-013 identity, ref hashing, provenance derivation.
- MCP server instructions. The emission contract is host-agnostic; only the lift is broken.
- A Grok-native installer, plugin, or `~/.grok/hooks` copy.
- Filtering session-end Stops, blocking the stop, or writing stdout JSON.
- Any sniff of `updates.jsonl`.
- v1 sniff of `chat_history.jsonl`.

## Tests (capture-cli spawn path, same style as COR-A-009)

v1 only:

1. **Trap:** payload with `transcript_path` pointing at an `updates.jsonl`-shaped fixture (ACP `session/update` lines, no `message.content`) **and** `lastAssistantMessage` containing a session directive + `sessionId` + `cwd` → one entry, provenance from `cwd`. Without this test an implementer can ship a Claude-only extract and look green.
2. Same payload, `lastAssistantMessage` with no directive → no file, stderr “no session directive found”.
3. Hammer 5× identical Grok payload → byte-identical record (SR-013).
4. Fire with directive A, then directive B, same `sessionId` → two entries (SR-014).
5. Position directive in `lastAssistantMessage` (transcript_path present, extract not position-shaped) → one position event; session summary absent stays a no-op.
5b. **Position precedence (mirror of test 6):** `transcript_path` JSONL contains a valid position directive **and** `lastAssistantMessage` holds a *different* position line → the transcript directive is captured, LAM is ignored (item 1 wins over item 2). Pins the position ladder’s load-bearing guard, the way test 6 pins the session ladder’s.
6. Claude `transcript_path` payload whose JSONL *does* contain a directive still captures, even if `lastAssistantMessage` is empty or holds a different line (transcript wins).
7. Hook still exits 0, stdout empty (INV-5).

v2 (do not write these now): `{type:"assistant", content: directive}` JSONL fixture for `chat_history.jsonl`. Do not hit the real `~/.grok/sessions` in tests.

## Spec

Input-shape extension of SR-001, not a new scenario. Optional one-sentence clarification: “transcript” includes the Stop event’s assistant text, not only Claude Code’s `transcript_path` JSONL. Do not run a flow generation.

Optional, later: SERVER_INSTRUCTIONS currently says “what past Claude Code sessions decided.” A generalization to “client sessions” is documentation, not capture.

## Deploy

1. Implement the two substitution paths in `capture-cli.ts` (session + position).
2. Tests green, especially the trap test.
3. `npm run build` so `dist/capture-cli.js` is what the already-registered hook runs. No session restart needed for capture (new process per Stop). MCP instructions unchanged, so no reconnect.
4. Live check: one Grok turn that emits a real directive → today’s `_librarian/sessions/<UTC-day>.md` gains a line; `librarian-recent` returns it with project `knowledge-vault` (cwd-derived).
5. Confirm a Claude Code turn still captures from `transcript_path`.
6. Confirm-on-the-way-out, not a v1 risk: Grok also fires an observe-only Stop at session end. The per-turn probe did **not** observe that fire’s `lastAssistantMessage`. Every branch is safe (same text → SR-013 no-op; empty → no directive), but it is an untested assumption until a session actually exits under the new code.

## Residual risks

- **32,768-char clip** on `lastAssistantMessage` (Grok hook docs, cited above). Directives are conventionally at the end of the turn, so a long answer can lose them. v2 `chat_history.jsonl` scan is the backup. Probe only observed 348 chars.
- **Status noise.** The Claude hook’s `statusMessage` is “Librarian: capturing session memory.” Grok may show it every turn even on no-ops. Out of scope unless it is actually annoying.
- **Client identity.** Grok session ids are UUIDv7 and will not collide with Claude’s. No schema change. `librarian-recent` will mix both; that is correct.

## v2 (explicitly deferred)

Assistant/content sniff, run **only** against `chat_history.jsonl`:

- Parse each JSONL line.
- If `type === "assistant"` and `content` is a non-empty string, take that string.
- Ignore `system`, `user`, `reasoning`, `tool_result`, and empty assistant stubs.

Do not run this sniff against `transcript_path` / `updates.jsonl`. Do not concatenate with system/tool text. Last well-formed directive still wins *within assistant content*. Path derivation (`$GROK_HOME/sessions/<urlencode(cwd)>/<sessionId>/chat_history.jsonl`) is a v2 problem; encoded cwd longer than 255 bytes uses a slug+hash layout and is out of scope even then.
