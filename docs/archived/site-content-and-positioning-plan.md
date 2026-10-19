---
type: plan
status: proposed
created: 2026-10-09
updated: 2026-10-09
domain: writing
---

# Docs site: accuracy, positioning, and setup plan

**Status:** plan only. Nothing is implemented. This plan does not authorize implementation, publication, or changed-content engineering.

This merges two plans written on 2026-10-09 against the live site (ruttermemory.com, built from `main@3412b6a`), then revised after a review of the merged plan the same day. The source plans were deleted unmerged; their findings live here:

- **Content accuracy:** several sentences claim more than the paragraph under them, and the three pages describe one rule in three ways.
- **Positioning:** the opening leads with an abstract store/memory distinction instead of the decision a reader wants to recover, and the example has no real output.

Both follow [`docs-site-revision-plan.md`](./docs-site-revision-plan.md) (PRs #62–#68, merged). The fast path, the trust boundary, the August–October example, the librarian naming sentence, and troubleshooting are already on the site. This plan does not redo them. It changes content only. Visual changes are out of scope.

## Goal

1. **Accuracy.** A reader who stops at any one page leaves with the same account of what a stored line is, what a hook firing keeps, and what "one line per outcome" means. The mechanics page (`memory-of-use.md`) owns the full statement. The overview and the lesson state it briefly and point there.
2. **Positioning.** A technically capable markdown-vault owner understands what rutter helps them recover, sees evidence that it works, and can decide whether to try this reference implementation. Lead with the outcome (recovering an earlier decision and the notes it cited). Explain the mechanism immediately afterward (dated records, retained history, references carrying capture-time content hashes). Cross-tool access supports the benefit; it is not the headline.

The two goals meet at one point: the positioning plan found the byte-verbatim inconsistency, and the content plan specifies the fix. The accuracy fix lands first so the new opening is built on corrected claims.

## Message order for the overview

1. **Outcome:** recover a past decision and the notes the session cited, even when you switch AI tools.
2. **Mechanism:** dated records retain the captured summary and references with content hashes. Unchanged renames can be followed. References the tool cannot place remain visible.
3. **Evidence:** a real capture and recall, then a rename and its actual resolved output.
4. **Boundaries and fit:** capture depends on the client emitting a record; a reference does not prove the model read a note; same-path changes are not flagged today. This is a personal, MIT-licensed reference implementation with no support commitment.
5. **Action:** choose setup instructions for your client, or read the fuller design argument.

Do not equate MCP compatibility with reliable capture across clients; the setup guide documents different hook, environment, and instruction-handling requirements per client. Claims that the feature combination is unique need separate evidence.

## Scope

- **In:** `docs/overview.md`, `docs/getting-started.md`, `docs/memory-of-use.md`, and README sentences that repeat a claim this plan corrects or that must align with the new opening. The three gh-pages HTML ports and `sources.json`, by the port step.
- **Out:** visual and layout changes (skin, print styles, the 404 page, code-fence language tags, nav labels), code changes, changing the dormant threshold or the 2,000-character guard.
- **Separate track:** changed-content detection (engineering, flow process). See "Engineering track" below.
- **Do not touch:** the `SERVER_INSTRUCTIONS` block quoted in the README. A test fails if it drifts from `src/server.ts`. "Byte-verbatim" inside that block stays; it tells the client the server will not rewrite a line for style.

## Ground rules

- Every docs PR branches from `main`. Never commit to `main`. Merge with `--merge`; the merge is Robin's.
- Any edit to the three docs pages needs the paired gh-pages port and `sources.json` rehash, or the site goes publicly stale. Port in a temporary worktree of `gh-pages`; pushing straight to `gh-pages` is fine.
- Footers cite `main@<short-hash>` of the docs content commit, with no version-tag claim.
- American English. The mechanics page keeps every behavioral guarantee. Where this plan narrows a word ("byte-verbatim", "anywhere", "no content inspection"), the narrowed sentence must stay checkable against `src/sanitize.ts`, `src/directive.ts`, `src/position-directive.ts`, and `src/config.ts`.
- Confirm constants at edit time. Written against `maxSummaryChars` of 2000 and `positionDormantAfterDays` of 180.
- **Word choice.** PR #68 moved the docs off "receipts" because a fingerprint of file bytes at capture is not evidence that the session read the file or that it caused the conclusion. Prefer "notes the session cited" over "sources the decision rested on". A stored hash is a byte-level fingerprint, not a historical copy, proof of reading, or proof that meaning stayed the same. Even after change detection ships, avoid "still says what it said".
- **No fabricated evidence.** Demo notes may be invented and labeled fictional; executions and output must be real and unedited.
- Preserve candid limitations. Shorten the entry route by consolidating repeated explanation, not by hiding qualifications or implying a supported service.

## Decisions (resolved 2026-10-09)

1. **Changed-content detection stays separate.** It is a product decision, not a prerequisite for better copy: a separate engineering track (PR 7), subject to observed use and the flow process. Content work describes today's behavior.
2. **Demo scope (PR 4):** a small throwaway vault with explicitly fictional research or drafting notes; one decision captured in one client and recalled in another. If only CLI capture and recall can be demonstrated, label that narrower scope.
3. **No consolidation story.** No real case of a summarizing memory tool erasing a decision exists to cite, so the "merge lost my decision" section is dropped. Do not write a hypothetical one.
4. **Source plans retired.** The two 2026-10-09 source plans were deleted; this file replaces them.

## Work, in order

```
PR 1 ─┬─ PR 2 ── PR 5 ── PR 6
      └─ PR 3 ── PR 4
Engineering track (PR 7) is independent.
```

PR 1 lands the shared definitions every later PR relies on. After it merges, the mechanics/setup track (2 → 5 → 6) and the overview track (3 → 4) can run side by side; they touch different files except the README, where they edit different sentences. Rebase whichever lands second.

| PR | Source | Branch |
|----|--------|--------|
| 1 | content PR 1 + positioning A.1, A.6 | `docs/stored-line` |
| 2 | content PR 2 | `docs/firing-and-grok` |
| 3 | positioning A.2–A.4 + content PR 3.4 | `docs/provenance-hero` |
| 4 | positioning B + A.5 + content PR 3.1–3.3 | `docs/example-real-output` |
| 5 | content PR 4 | `docs/mechanics-cases` |
| 6 | positioning E | `docs/client-setup-paths` |
| 7 | positioning C | flow process |

The positioning plan's item D (the consolidation story) is dropped per decision 3.

### PR 1 — what a stored line is, and who it is for

The three pages use "byte-verbatim" for three different promises, and the setup guide frames sessions as coding-only. Write the storage promise once on the mechanics page and fix the audience everywhere.

1. **`memory-of-use.md`, "The style contract".** Replace the absolute "stores the summary byte-verbatim / never shortens / Silently truncating would lose the only copy" passage with the three facts the code draws:
   - The words are not edited for style. A dense line is stored, the word-count warning is printed, and the 40-word target and 60-word ceiling are not a cut.
   - Before storage the line is normalized to sit in the record as one line: newlines and tabs become spaces; control characters, ANSI sequences, bidi overrides, and zero-width characters are dropped; runs of spaces collapse; ends are trimmed (`toInertLine`, `src/sanitize.ts`).
   - Past 2,000 characters the line is cut (`config.maxSummaryChars`, SR-101), separately from the style budget.
   - "Silently truncating would lose the only copy" may stay only as the reason the style budget does not cut.
2. **Same page, "Where rutter keeps what it remembers": the "one line per outcome" and idempotence bullets.** State both rules in one place, and keep the cadence rule and the storage rule as separate sentences.
   - **Cadence (the contract):** one line per separable outcome; a working session usually leaves three or four (one person's first two weeks averaged 3.2).
   - **Storage (the dedupe rule):** a session line is skipped when a line already recorded *anywhere* in `_librarian/sessions/` has the same session id, the same summary *after normalization*, and the same sorted list of resolved reference paths (order ignored, duplicates kept, so `[A]` and `[A, A]` differ). Content hashes and workspace are not part of the comparison, so re-editing a cited note between firings does not add a twin. Consequences to state plainly: identical text in a different session appends; two raw texts that normalize to the same line are one line; a rephrased line appends as a revision; a capture with no session id (a hand-piped test) always appends. Check `isDuplicateEntry`/`contentKey` in `src/session-record.ts` at edit time.
   - **Positions** follow the same pattern, keyed on session id, kind, topic key, normalized stance, sorted reference paths, and `revises`, scanned across every month (`isDuplicatePositionEvent`, `src/positions.ts`). State it in the positions section, or point there from this bullet.
   - `librarian-recent` groups a session's lines into one account.
3. **`overview.md`, "How it works", writing paragraphs.** Replace "never rewrites, shortens, annotates, or rejects a line. It cannot." with: the server does not rewrite a line for style, because judging prose would be inference; normalization and the 2,000-character cut exist (point at the mechanics paragraph). Replace "capture costs no extra inference and no network call" with: no second model call and no network call; the line is extra text in the turn the client was already writing.
4. **`getting-started.md`, Step 3.** Replace "and that is the whole of it." A hand capture is not judged; control characters are stripped, whitespace runs collapse, newlines fold into spaces, and a line past 2,000 characters is cut. Point at the mechanics paragraph.
5. **`getting-started.md`, opening paragraph.** Replace "your AI coding sessions" with the overview's scope: research, drafting, planning, or reading over a notes vault. State the audience: people comfortable configuring AI clients who keep markdown notes. Add one sentence that `librarian-*`, `LIBRARIAN_*`, and `_librarian/` kept the earlier name.
6. **`getting-started.md`, Step 7.** Add that the server does not enforce the 40/60 word aim.
7. **Every other storage-fidelity claim.** Phrase-matching on a few sentences is not enough; these also contradict normalization and the cut. Line numbers are as of `main@0cf662d`; re-run the grep below at edit time.
   - `overview.md:95` ("stores whatever it is handed, byte-verbatim"): covered by item 3.
   - `overview.md:158–161`, the bet heading "Append-only, and byte-verbatim" and "What comes out is what went in." Keep the append-only claim; replace the fidelity claim with "not rewritten for style" plus a pointer. If the heading changes, its id changes; no other page links `#append-only-and-byte-verbatim` today, but check the gh-pages nav.
   - `overview.md:206`, "append-only verbatim lines" in the combination claim (see also PR 4 item 6).
   - `overview.md:236`, the trust-boundary bullet "the conclusion the client wrote, byte-verbatim".
   - `memory-of-use.md:93` (client field: "summary and stance stay byte-verbatim"), `:188` (covered by item 1), `:408` (stance "stored byte-verbatim"), `:493` (trust-boundary list), `:540` (design-invariants "verbatim").
   - `README.md:8` ("stores that line byte-verbatim"), `:91` (style-contract bullet: "stores whatever it is given, **verbatim** … stored as written"), `:100` (position bullet: "stored byte-verbatim"; the routing half of that sentence is PR 5's), `:260` ("it stores what it is given, verbatim").
   - The ambient-capture bullet's "one line per separable outcome … usually three or four" (README, around line 90): short form of item 2 plus pointer.
   - Leave alone: the `SERVER_INSTRUCTIONS` quote (README 252, 254), and uses of "verbatim" that mean quoting or lifting text (README 241, `memory-of-use.md:155`, `:208`). Confirm `:155` is accurate: the hook lifts the raw directive, and normalization happens after.

**Verify:**
- From `docs/` and `README.md`, excluding plan files and the server-instructions quote, `grep -n "It cannot\.\|that is the whole of it\|no extra inference\|What comes out is what went in"` returns nothing.
- `grep -n -i "verbatim\|as written\|whatever it is given\|whatever it is handed" docs/overview.md docs/getting-started.md docs/memory-of-use.md README.md`: every remaining hit is reviewed in context and either means "not rewritten for style", is the server-instructions quote, or describes quoting or lifting text. List each surviving hit and its justification in the PR body.
- The mechanics page states normalization, the cut, and the style budget as three separate facts.
- The cadence sentence and the storage sentence are both present and distinct, and the storage sentence names the session boundary, normalization, reference paths, and the no-session-id case.
- No page frames sessions as coding-only.

### PR 2 — what one firing keeps, and the Grok path

Starts after PR 1.

1. **`memory-of-use.md`, "Host differences".** Make the host bullets match the directive section: each firing keeps the last session directive and the last position in the text it reads.
   - **Claude Code** reads the whole transcript; each firing still keeps only the last directive. A line no longer last survives only if an earlier firing captured it. Two directives in one turn: the second is kept.
   - **Antigravity** keeps its current scope sentence (assistant messages from the current turn; everything after the last user message; an errored turn captures nothing). Replace "a directive anywhere in the turn is found" with the last-match rule.
   - **Grok and Codex** read the final message; add that two directives there still collapse to the last.
2. **`getting-started.md`, Antigravity preamble, item 3.** Keep "anywhere in the current turn" as placement advice; add that two lines collapse to the last.
3. **`getting-started.md`, a Grok preamble** beside Codex and Antigravity, taken from the README's "Set up Grok". No invented `grok mcp add` step.
   - Install the Claude Code plugin (fast path). Grok uses that install's server and hook but does not fill in the plugin's notes-folder option.
   - Notes outside `~/Documents/knowledge-vault` need `LIBRARIAN_VAULT_PATH` in the launching shell; stderr says when the default was used.
   - The hook reads the final assistant message, which Grok clips at 32,768 characters, so a trailing directive on a long turn is dropped.
   - Point the existing troubleshooting entry at this preamble.
4. **`getting-started.md`, "Before you start".** Split "Claude Code and Grok read it from `~/.claude/settings.json`" into the hook fact and the vault-path fact. Check the README and `hooks/hooks.json` before writing the hook clause; if they disagree with the bullet, the bullet changes.

**Verify:** `grep -n "anywhere in the session is found\|anywhere in the turn is found" docs/memory-of-use.md docs/getting-started.md` returns nothing. A Grok reader can follow one preamble, clip included, without visiting troubleshooting, and it matches the README.

### PR 3 — lead with the outcome

Starts after PR 1. Overview and README opening only. Copy only.

1. Draft the opening around: **"Recall past decisions and the notes your AI session cited."** Supporting copy covers dated records in the user's folder, capture-time hashes, and recall across configured clients. Validate the wording against PR 1's corrected storage claims.
2. Move the store/memory metaphor into the explanation after the example. Keep the page title, description, overview, and README opening aligned with the concrete lead. Do not claim all clients work identically.
3. Put a getting-started link beside the opening. Keep cross-tool access to a supporting paragraph.
4. **The hinge** at the end of "Why it is different" ("That sentence is the design. Everything that follows is what it costs."): the bets are the costs; the trust boundary and "What it deliberately is not" are not. Say that the next section is the cost of each bet and the boundary comes after.

**Verify:** the opening answers who it is for, what can be recalled, and how to try it. No claim contradicts the trust boundary. Audit "verifiable"/"provenance" wording in context; legitimate verification instructions can stay.

### PR 4 — a real example, and the rename told once

Starts after PR 3 (same file). Gated on decision 2.

1. **Build the demo** in the scratchpad: two fictional research or drafting notes (A and B), one real captured decision citing both, then:
   - recall (both references resolve);
   - rename A with no edit, reindex, recall (A follows its rename by hash);
   - edit B *and* rename it, reindex, recall (B shows as unresolved, because neither path nor hash matches).

   This covers both outcomes the example has to replace below. Mark fictional content explicitly. If the unresolved step cannot be produced honestly, do not cut the unresolved explanation in item 4; keep a two-sentence version of it in "References that carry a hash".
2. **Capture real output:** `npm run recent`, plus a positions call via the MCP tool only if one can be produced honestly (`positions` has no CLI; otherwise say "recent only"). Paste verbatim into a fenced block. Record the commit, date, and client versions. Prefer capture in one client and recall in another; do not present a hand-piped capture as proof of ambient capture or cross-client recall.
3. **Move "An example"** directly after the lead, before "The missing layer". Show the date, recorded decision, and cited reference before explaining the hash. Include the real output for both the followed rename and the unresolved reference, and one boundary sentence: same-path content changes are not currently flagged. Keep output short by choosing a small scenario, not by editing.
4. **Make the example the only telling of rename, rebind, and unresolved** (only if step 1 produced both cases; otherwise apply the step 1 fallback). Then:
   - **"The missing layer":** reduce to what the example does not already say.
   - **"References that carry a hash":** keep the definition (path plus hash at capture), the cost (a typo looks like a change), the handoff to the next bet, and the sentence that same-path change is stored and not reported. Cut the rename retelling.
   - **"Show what you can't place, and don't withhold the answer":** keep Recall, Kage, show-rather-than-withhold, and one sentence that same-path change is not built. Cut any second pass over rename mechanics. The combination claim is handled by item 6.
   - **"A dead reference is a person's call":** cut the rebind/unresolved retelling. Keep what only this section says: `npm run identity-confirm` is a terminal command, not an MCP tool; a confirmed binding is sticky; a later automatic match is shown as a disagreement (`confirmed X; the hash now matches Y`); some references sit unresolved until cleared.
5. Give the overview a concise capabilities-and-limits account and link to memory-of-use for mechanics.
6. **The uniqueness claim needs dated evidence, or it goes.** `overview.md:206–209` says the combination (append-only lines, references carrying content hashes, unplaceable references shown rather than dropped) "appears to be unoccupied" and calls that "the only claim made here". Nothing in the docs substantiates it.
   - **To keep it:** survey comparable tools (AI memory layers, note-linking and provenance tools, the ones the overview already names such as Recall and Kage) and record, per tool, which of the three properties it has, with a source link and the date checked. Put the table in the PR body or a dated note under `docs/`. Keep the sentence only if the survey supports it, and qualify it with the survey date ("as of <month year>, we found no tool that…").
   - **Fallback:** if the survey is not done or does not support the claim, remove the "unoccupied" sentence and the "only claim made here" framing. Describe the combination as the design choice it is, without a uniqueness claim.
   - Either way, the "verbatim" wording in the same sentence follows PR 1.

**Verify:**
- The PR body records the command sequence and client prompts so the run can be reproduced. Dates, IDs, and model wording may differ, but the published block is the actual output.
- If the demo produced both cases, rename, rebind, and unresolved are spelled out only in "An example". Otherwise the two-sentence unresolved fallback is in the hash bet.
- `identity-confirm`, the sticky binding, and the disagreement line appear once, under "A dead reference".
- The same-path gap appears in the hash bet and once in "Show what you can't place".
- `grep -n "unoccupied" docs/overview.md README.md` returns nothing, unless the PR body links a dated survey that supports it.

### PR 5 — cases the mechanics page states too late, or overstates

Starts after PR 2 (same file).

1. **Opening.** Replace "the first thing a stateless assistant can't have", "accrues by itself", and "quietly records". The client writes a line because the server's instructions told it to; the hook lifts the last one it finds; a later session can recall it; the server runs no model.
2. **"Note identity", right after *Resolves*.** A path that still exists is not checked, even when its bytes changed. The stored hash makes the comparison possible; rutter does not report it. Point at "What rutter can and cannot establish".
3. **"Dormant is computed, never stored".** Keep the reason (threshold changes need no migration). State the threshold: 180 days, `config.positionDormantAfterDays`, a starting guess rather than a calibrated figure (source: the comment in `src/config.ts`).
4. **"Positions: capturing a stance".** Replace "Kind is the only thing that routes it. There is no content inspection." Kind selects `assert`, `revise`, `reaffirm`, or `retire`; the stance prose is not classified; two strings inside it are read (a `[[wikilink]]` becomes a versioned reference; `revises: <event-id>` records the replaced event), and neither is removed from the stored text.
5. **`README.md`, position-capture bullet.** Same correction to "routed by directive kind alone (no heuristics)". Not the server-instructions quote.
6. **Heading "Old, dense entries still read clearly".** Rename to match the body (suggested: "Old entries stay dense. The answer does not have to."). `grep` for `old-dense-entries` first; keep the id or update every anchor.
7. **"You can read and edit it" bullet.** Add that a hand edit is outside the append-only rule and nothing detects it.

**Verify:** the opener no longer says memory accrues by itself. The same-path case sits beside *Resolves*. The dormant paragraph names 180 days and calls it a guess. "No content inspection" is gone from the mechanics page and the README bullet. The renamed heading agrees with its first sentence.

### PR 6 — client-specific setup and control guidance

Starts after PR 5 (getting-started and shared mechanics settled). Content organization, not installer engineering. Builds on PR 2's Grok preamble rather than replacing it.

1. Let readers choose their client before following commands. Preserve the Claude Code fast path; give each other client an uninterrupted sequence with its own environment, registration, hook, and trust requirements.
2. Keep the checkable milestones and troubleshooting. Distinguish writing a test record by hand from verifying ambient capture, and capture success from recall success.
3. Explain how to detect missing capture, pause it, and remove an unwanted record where supported. Document actual behavior; an absent feature must not become an implied promise.
4. Explain the data boundary: local storage and no model in the server do not establish what the connected client sends to its provider. Make no unsupported provider guarantees.

**Verify:** each client path is internally complete; control instructions match current behavior; shared mechanics live in reference material rather than duplicated across paths.

## Engineering track — PR 7, changed-content detection

Not a docs PR. Goes through the flow process (flow-spec → ratify → gen → cull → ship), subject to decision 1 and observed need, not a desired headline. Rough shape, to be specified rather than assumed:

1. A `spec/` scenario: a reference whose path exists but whose current hash differs resolves as **changed** (distinct from resolved-by-rename and unresolved), carrying stored hash, current hash, and capture date.
2. Evaluate `resolveRef` in `src/identity.ts` as the integration point. Confirm which read surfaces expose reference status.
3. Render it where refs already render, in the same plain style as "unresolved".
4. Measure hash cost on the real vault; the reindex pass or a cached mtime+size check may be needed.
5. Tests: unchanged, edited in place, edited then renamed (stays unresolved), deleted.
6. Document when comparison happens; if at reindex, report freshness rather than promising a live check.

**After it ships:** update the overview's "not built" paragraphs, the trust-boundary "cannot establish" bullet, the mechanics note-identity sentence from PR 5, the example (add an edited-note step with real output), and the README; then port and rehash. Describe byte changes without claiming semantic invalidation or reconstruction of the original note.

## After each PR merges — gh-pages port

Same procedure as [`docs-site-revision-plan.md`](./docs-site-revision-plan.md) ("After each PR merges"):

1. Hand-port the changed prose. Keep heading ids other pages link to (`#step-6`, `#make-the-path-stick`, `#note-identity`, `#the-style-contract`, `#what-rutter-can-and-cannot-establish`, `#positions-capturing-a-stance`). If PR 4 or PR 6 moves sections, preserve or redirect these ids.
2. If PR 5 changes the dense-entries heading id, update the in-page reference in the same port.
3. Update `sources.json` and the footers to `main@<short-hash>`.
4. Diff each page's visible text against its markdown before pushing (`site-drift` never reads the HTML). Anchor check; curl external links. Then `npm run site-drift` on `main` after the port is up.

## Done when

- Every surviving "verbatim" claim on the overview, lesson, and README means "not rewritten for style". The mechanics page owns the full explanation of normalization and the 2,000-character cut; the overview and setup guide summarize and link to it.
- The dedupe rule is stated with its real key (session id, normalized text, reference paths) and its no-session-id exception.
- The uniqueness claim is either backed by a dated survey or gone.
- The host section and the lesson agree with the directive section: each firing keeps the last directive in the text it reads.
- A Grok reader has one preamble, clip included, matching the README; every client has a complete setup path.
- The overview opens with the outcome and a getting-started link, then a real, reproducible example, and tells the rename story once.
- The mechanics opener, dormant threshold, same-path edit, and position-routing sentences match the sections under them.
- **First-time-reader check:** the outcome, audience, current limitations, and setup route are identifiable from the opening and example without reading the architecture argument.
- **Claims check:** captured assertions, byte fingerprints, automatic checks, historical content, and model-reading evidence are never treated as interchangeable.
- The port checks passed for each PR, and `npm run site-drift` is green.

## Review sources

- [Live overview](https://ruttermemory.com/), [Getting started](https://ruttermemory.com/getting-started.html), [Memory of use](https://ruttermemory.com/memory-of-use.html).

The 2026-10-09 reviews evaluated public content, not runtime correctness. Implementation assertions here remain items to verify during execution. No visual findings are included.
