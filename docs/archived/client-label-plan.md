---
type: plan
status: proposed
created: 2026-10-09
revised: 2026-10-09
domain: ops
---

# Client label on captured records — plan

**Status:** plan only. Nothing is implemented, and `spec/spec.md` stays the executable source of
truth. The spec delta goes through `/flow-spec`; this file says what to build and in what order.
Revised the same day after review: mixed-version writers, record loss on an unknown value, the
detection precedence, and the position projection are now explicit.

## Goal

Each captured session entry and position event records which host client wrote it: `claude`,
`grok`, `codex`, or `agy`. The label answers "which client stopped writing summaries?" and "which
client's capture is lossy?" from the records, without reading stderr logs or guessing.

## What the label is, and is not

- **A host client, not a model.** `agy` ran Gemini Flash, Gemini Pro, and Claude Sonnet in the
  0.4.0 testing, and Claude Code can run DeepSeek models through DeepSeek's Anthropic-compatible
  endpoint. No hook payload carries the model, so a model field is out of scope.
- **Metadata, never summary text.** The summary and stance stay byte-verbatim (SR-023, INV-6).
- **Reverses a documented choice.** The 0.4.0 changelog says "Records do not name the client that
  wrote them." The release notes for this change say the reversal was deliberate and why.
- **Absent beats wrong.** Any case the rules below cannot settle gets no label.

## Hazards this design has to survive

Two are pre-existing failure modes in the record writer that a new field would expose.

1. **Older writers strip the field.** The record schemas are `z.object`, which drops unknown keys on
   read, and every append rewrites the whole file (`appendSession`, `session-record.ts:164`;
   `appendPositionEvent`, `positions.ts`). Writers do not run one version: the Claude and Grok
   plugin install updates with the repo, but the Codex and Antigravity hooks run from manual
   clones. An older hook appending to a labeled day erases every label in that day's file.
   (`dissent-2026-08-05-0002`, confirmed on positions by `dissent-2026-08-13-0004`.)
2. **A validation failure loses the file.** `parseRecordFile` returns null when `RecordSchema`
   fails (`session-record.ts:66-79`), and `appendSession` treats null as "no record yet" and writes
   a file holding only the new entry. Positions behave the same at month scope. So any stored value
   the schema rejects does not make the day unreadable, it deletes the day on the next append.
   This is independent of this feature, and the field must not be the thing that triggers it.

## Design

### 1. Record format: tolerant stored string, validated at capture

`SessionEntrySchema` (`src/session-record.ts:31`) and `PositionEventSchema` (`src/positions.ts`)
gain `client: z.string().optional()`.

- **Stored type is a plain string, not an enum.** A closed enum would turn a future fifth client
  into hazard 2. The canonical values (`claude`, `grok`, `codex`, `agy`) are enforced where the
  label is produced, in `capture-cli`, not where records are read.
- **Capture only writes a canonical value.** An unrecognized explicit identity (an unfamiliar
  `RUTTER_CLIENT` or `--client` value) yields no label at all, not a shape-derived one; section 4
  defines this once and the tests cover it.
- **Readers tolerate anything.** A non-canonical stored value is preserved on rewrite and ignored
  by renderers. It is never an error.
- **Additive-optional, schema id unchanged** at `session-record@1`, the same way `workspace`
  shipped (SCN-005). Existing records are never edited (INV-3) and show no label (SR-019's
  quiet-when-absent rule).
- **Identity excludes the label.** `contentKey` (`session-record.ts:123`) and the position
  idempotence key do not include `client`, mirroring how workspace is excluded (SR-018).
- **Human-readable body.** `renderBody` (`session-record.ts:202`) may show the label next to the
  project. Decide in the spec delta whether it appears in the body or only in frontmatter.

### 2. Rollout: tolerant readers everywhere before any label is written

Two releases, in order. This is a requirement, not a suggestion.

- **Release A (schema only).** Adds `client` to both schemas and the renderers, and changes
  `appendSession` / `appendPositionEvent` so an existing file that fails to parse is never
  overwritten (see step 3). It emits no labels.
- **Gate.** Every active writer is on release A: the Claude and Grok plugin install, the Codex
  clone, and the Antigravity clone. Each manual clone needs `git pull` and `npm run build`
  (`dist/` is committed, so the plugin side follows the release). Confirm this per writer before
  moving on. The capture diagnostic on stderr should print the build version so the check is
  observable rather than assumed.
- **Release B (labels on).** Capture starts writing the label, and the installers add the explicit
  identity.

**Mixed-version append probe (a test, not a manual check).** Keep the pre-change schema as a test
fixture. Append through it to a day and a month that already carry labels and assert the labels are
stripped. That documents the hazard. Then assert the release A writer preserves them. Also append
to a record holding an unfamiliar `client` value and assert nothing is lost.

### 3. Do not overwrite an unparseable record, and report it as a failure

Fix hazard 2 itself, as its own change and its own spec item, before release A ships.

