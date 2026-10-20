---
type: plan
status: proposed
created: 2026-10-19
updated: 2026-10-19
domain: capture
---

# Positions: investigation, then execution

## Intent and scope

Position capture shipped on 2026-08-13. Since then it has recorded two positions, both on
2026-10-19, against 826 session entries. This plan has two sections:

- **Section 1: Investigation and validation.** Find out whether the need for recorded
  positions is real, and which approach meets it. This section doesn't assume that
  position capture as built, or any capture at all, is the right answer. It ends in a
  verdict that picks one of four options.
- **Section 2: Execution.** Carry out whichever option Section 1 picked. Nothing in
  Section 2 starts before that verdict is accepted, and only the chosen branch runs.

Not in scope: changing how session records are captured or stored.

---

## Background: what the first look found (2026-10-19)

- **For seven weeks the instruction never reached the client.** From 2026-08-13 to
  2026-10-01 the position line started at character 2,937 of about 4,245, past Claude
  Code's reported 2,048-character cutoff (v0.3.0 CHANGELOG). So the real trial is about
  17 days: 294 session entries and 2 positions.
- **The two captured positions aren't positions.** `grok-install-route` is a decision
  ("Grok gets a native hook file (route A)…"). `grok-docs-assume-claude-code` is a
  known-gap fact. Both came from sessions in the rutter repo.
- **Belief-like content ends up in session summaries.** 43 of the 294 entries use decision
  or stance wording (a crude keyword count, so an upper bound). Examples: "Decided not to
  pursue a Codex self-hosted marketplace… adds little over the manual setup"; "take no
  action on Antigravity until an official directory exists"; "Recorded the user's
  decision that purple is their favorite color".
- **The capture instruction pulls the wrong way:**
  - It asks about the wrong person: "When **you** form… a stance" (`src/server.ts:93`).
  - It discourages use: "rare (most sessions emit none)". It's also tacked on with "too"
    after a session trigger that already covers stances.
  - Nothing tells the client to look up existing topic keys before a `revise`.
  - The Copilot (`hooks/install-hook.mjs:241`) and Muse (`:627`) rules files open with a
    paragraph that pushes only the session line.
- **The build drifted from the design.** `docs/decision-graph.md` describes positions as "a
  projection over the event log, not a second thing you maintain." Phase A of
  `docs/decision-graph-plan.md` made them a separate stream the client writes at the
  moment the stance forms.
- **Every client's capture text includes the position line.** Too few non-Claude records
  exist (8) to judge how those clients behave.
  - *Added 2026-10-19:* for Codex, the shortfall isn't Codex's choice. Codex 0.163.0
    hides server instructions until a rutter tool loads, so the capture instruction
    effectively never reached it (`docs/codex-instructions-plan.md`). The near-zero
    Codex count (1 record) says nothing about how Codex handles beliefs.
- **The demand evidence came from the wish log.** Two entries (2026-08-11 and 2026-08-12):
  a cross-month consistency check done by hand (the Kellie letter), and recurring
  mid-session belief drift. Both ask for a *trajectory over time*, not necessarily a
  separate capture stream.

These are signs, not conclusions. They're consistent with "the capture design failed"
and with "the concept is weaker than assumed". Section 1 exists to tell those two apart.

---

# Section 1: Investigation and validation

## The options Section 1 chooses between

| Option | What it means | What it costs |
|---|---|---|
| **A. Separate position capture** (current) | Keep the dedicated `librarian-position` directive and fix its instructions. | The client has to decide which channel to use every turn. |
| **B. Stance on the session line** | An optional position field on the session directive, so one line holds both. | A change to the `session-record@1` schema and to capture routing. |
| **C. Derive at read time** | No position capture. `librarian-positions` (or a new query) builds trajectories from session records when asked. | Answer quality depends on the session summaries. The client does the reasoning at query time. |
| **D. Retire positions** | Remove the position directive and tool. Session search covers belief questions. | Loses the explicit supersession chain the decision-graph design wanted. |