**Behavior.** When the destination file exists and `RecordSchema` (or the position schema) rejects
it, the append does not run. A file that is absent still starts a fresh record. The refused
directive is not written anywhere else; the diagnostic names the file so the operator can repair it.

**Failure contract.** Today `captureSession` and `capturePosition` call a void append and then
return `captured: true` (`src/capture.ts:108-109`), so "just return early" would report success for
a write that never happened, and throwing would abort the whole hook run. Instead:

- The append functions return a result rather than `void`: written, or refused with a reason
  (`unparseable-record`). An I/O error from the atomic write is a second reason (`write-error`),
  so a failed write can no longer be reported as captured either.
- `CaptureResult` (and the position equivalent) gains `failed?: { reason, path }`. When it is set,
  `captured` is `false`, `deduped` is absent, and no entry is claimed.
- `capture-cli` prints a stderr diagnostic for a failure (INV-5), distinct from "nothing to
  capture", and exits 0 as it does now (`librarian-stop.sh` must never break a session).
- **The two captures are independent.** `main` runs session capture and position capture each in
  its own guard, so a failure or an unexpected throw in one never skips the other. Today they run
  back to back with no guard (`capture-cli.ts:118-119`).
- The dedupe scan is unaffected: `readAllRecords` already skips files that fail to parse, so a
  corrupt file never counts as a duplicate source.

**Tests.** A corrupt session day file alongside a valid position destination: the session capture
reports `failed`, the corrupt file's bytes are unchanged, and the position event is still written.
The mirror case: a corrupt position month file alongside a valid session day. Plus an absent file
still starting fresh, and a forced write error reported as `failed`, not `captured`.

### 4. How the capture hook decides the label

**Classify the original envelope, before normalization.** `normalizeAntigravity`
(`capture-cli.ts:405`) rewrites an Antigravity payload into `{ session_id, cwd,
last_assistant_message }`, which discards exactly the fields that identify it, and the result is
indistinguishable from a Codex or Claude payload. So a `classifyClient(original, explicit)` function
runs first, on the parsed payload as received, and returns a canonical label or none. `main` computes
it once and carries it through both `runSessionCapture` and `runPositionCapture`, which hand it to
`captureSession` and `capturePosition`. Nothing downstream re-derives it from a normalized payload.
A turn Antigravity ends with an error is skipped by normalization and captures nothing, so it gets no
label either.

**Evidence.**

- *Shape host*, read from the original envelope only: `agy` if `isAntigravityPayload` holds;
  `grok` if camelCase `lastAssistantMessage` is a string; otherwise none. If both hold, the shape is
  contradictory and the result is none.
- *Explicit identity*, from the installer (`RUTTER_CLIENT` or a `--client` argument): one of the four
  canonical values, absent (unset or empty), or unrecognized (set to anything else, including a
  future client name or a typo). An unrecognized value is evidence of a misconfigured or newer
  install that this build cannot reconcile with the payload, so it yields **no label**, even when the
  shape would identify `agy` or `grok`. It is never treated as absent.
- A direct capture payload (it carries `summary` or `position`, e.g. `npm run capture`) has no host
  provenance and gets no label, whatever else is present.

**Conflict check first, then precedence.** An unrecognized explicit identity short-circuits to no
label. Otherwise, for any host evidence, compare explicit identity against
shape host before choosing. A label is returned only when the pair is in this table; every pair not
listed yields no label.

| Explicit \ Shape host | none | `agy` | `grok` |
|---|---|---|---|
| absent | none | `agy` | `grok` |
| `claude` | `claude` | none (conflict) | `grok` (shared-hook exception) |
| `grok` | `grok` | none (conflict) | `grok` |
| `codex` | `codex` | none (conflict) | none (conflict) |
| `agy` | `agy` | `agy` | none (conflict) |

The single exception is `claude` with `grok` shape, because Grok runs the Claude plugin's hook and
so arrives carrying the Claude identity. Nothing else may override an explicit identity, and an
explicit identity never overrides contradictory shape evidence: the result is no label.

Notes:

- **`last_assistant_message` distinguishes nothing.** Claude sends it (verified in
  `docs/grok-stop-adapter.md:74`, length 2457, on the real Claude wire) and so does Codex. It is
  never an input. Only the camelCase field is Grok-specific.
- **Codex is explicit-only.** Nothing in its payload separates it from Claude, so a Codex hook with
  no identity is an unlabeled entry, not a guess.
- **Legacy Claude installs go unlabeled.** A hook registered by hand in `~/.claude/settings.json`
  before release B has no explicit identity and no shape evidence, so it lands in `absent / none`.
  Re-running `install-hook --client claude` adds the identity. This is the cost of absent-beats-wrong.
- **How the identity reaches the hook** (an environment prefix on the command, or an argument to
  `librarian-stop.sh`) needs a check against each host's hook runner. `librarian-stop.sh` is shared
  by all four, so an argument is likelier to survive than an environment prefix. Verify before
  pinning.