## 1.1 Definitions

Any of the four options needs a sharp line between a decision and a position. Even option
D needs one to say what it's giving up. Right now the vocabulary blurs them:

| Where | Word used | What it actually points at |
|---|---|---|
| Session trigger | "decides or produces" | anything settled, including beliefs |
| Position trigger | "form… a stance" | the assistant's view, as worded |
| Recall routing | "what do I think about X?" | the user's belief |
| Session records | "positioning plan" | marketing positioning (an unrelated sense of the word) |
| Design doc | "position", with history | a belief that can be revised |

### Working definitions (draft, used as the rubric for 1.3)

**Decision**: a choice about what to do, tied to a specific piece of work.
- It has an object: this PR, this release, this install route, this chapter.
- It's settled by acting on it. A later decision on the same work replaces it.
- Test: *does it answer "what did we do, or what will we do?"*

**Position**: a belief the **user** holds that outlasts any one piece of work and would
shape future decisions.
- It belongs to the user. An assistant's recommendation becomes a position only once the
  user states or adopts it.
- It holds across projects and time, and it can be revised by evidence or argument.
- Test: *would this still answer "what do I think about X?" six months from now, on a
  different project?*

**Neither**: facts, status and known gaps.

**Where they meet: the "because" clause.** Many beliefs show up as the reason for a
decision: "Decided not to pursue X **because Y**." X is the decision. Y is a candidate
position if it passes the six-month test.

| Session record | Decision | Position (if any) |
|---|---|---|
| Not pursuing a Codex self-hosted marketplace; it can't be officially listed and adds little | skip the Codex marketplace | an unlisted self-hosted marketplace isn't worth the cost over manual setup |
| No action on Antigravity until an official directory exists | park Antigravity | don't build distribution ahead of an official directory |
| Grok gets a native hook file (route A) | route A | none |
| Purple is the user's favorite color | none | favorite color: purple |

**Status (2026-10-19):** undecided. Robin is researching the definitions.

**Exit:** Robin accepts the draft as the rubric for 1.3. Formal ratification in
`spec/spec.md` happens in Section 2, and only for options A to C.

## 1.2 The 2,048-character limit

**Status (2026-10-19): done.** Results are in `docs/instruction-limits-2026-10.md`:
- **Claude Code** 2.1.301 and 2.1.304, and **Codex** 0.163.0, pass at least 4,000
  characters of instructions and tool descriptions.
- **Grok** 1.0.62 keeps 2,033 characters of each, counted in characters, then appends
  "… [truncated]". Grok is now the client that sets the budget.
- **The 4,260 versus 4,245 gap** was the default label "the user", which appeared 5
  times.
- **Budget test:** it now uses 2,033 and counts the label's occurrences. The current
  instructions are 1,940 characters.

The text below is the plan as written before the measurements.

### Current evidence

There's one observation: a Claude Code debug log line, "Server instructions truncated from
4260 to 2048 chars," quoted in `src/server.ts:69`, `test/instructions-budget.test.ts:6`,
`spec/spec.md:19` and commit `6e1083e`. Nothing records which Claude Code version produced
it, and there's no link to Anthropic documentation. The log says 4,260 characters where
our own count was 4,245, a gap nobody explained. The budget test applies the limit to every
client, although only Claude Code was observed.

This matters for every option. The instructions are 1,940 characters now. The position
line starts at character 1,574 and its directive syntax at 1,666, leaving about 100
characters of headroom. The limit decides whether options A and B can have clearer
instructions at all, and how much room option D frees up.

### Questions and method

| # | Question | Method |
|---|---|---|
| L1 | Is the limit documented? | Search the Claude Code docs, the Claude Code changelog and the MCP specification. Record the URL and quote, or record "undocumented". |
| L2 | Does the installed Claude Code still truncate, and where? | Run a throwaway local MCP server (not the rutter plugin) whose instructions are about 4,000 characters, with numbered markers every 250. Start `claude --debug`, then capture the log line and the version from `claude --version`. Ask the model to quote the last marker it can see. |
| L3 | Is the unit characters, bytes or tokens? | Repeat L2 with multi-byte text (for example, an em dash every 10 characters) and compare the cutoff. |
| L4 | Why 4,260 rather than 4,245? | Recompute the length with the user label as it was configured then. Check whether the count includes the label or line-ending normalization. |
| L5 | Do Codex and Grok cut off, and where? | Same marker-server probe in each. Ask the model for the last marker. Record version and limit, or record "no cutoff observed at about 4,000". |
| L6 | Are tool descriptions cut off? | The read-time guidance moved into the `librarian-recent` and `librarian-positions` descriptions. Option C would put more there. Probe a long tool description the same way. |

The probes run locally against a scratch server. Nothing is deployed, and the rutter
plugin isn't modified.

**Output:** `docs/instruction-limits-2026-10.md`, with one row per client giving version,
date, limit, unit, method and evidence (log line or quoted marker).

**Exit:** every client that reads the server instructions has a measured limit (or a
recorded "none found") with a version and date.

## 1.3 Reclassifying past session records: do positions occur?

This measures whether user positions come up often enough to be worth recording. It
doesn't assume how they should be recorded.

### Corpus

- **Primary:** the 294 session entries from 2026-10-02 to 2026-10-19.
- **Secondary:** the 532 earlier entries (2026-07-26 to 2026-10-01). Run this set only if
  the primary result falls in the ambiguous band below.

### Method

1. One client session reads the records and, for each entry, assigns one label using the
   1.1 rubric: `decision`, `position`, `decision+position`, or `neither`. For every
   position it writes a proposed topic and a one-line stance in the user's voice.
2. **Agreement check:** a second, independent pass labels the same entries without seeing
   the first pass, using a different model if one is available. Agreement is measured
   **on positives only**, not across all entries. Most entries are plainly not positions,
   so overall agreement would pass even if the passes shared no positions at all (one
   pass finding 10 and the other 0 still agrees on 96.6% of 294). The measure is positive
   agreement: 2 × (entries both passes label a position) ÷ (positions in pass 1 +
   positions in pass 2). It must reach **0.7 or more**. Below that, the definitions aren't
   sharp enough. Revise 1.1 and rerun before reading anything into the counts.
   - **Small numbers:** the gate applies only when the two passes together labeled 6 or
     more positions (pass 1 + pass 2). Below that, a single disagreement swings the
     measure from 1.0 to 0, so it says nothing about the rubric. Skip the gate and go
     straight to adjudication.
   - **Both passes find none:** positive agreement is 0 ÷ 0, which is undefined, not a
     failure. Record "no positions found by either pass", set the count to 0, and don't
     revise the rubric.
3. **Adjudication:** Robin rules on every entry that only one pass labeled a position.
4. **Counted positions** = entries both passes labeled a position, plus the disagreements
   Robin accepted. Count:
   - distinct positions
   - the share labeled `decision+position` versus standalone `position` (this feeds the
     A-versus-B choice)
   - topics with more than one stance over time, which are candidate trajectories
   - positions that span projects
5. List every disagreement between the passes and how it was ruled.

**Nothing is written to `_librarian/`.** The output is a report.

### Completeness check: do session summaries keep beliefs at all?

Session summaries are themselves a capture channel nobody has checked. A low count in
step 4 can't, on its own, tell "beliefs rarely occur" apart from "summaries leave beliefs
out". The second reading argues for better capture, not retirement. So before the counts
are read, measure how often the summaries keep a belief that was stated in the
conversation. Two independent sources:

1. **Original conversations.** Sample 20 sessions from the primary window, spread across
   projects. Include sessions with no belief-like summary at all, not only the ones with
   one. For each, read the original transcript (`~/.claude/projects/*/<session_id>.jsonl`)
   and list the beliefs the user stated or adopted, using the 1.1 rubric. Then check how
   many of them appear in that session's summaries.