**Tests.** The full matrix above, one case per cell, including `codex` plus a camelCase
`lastAssistantMessage` (none), `codex` plus the Antigravity shape (none), `claude` plus
`lastAssistantMessage` (`grok`), and an Antigravity payload with no explicit identity (`agy`,
proving classification survives normalization). Plus a direct payload with each explicit value
(none), a contradictory shape (none), and an unrecognized explicit identity (`RUTTER_CLIENT=gemini`,
a typo, and a different-case `Claude`) with each shape host (`none`, `agy`, `grok`), all of which
must give no label. An empty `RUTTER_CLIENT` is a separate case and behaves as absent.

### 5. Reads and the position projection

Two scopes; the plan commits to the first and flags the second as a separate decision.

- **Stored records only (in scope).** The label lives in the markdown frontmatter and the rendered
  body. Anything that reads records directly (`librarian-recent`, `src/recent.ts`,
  `src/recent-cli.ts`) can show it, with the same inert rendering used for other free fields.
- **Position recall (not in scope unless chosen).** Position recall does not read the markdown. It
  reads a SQLite projection that reindex rebuilds (SR-059): `position_events` is created in
  `src/db.ts:118`, filled by `position-fold.ts`, and read by explicit column lists in
  `src/position-recall.ts` (for example the select at line 218). None of those carry `client`, so
  adding the field to the markdown schema does not expose it through `librarian-positions`.
  Exposing it means all of: a new `position_events` column (the table is dropped and recreated on
  rebuild, `db.ts:185`), the fold, the recall selects and result types, the renderer, and a
  determinism check that two reindexes agree (SR-059). It also amends the response envelope SR-061
  pinned in spec v10. Treat it as its own change.

## Steps

0. **Capture ground truth.** Dump a real Stop payload from Claude Code, Grok, Codex, and `agy`
   (the probe approach in `docs/grok-stop-adapter.md`). Confirm the matrix in section 4 against all
   four, including how the explicit identity reaches each host's hook.
1. **Spec delta via `/flow-spec`.** Scenario and requirements for: the tolerant optional field,
   exclusion from identity, never in summary text, absent on legacy records, no label on ambiguity,
   the section 4 matrix and classification-before-normalization, the no-overwrite failure contract,
   the independence of session and position capture, and the two-release rollout. Amend
   SR-018's exclusion list and the 0.4.0 "do not name the client" statement. Bump the spec version
   and add the `spec/history/` snapshot.
2. **Release A, part 1 (hazard 2).** No-overwrite guard and the failure contract from section 3 in
   both append paths and both capture functions, with the independent-capture guard in `main`. Tests
   as listed in section 3.
3. **Release A, part 2 (schema).** Add `client` to both schemas and the body renderer. Tests: old
   records round-trip unchanged; an unfamiliar `client` value survives a rewrite; the mixed-version
   probe from section 2.
4. **Ship release A, then confirm every writer is on it** (the gate in section 2).
5. **Release B, capture.** Classify the original envelope in `capture-cli.ts` before
   `normalizeAntigravity`, per the section 4 matrix, and carry the result through both capture paths
   into `captureSession` and `capturePosition` (`src/capture.ts`).
6. **Release B, installers.** Set the explicit identity in `install-hook.mjs` for `codex`,
   `antigravity`, and `claude`, and in the plugin `hooks/hooks.json`. Re-run each installer and
   confirm the managed hook entry is updated, not duplicated (`test/install-hook.test.ts`).
7. **Tests per client** in `capture.test.ts`, `codex-capture.test.ts`, and
   `antigravity-capture.test.ts`: the section 4 matrix cells for that client, plus dedupe
   ignoring the label.
8. **Docs.** README client table and the Privacy Policy section (a new stored field), 
   `docs/memory-of-use.md`, CHANGELOG, and the gh-pages port with the `sources.json` rehash for
   any `docs/*.md` edit.
9. **Live check.** One real captured turn per client, read the record back, confirm the label.
10. **Separate decision:** position recall exposure (section 5), only if chosen.

## Risks

- **Older writer erases labels.** Mitigated by the two-release order, the per-writer gate, and the
  mixed-version probe. Residual: a clone someone forgot to update still strips labels for the days
  it writes into. The stderr build version makes it visible.
- **The field triggers a record loss.** Mitigated by the tolerant string and the no-overwrite guard.
- **Mislabeling.** Mitigated by the conflict-first matrix, classification before normalization, and
  the ground-truth capture in step 0.
- **Overreading the label as the model.** The README and tool output say "client", never "model".
- **Coverage gap on legacy Claude installs.** Accepted; documented in the table notes.

## Open decisions for the operator

1. Position recall: stored-records-only now (recommended, since exposing it amends SR-061's pinned
   envelope), or include the projection in this effort.
2. Show the label in the human-readable body, or frontmatter only.
3. Positions as well as sessions. Recommendation: both, since the label is most useful where
   positions from several clients fold together.
4. Whether the no-overwrite guard (step 2) ships with this effort or as its own earlier fix. It is
   worth doing regardless of the label.

## Out of scope

- A model field, filtering or search by client, and backfilling old records.
- Any change to the summary or stance text.