2. **Robin's recognition list.** *(Changed 2026-10-19: Robin can't reliably write the
   list from memory, so recognition replaces recall.)* Read every saved transcript in
   the primary window, not just the sample, and extract candidate beliefs using the 1.1
   rubric. Work from the transcripts only, never the session summaries, so the list
   stays independent of what's being measured. Robin marks each candidate "yes, I
   believe this", "no", or "used to, changed". Confirmed beliefs, including changed ones,
   form this source. Check how many appear in any session summary. Robin doesn't see any
   classification output until the marking is done.

Both sources now come from transcripts, so they aren't fully independent of each
other. Robin's marking filters out misreadings, but beliefs never stated in a Claude
Code conversation are missed by both. The report records this as a limitation.

**Summary recall** is the share of beliefs from both sources that a summary kept.

**Too few beliefs to measure recall.** If the two sources together find fewer than 5
beliefs, recall isn't a meaningful percentage. That doesn't prove the summaries are
complete, so it never counts as 60% or more. Extend the transcript sample once, to 40
sessions (or every session in the window if there are fewer), and recompute.
- **5 or more beliefs found:** compute recall as normal.
- **Still fewer than 5:** recall is **inconclusive**. Use the "inconclusive" row of the
  threshold table. In that row the transcripts, read twice (the sample, and the full
  window with Robin's marking), have failed, separately from the summaries, to turn up
  beliefs. That's evidence about how often beliefs
  occur, and it doesn't rely on the summaries being complete.

**Time limit:** Claude Code keeps transcripts for about 30 days (the oldest on disk is
dated 2026-09-21). Transcripts from the primary window start ageing out around
2026-11-01. Copy the 20 sampled transcripts to a scratch folder before then, or the
first source is lost.

### Thresholds (fixed before running)

Read the count only alongside summary recall. Every combination has a destination, and
each one is one of three readings: **often**, **rare** or **inconclusive**.

| Summary recall | Counted positions in the primary 294 | Reading |
|---|---|---|
| 60% or more | 10 or more | **Often.** Positions come up often and summaries keep them. |
| 60% or more | 4 to 9 | Ambiguous. Run the secondary corpus (below). |
| 60% or more | 3 or fewer (including 0) | **Rare.** |
| under 60% | any | **Inconclusive.** The summaries leave beliefs out, so the count shows how much capture misses, not how often beliefs occur. |
| inconclusive (fewer than 5 beliefs found in 40 sessions and Robin's recognition list) | 3 or fewer (including 0) | **Rare.** The transcripts (with Robin's marking) and the summaries, read separately, all found almost nothing. |
| inconclusive | 4 or more | **Inconclusive.** The summaries hold positions the other two sources didn't turn up, which casts doubt on those sources, not on the summaries. |

### Secondary corpus (only from the ambiguous row)

The older 532 entries (2026-07-26 to 2026-10-01) are read with the same method, the same
two passes and the same adjudication. The thresholds are rates, so the two corpora can be
combined. The primary bands work out to about 3.4 per 100 entries (10 of 294) and 1.0 per
100 (3 of 294):

| Counted positions across all 826 entries | Rate | Reading |
|---|---|---|
| 28 or more | 3.4 or more per 100 | **Often.** |
| 9 to 27 | between | **Inconclusive.** |
| 8 or fewer | 1.0 or fewer per 100 | **Rare.** |

For example, 6 in the primary corpus and 2 in the secondary make 8 of 826, which reads as
rare.

Two caveats go in the report with this reading. Summary recall was measured on the
primary window only, and most older transcripts have already aged out, so it can't be
rechecked. The older summaries were also written while the instructions were cut off, so
the style rules never reached them. If the secondary rate is less than half the primary
rate, record "the older summaries may keep fewer beliefs" and downgrade a **rare**
reading to **inconclusive**.

### What each reading leads to

- **Often:** go on to 1.4.
- **Rare:** the only route to D. 1.4 is optional. Run it only if Robin wants to test
  option C before retiring.
- **Inconclusive:** go on to 1.4. An inconclusive result never leads to D. 1.4 then
  chooses among A, B and C on its own evidence.

**Output:** `docs/position-classification-2026-10.md`, covering the method, the agreement
rate, the counts, the proposed positions, the disagreements and the reading.

## 1.4 Can session records answer belief questions without position capture?

This is the test that decides between capturing positions (A or B) and deriving them
(C). If the records already hold enough, the client shouldn't have to make an extra
judgment every turn.

### Question set

Write **at least 10** belief questions *before* looking at the answers. Fill the set from
these sources, in order, until it reaches 10:

1. The two wish-log cases: the cross-month consistency check (the Kellie letter), and the
   2026-08-05 gate-axis reframe.
2. Beliefs Robin confirmed on the recognition list from the 1.3 completeness check.
   The list comes from transcripts, not summaries, so it can fill the whole set even
   if 1.3 found few positions.
3. Positions from 1.3 that appear more than once over time, spread across projects.
4. Positions from 1.3 that appear only once.

If all four sources together give fewer than 10, extract more candidates for Robin to
mark, from saved transcripts older than the primary window (back to 2026-09-21) and
from the wish log. Robin can add any that come to mind. The set never drops below 10.

Each question has the form "what do I think about X, and has that changed?" Mark each
one in advance as **changed** or **stable**. Robin's "used to, changed" mark on the
recognition list carries over as **changed**.

### Method

For each question, a fresh client session answers using only `librarian-search` and
`librarian-recent` over session records. It can't use `librarian-positions` or the 1.3
report. Score each answer on four points:

1. **Stance:** it states the user's current belief correctly.
2. **Date:** it dates when that belief formed or last changed.
3. **Source:** it cites the session records it relied on.
4. **Trajectory:** for **changed** questions only, it shows the earlier stance and when
   it changed. Stable questions count as passing this point.

Robin judges correctness, since only Robin knows what Robin believes. For each failure,
record the cause: the belief isn't in any session record, retrieval missed a record that
has it, or the record has it but without a date or reason.

### Thresholds (fixed before running, as proportions of the set)

Every result is exactly one of three outcomes:

- **Enough:** 70% or more of questions score on all four points, **and**, if three or more
  questions are marked changed, at least half of those pass trajectory. Both conditions
  are required. This is **the 1.4 acceptance rule**, and later sections refer to it by
  that name rather than restating it.
- **Short:** 40% or fewer score on all four points.
- **Partial:** everything else. That includes 41% to 69%, and 70% or more with the
  trajectory condition failed.

**Main cause:** for Partial and Short, group the recorded failure causes into two kinds:
- **Missing:** the belief isn't in any session record, or it's there without a date or
  reason.
- **Retrieval:** a record had the belief but search didn't find it.

A kind that accounts for more than half of the failures is the main cause. Otherwise the
cause is **mixed**.

**Output:** add the results to `docs/position-classification-2026-10.md`.

## 1.5 Verdict

The table covers every combination of the 1.3 reading, the 1.4 outcome and the main
cause.

| 1.3 reading | 1.4 outcome | Main cause | Choose |
|---|---|---|---|
| Rare | not run | — | **D** |
| Rare | Enough | — | **C** (cheap, and the few belief questions still get answers) |
| Rare | Partial or Short | retrieval | **C** plus search improvements, then rerun 1.4 once. If the rerun isn't Enough: **D**. |
| Rare | Partial or Short | missing or mixed | **D** |
| Often or inconclusive | Enough | — | **C** |
| Often or inconclusive | Partial or Short | retrieval | **C** plus search improvements, then rerun 1.4 once. If the rerun isn't Enough, apply the capture choice below. Search has had its chance, so retrieval doesn't send it round again. |
| Often or inconclusive | Partial or Short | missing or mixed | The capture choice below. Search improvements can ship alongside it when retrieval is part of a mixed cause. |

**Capture choice (A or B):** apply these in order and stop at the first that fits.
1. Fewer than 6 counted positions: **B**. That's too few for a majority to mean anything,
   so choose the cheaper option to try. Its 14-day measure (2.B) sends it back to this
   table if it fails.
2. More than half of the counted positions were labeled `decision+position`: **B**. Beliefs
   arrive as the reasons for decisions, so they belong on the decision's line.
3. More than half were standalone `position`: **A**.
4. No majority: **B**, for the same reason as rule 1.

Summary recall doesn't feature in the capture choice. It measures whether summaries
keep beliefs, which decides whether D is allowed. It doesn't say what shape a capture
channel should take, and low recall is a problem both A and B are meant to fix.

D is reachable only from a **rare** reading. Summaries that leave beliefs out, or evidence
that's inconclusive, never lead to D.

Record the verdict, the evidence and the option chosen in
`docs/position-classification-2026-10.md`. Robin accepts it before Section 2 starts.

### Decisions for Robin in Section 1

Status as of 2026-10-19:

1. Accept the 1.1 working definitions as the rubric for 1.3. **Undecided.** Robin is
   researching. This blocks all of 1.3, since both labeling passes and the transcript
   extraction use the rubric.
2. Fix the 1.3 and 1.4 thresholds before running: positive agreement 0.7, summary recall
   60%, and the 1.4 proportions. **Accepted.**
3. Choose the second model for the 1.3 agreement pass. **Codex.** It's an internal
   cross-check of the rubric. Codex reads a file of summaries and needs no rutter
   connection, so the Codex instruction gap (`docs/codex-instructions-plan.md`) doesn't
   affect it.
4. ~~Write the independent belief list~~ **Replaced** by the recognition list (1.3,
   completeness check, source 2). Robin marks candidates extracted from transcripts
   before seeing any classification output.
5. Adjudicate the 1.3 disagreements.
6. Approve the 1.4 question set, with each question marked changed or stable, before it's
   run.

**Do first, whatever else waits:** copy the 1.3 sample transcripts before they age out
(about 2026-11-01). **Done 2026-10-19.** All 61 Claude Code transcripts on disk are
copied to `data/positions-investigation/transcripts/`, which is gitignored.

---

# Section 2: Execution (conditional on the Section 1 verdict)

Only the branch Section 1 chose runs. Every branch shares the first two steps.

## 2.0 Shared steps

- **Ratify the definitions.** Put the 1.1 definitions, as revised by 1.3, into
  `spec/spec.md` as a glossary entry. This applies to every option except D. Under D,
  record them in the retirement note instead.
- **Fix the budget test's provenance.** Update `test/instructions-budget.test.ts` and
  `src/server.ts` to cite `docs/instruction-limits-2026-10.md`. If the clients' limits
  differ, make the test use the smallest observed limit and name the client.
- **Vocabulary.** Decide whether to keep "position" in code and use "stance" or "belief"
  in prose, or rename. The recommendation is to keep the code name unless 1.3 shows
  "positioning" causing misfiles.

## 2.A Branch A: fix separate position capture

1. **Make the trigger about the user's belief.** Replace "When you form, change,
   reaffirm, or retire a stance" with wording about the user, built on the ratified
   definitions and the "because" rule.
2. **Drop "rare (most sessions emit none)".** Replace it with a concrete rule: decisions
   and status never get a position line.
3. **Reuse topic keys.** Tell the client to call `librarian-positions` with `query` before
   a `revise` or `reaffirm`, so supersession chains can form.
4. **Copilot and Muse opening paragraphs.** Mention the position line on the same footing
   as the session line.
5. **Budget.** Fit the measured limit (2,033, Grok). The rewrite must be no longer
   than the text it replaces. Detail goes into the tool description and the README.

**Spec and tests:** amend SR-056. Move the literal anchors in `adoption.test.ts` (twice)
and `clarity.test.ts` deliberately. Regenerate the README contract block (SR-027). Rerun
the installer tests for Copilot, Muse and Antigravity.

**Measure (registered before shipping), over 14 days:**
- **Success:** 5 or more real user positions, at least 70% of position lines are actual
  positions, and at least one `revise` or `reaffirm` that reuses an existing key.
- **Otherwise:** go back to the 1.5 table with the new data. Option B is the next
  candidate.

## 2.B Branch B: stance on the session line

1. Add an optional `position` field (`kind`, `topic`, `stance`) to the session directive.
   Additive to `session-record@1`, so this needs a spec decision on the session schema
   invariant.
2. Capture-cli writes the session entry as now, and also writes a position event linked
   to it by entry id. The separate `librarian-position` directive is accepted for one
   release, then removed.
3. Instructions: one line about the field, framed as "if the decision rests on a belief
   that will outlast this work, add it". Within the measured budget.
4. Same spec, test and README steps as 2.A, plus the schema change.

**Measure:** the same 14-day criteria as 2.A.

## 2.C Branch C: derive at read time

1. Remove the position directive from the instructions. That frees about 370 characters
   of budget.
2. Rework `librarian-positions` to answer from session records: search by topic, sort by
   date, and return the matched entries with dates and session ids. The tool reports what
   it found; the client turns it into a stance.
3. Move the attribution guidance ("this is what the user recorded, dated…") into the tool
   description.
4. Retire the position writer as in 2.D step 2. Removing the instruction alone isn't
   enough, because capture-cli still extracts and stores directives.
5. Keep the existing position stream in the vault as history (it's append-only and is
   never rewritten), but nothing new is written to it.
6. Spec: retire SR-047 to SR-057 (capture), and restate SCN-011 (recall) against session
   records.

**Measure:** rerun the full 1.4 question set against the new tool, the same questions
with the same changed or stable marks. Success means meeting the 1.4 acceptance rule in
full (see 1.4, "Enough"). Otherwise, go back to the 1.5 table with the new result.

## 2.D Branch D: retire positions

1. Remove the position directive from the instructions and the installer rules files.
2. **Retire the writer.** Removing the instruction doesn't stop capture.
   `src/capture-cli.ts:139` still calls `runPositionCapture` on every Stop event, and
   `positionDirectiveSourceText` (`:396`) also accepts a direct `position` field in the
   payload. Rules files already installed on other machines, sessions started before the
   upgrade, and models that remember the old grammar can all keep emitting directives.
   Remove the call and the payload route.
   - **Older directives:** a `librarian-position` comment or `position` field that arrives
     after retirement is not stored. Capture-cli writes one stderr line saying position
     capture is retired. The session line in the same turn is captured as normal, since
     the two tags are parsed independently (`src/position-directive.ts`) and can't be
     confused with each other.
   - **Tests:** a turn carrying both directives writes the session entry and no position
     event, and the session entry is byte-identical to a turn with no position directive.
     A bare `position` payload writes nothing.
3. Remove `librarian-positions`, or keep it read-only over the existing stream for one
   release with a retirement notice. Either way the existing stream stays in the vault
   untouched, because it's append-only history.
4. Write a short retirement note in `docs/` recording the 1.3 and 1.4 evidence, so the
   decision can be revisited if the evidence changes. Name what would change it: a new
   wish-log entry asking for trajectories, or 1.3 rerun over a later corpus.
5. Update `docs/decision-graph.md` and `docs/decision-graph-plan.md` to say the position
   layer was retired, and why.

## Sequencing

1.1 and 1.2 can run in parallel. 1.3 needs the 1.1 draft. 1.4 needs the 1.3 report for
its questions. 1.5 needs both. Section 2 starts only after Robin accepts the 1.5 verdict,
and runs one branch. No code changes in Section 1.
