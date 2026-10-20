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

**Revised 2026-10-19 after the decision-vs-position research.** The research
(`~/knowledge-vault/Notes/Reference/Deep-Research/2026-10/19-decision-vs-position/research-output.md`,
kept in Robin's vault, not this repo) found that decision/position is a sound philosophical
pair but a poor labeling cut for session lines. Robin directed that the plan adopt the
**carry-forward cut** instead (1.1), and that Section 1 then work out how positions and
trajectories are derived from it (new 1.6). Where this revision changed a mechanism,
the section says so. Count bands in 1.3 are marked for re-fixing before anything runs.

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

- **Added 2026-10-19: the research.** Full report and sources are in the vault path above.
  - On 28 hand-coded lines from the older records (2026-07-26 to 10-01), decision/position
    sorted 12 cleanly (43%). Standing rules, corrections, situational facts and bundled
    lines had no bin.
  - No outside field draws this line. In IBIS, "position" means a candidate answer to a
    question, not a held belief.
  - Cheaper cuts exist. "Would a later session need this to avoid contradicting or
    redoing it?" worked better, with a scope (project, person, world) and a source (user
    or assistant).
  - Single coder, small hand-picked sample, older window only. It's a hypothesis for 1.3
    and 1.4 to test.
- **Added 2026-10-19: the baseline moved.** The positions file now holds four events, not
  two: the two above, a definition written by the research session itself, and a Codex
  preference ("keep using Codex's default model for now"). None is a principle or thesis.

These are signs, not conclusions. They're consistent with "the capture design failed"
and with "the concept is weaker than assumed". Section 1 exists to tell those two apart.

---

# Section 1: Investigation and validation

## The options Section 1 chooses between

| Option | What it means | What it costs |
|---|---|---|
| **A. Separate position capture** (current) | Keep the dedicated `librarian-position` directive and fix its instructions. | The client has to decide which channel to use every turn. |
| **B. Carry-forward mark on the session line** *(revised 2026-10-19; the research's recommendation)* | An optional mark on the session directive: scope (project, person, world), source (user or assistant), and an optional pointer to the line it replaces. Positions and trajectories are derived from marked lines at read time (1.6). | A change to the `session-record@1` schema and to capture routing, plus the derivation design in 1.6. |
| **C. Derive at read time, no marks** | No new capture. `librarian-positions` (or a new query) builds trajectories from unmarked session records when asked. | Answer quality depends on the session summaries. The client does the reasoning at query time. |
| **D. Retire positions** | Remove the position directive and tool. Session search covers belief questions. | Loses the explicit supersession chain the decision-graph design wanted. |

B and C now differ only in whether the writer adds a mark. Both derive at read time. The
earlier B (a `position` field with kind, topic and stance) is dropped. It asked the writing
model to make the same decision-or-belief judgment A does.

## 1.1 Definitions

**Status (2026-10-19): adopted.** Robin directed that the carry-forward cut replace
decision/position as the rubric for 1.3. The evidence is the research report (see Intent).
It is a hypothesis, and 1.3 and 1.4 are what test it.

The old pair is retired as a labeling scheme. It's still a fair description of two kinds
of mental state (a commitment to act, and a view of the world), but a model labeling one
past-tense sentence at the end of a session can't reliably tell them apart. In the 28-line
sample, rules, corrections, facts and bundled lines fell between the two.

### The cut

A **carry-forward item** is something a later session would need in order not to
contradict or redo it. A session line stays the unit of capture. A line, or part of one,
becomes a carry-forward item when this test says yes:

> *If a session starts later on this work, or on different work, does it need this to avoid
> contradicting or redoing what was settled?*

Not carry-forward: what was done, status, and findings that expire with the artifact they
describe. The session line records those as it does today.

Each item carries three marks:

| Mark | Values | What it answers |
|---|---|---|
| **Scope** | `project`, `person`, `world` | How far does it reach? `project`: binds later sessions in this effort only (a ruling, a craft decision, a parked item with a reopening trigger). `person`: about the user (a standing rule for how to work with them, a preference, a circumstance). `world`: a claim about tools, markets or how things work, held apart from any one project. |
| **Source** | `user`, `assistant` | Whose word is it? `user`: the user stated, ratified or corrected it ("Robin decided", "operator ruled"). `assistant`: the assistant found or recommended it and nothing in the line shows the user adopting it. |
| **Replaces** | none, or a pointer to the earlier line | Does it overturn something? A correction, reversal, supersession or retirement all count. Within one session the pointer is a "replaces my previous line" link. Across months it's a topic match found at read time (1.6). |

Optional: **until** (a date or trigger) for items that go stale, such as "still employed"
or "parked until an official directory exists".

**Kinds** (rule, principle, preference, fact, falsifier, correction, thesis, verdict) come
from the research taxonomy. The labeling passes may note one for analysis, but the writing
model is never asked to pick it.

**Where the old words go.** A *decision* is a session line, the unit that already works.
A *position* is a derived view over carry-forward items (1.6), not a thing the writer
asserts. The `decision+position` label is retired.

### Worked examples

| Session record | Carry-forward? | Scope | Source |
|---|---|---|---|
| Not pursuing a Codex self-hosted marketplace; it can't be officially listed and adds little | yes | `world`: an unlisted self-hosted marketplace isn't worth the cost over manual setup | user |
| No action on Antigravity until an official directory exists | yes | `project`, until an official directory exists | user |
| Grok gets a native hook file (route A) | yes | `project` | user |
| New rule: no dead verdict without an artifact-trail second witness | yes | `person` | user |
| Robin is still employed at Knapsack, so the opening is present tense | yes | `person`, until his status changes | user |
| Purple is the user's favorite color | yes | `person` | user |
| Recommended against applying: the comp band opens $56K below the floor | yes | `person` or `project` | `assistant`, unless a later line shows Robin adopting it |
| Spec v0.11.0 promoted | no | | |

### Counting rule for later sections

Counts that used to be "positions" now read **cross-project carry-forward items**: scope
`person` or `world`. These are the closest match to the old definition, a belief that
outlasts any one piece of work. `project` items are labeled and reported separately.

**Exit:** met by Robin's direction on 2026-10-19. Formal ratification in `spec/spec.md`
happens in Section 2, and only for options A to C. The name is open (see 2.0).

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

## 1.3 Reclassifying past session records: do carry-forward items occur?

*(Revised 2026-10-19: labels moved from decision/position to the 1.1 carry-forward cut.)*

This measures two things: whether carry-forward items come up often enough to be worth
marking, and whether two independent readers can label them the same way. It doesn't
assume how they should be recorded.

### Corpus

- **Primary:** the session entries from 2026-10-02 through 2026-10-19 inclusive, frozen by
  date (303 entries when counted 2026-10-20; the plan first said 294). It is a test corpus,
  so entries written after 2026-10-19 are out. No one reads these before the labeling
  passes run.
- **Pilot:** 40 entries drawn from the older window (2026-07-26 to 2026-10-01), spread
  across projects. Used to dry-run the label instructions and to calibrate the count bands
  below. Not counted in any result.
- **Secondary:** the 531 earlier entries. Run this set only if the primary result falls
  in the ambiguous band below.

### Method

The unit of labeling is the **claim**, not the entry. An entry can hold more than one
(bundled lines like "ratified Phase 0 and a buyer pivot" are common in the older records),
and two readers could otherwise pick different claims in the same entry and still agree.

1. One client session reads the records. For each entry it lists the claims that pass the
   1.1 test, and for each claim records: the **verbatim span** from the entry, scope
   (`project`, `person`, `world`), source (`user` or `assistant`), whether it replaces an
   earlier line, and a proposed topic and one-line statement. It may note a kind and an
   "until". An entry with no such claim gets `none`.
2. **Agreement check:** a second, independent pass (Codex) does the same without seeing the
   first. Agreement is measured **on positives only**, not across all entries. Most
   entries hold no carry-forward claim, so overall agreement would pass even if the passes
   shared nothing (one pass finding 10 and the other 0 still agrees on 96.6% of 294).
   - **Matching rule:** one-to-one. A pair is a candidate when the two claims come from
     the same entry and their verbatim spans overlap by at least half of the shorter span
     (shared words ÷ words in the shorter span). Pairs are assigned greedily from the
     highest overlap down. Ties go to the pair whose earlier span starts first in the
     entry, then to the lower pass-1 claim number. Each claim joins at most one pair, so
     matched pairs can never outnumber either pass's claims and agreement can't exceed
     1.0. The rule is mechanical so neither pass's reading of "the same claim" can inflate
     agreement.
   - **Segmentation disagreements:** an unmatched claim that is also a candidate with an
     already-paired claim is a split or merge (one pass wrote one broad claim where the
     other wrote several narrow ones). It is not a match. Count and report these
     separately from claims the other pass never found.
   - **Claim agreement:** 2 × (matched pairs) ÷ (claims in pass 1 + claims in pass 2).
     Segmentation disagreements stay in the denominator, so splitting differently lowers
     agreement. It must reach **0.7 or more**. Also report the figure after Robin has ruled
     on the segmentation disagreements. If the gate misses only on the first figure, the
     fix is segmentation guidance in 1.1 (what counts as one claim), then rerun.
   - **Scope agreement** *(new, confirm)*: among matched claims, the share given the same
     scope. It must also reach **0.7 or more**. If either measure misses, the definitions
     aren't sharp enough. Revise 1.1 and rerun before reading anything into the counts.
   - **Small numbers:** the gates apply only when the two passes together labeled 6 or
     more claims (pass 1 + pass 2). Below that, a single disagreement swings the measure
     from 1.0 to 0, so it says nothing about the rubric. Skip the gates and go straight to
     adjudication.
   - **Both passes find none:** claim agreement is 0 ÷ 0, which is undefined, not a
     failure. Record "no carry-forward claims found by either pass", set the count to 0,
     and don't revise the rubric.
   - Source and replaces agreement on matched claims are reported, not gated.
3. **Adjudication:** Robin rules on every one-pass claim, every segmentation disagreement
   (keep the broad claim, or keep the narrow ones), and every matched pair with a different
   scope or source. The scope ruling feeds the cross-project count, so it
   can't be left to either pass.
4. **Counted claims** = matched claims, plus the one-pass claims Robin accepted, each with
   its adjudicated scope and source. Count:
   - claims by scope, and **cross-project claims** (scope `person` or `world`), the figure
     the thresholds read
   - claims by source, with the `assistant`-only share
   - claims marked as replacing an earlier line
   - topics with more than one claim over time, which are candidate trajectories (input
     to 1.6)
   - claims whose topic appears in more than one project
   - **bundling:** the share of counted claims that sit in an entry with two or more
     counted claims, and the share of those entries whose claims differ in scope or
     source. This sizes the list of marks per directive (1.6, D8).
5. List every disagreement between the passes and how it was ruled.

Elsewhere in this plan, "item" means a counted claim.

**Nothing is written to `_librarian/`.** The output is a report. The labeled list also
feeds 1.6.

### Completeness check: do session summaries keep beliefs at all?

Session summaries are themselves a capture channel nobody has checked. A low count in
step 4 can't, on its own, tell "beliefs rarely occur" apart from "summaries leave beliefs
out". The second reading argues for better capture, not retirement. So before the counts
are read, measure how often the summaries keep a belief that was stated in the
conversation. Two independent sources:

1. **Original conversations.** Sample 20 sessions from the primary window, spread across
   projects. Include sessions with no belief-like summary at all, not only the ones with
   one. For each, read the original transcript (`~/.claude/projects/*/<session_id>.jsonl`)
   and list the carry-forward items the user stated or adopted (source `user`, scope
   `person` or `world`; call them "beliefs" below), using the 1.1 rubric. Then check how
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

**Summary recall** has one unit and one matching rule:
- **Unit:** a unique belief. Merge the two sources into one list and deduplicate. A belief
  that appears in both the 20-session sample and the full-window extraction, or twice in
  the full window, counts once. Robin rules on whether two entries are the same belief
  when marking.
- **Origin session:** each belief is tied to the session(s) where the user stated it.
- **Kept:** a belief is kept if a summary from its origin session(s) records it. A
  summary from any other session never counts, even if it mentions the same belief.
- **Recall** = kept unique beliefs ÷ all unique beliefs.

Report the sample-only and full-window figures alongside it for information. The
threshold table reads only the combined, deduplicated figure.

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

### Thresholds (bands to be re-fixed before running)

**Bands re-fixed 2026-10-19 (Robin accepted).** The bands below were fixed for the old unit,
"positions", which was narrow. The unit is now cross-project carry-forward items, which the
older window suggests are far more common: the research found about 38% of older entries
carry something beyond "what was done", and roughly 25 to 40 per 100 fall in kinds that
would be person or world scope. At those rates, "10 or more in 294" is almost certain and
the **rare** rows are close to unreachable. Two things follow:
- The frequency reading is probably **often**. The questions 1.3 can still settle are
  whether two readers label the same way (the agreement gates) and whether summaries keep
  the items (recall).
- The count bands are now set from the 40-entry pilot (below). The agreement gate (0.7)
  and the recall bar (60%) stay as accepted in decision 2.

**Pilot (one reader, no second pass, not counted in any result):** 9 of 40 older entries
held a cross-project claim (22.5%), 4 of 40 (10%) with source `user`. The bands are rates:
**often** at 5 or more per 100, **rare** at 2 or fewer per 100, and **ambiguous** between.
"Rare" sits under a fifth of the strict pilot rate, so reaching it would mean the pilot was
badly unrepresentative. On the frozen primary window of 303 entries: often is 16 or more,
ambiguous 7 to 15, rare 6 or fewer.

Read the count only alongside summary recall. Every combination has a destination, and
each one is one of three readings: **often**, **rare** or **inconclusive**. The numbers in
the table are the new bands for the 303-entry primary window.

| Summary recall | Counted cross-project items in the primary 303 | Reading |
|---|---|---|
| 60% or more | 16 or more | **Often.** Positions come up often and summaries keep them. |
| 60% or more | 7 to 15 | Ambiguous. Run the secondary corpus (below). |
| 60% or more | 6 or fewer (including 0) | **Rare.** |
| under 60% | any | **Inconclusive.** The summaries leave beliefs out, so the count shows how much capture misses, not how often beliefs occur. |
| inconclusive (fewer than 5 beliefs found in 40 sessions and Robin's recognition list) | 6 or fewer (including 0) | **Rare.** The transcripts (with Robin's marking) and the summaries, read separately, all found almost nothing. |
| inconclusive | 7 or more | **Inconclusive.** The summaries hold positions the other two sources didn't turn up, which casts doubt on those sources, not on the summaries. |

### Secondary corpus (only from the ambiguous row)

The older 531 entries (2026-07-26 to 2026-10-01) are read with the same method, the same
two passes and the same adjudication. The thresholds are rates, so the two corpora can be
combined. The bands are rates, 5 per 100 and 2 per 100. On the 303 primary plus
531 older entries (834):

| Counted cross-project items across all 834 entries | Rate | Reading |
|---|---|---|
| 42 or more | 5 or more per 100 | **Often.** |
| 17 to 41 | between | **Inconclusive.** |
| 16 or fewer | 2 or fewer per 100 | **Rare.** |

For example, 10 in the primary corpus and 6 in the secondary make 16 of 834, which reads
as rare.

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
rates, the counts by scope and source, the labeled items, the disagreements and the
reading.

## 1.4 Can session records answer belief questions without position capture?

This is the test that decides between adding capture (a mark on the session line, B, or a
separate stream, A) and deriving from the records as they are (C). If the records already
hold enough, the client shouldn't have to make an extra judgment every turn.

This run is arm R, the **baseline**: plain records, no marks, the client retrieves for
itself. If the 1.5 table points to the capture choice, 1.6 Part 2 reruns the same
questions with identical retrieval for marked and unmarked records, and that comparison is
what tests B.

### Question set

Write **at least 10** belief questions *before* looking at the answers. Fill the set from
these sources, in order, until it reaches 10:

1. The two wish-log cases: the cross-month consistency check (the Kellie letter), and the
   2026-08-05 gate-axis reframe.
2. Beliefs Robin confirmed on the recognition list from the 1.3 completeness check.
   The list comes from transcripts, not summaries, so it can fill the whole set even
   if 1.3 found few items.
3. Cross-project items from 1.3 (scope `person` or `world`, source `user`) whose topic
   appears more than once over time, spread across projects.
4. Cross-project items from 1.3 that appear only once.

If all four sources together give fewer than 10, extract more candidates for Robin to
mark, from saved transcripts older than the primary window (back to 2026-09-21) and
from the wish log. Robin can add any that come to mind. If that still gives fewer than
10, the evidence is **insufficient**: don't run 1.4 with a smaller set. Record how many
questions exist and where each source ran out, and go to the "Insufficient" rows of the
1.5 table.

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
record the cause, checking in this order and stopping at the first that fits:
1. The belief isn't in any session record, or the record has it without a date or reason.
2. A record had the belief but retrieval didn't return it.
3. Retrieval returned complete records (stance, date and source all present) but the
   answer drew the wrong conclusion from them: it confused who held the belief, got the
   chronology wrong, or reported an earlier stance as the current one.

### Thresholds (fixed before running, as proportions of the set)

Every result is exactly one of three outcomes, or **Insufficient** when the question set
couldn't reach 10 (see above):

- **Enough:** 70% or more of questions score on all four points, **and**, if three or more
  questions are marked changed, at least half of those pass trajectory. Both conditions
  are required. This is **the 1.4 acceptance rule**, and later sections refer to it by
  that name rather than restating it.
- **Short:** 40% or fewer score on all four points.
- **Partial:** everything else. That includes 41% to 69%, and 70% or more with the
  trajectory condition failed.

**Main cause:** for Partial and Short, group the recorded failure causes into three kinds:
- **Missing:** the belief isn't in any session record, or it's there without a date or
  reason.
- **Retrieval:** a record had the belief but search didn't find it.
- **Reasoning:** the records were retrieved complete, and the answer still got
  attribution, chronology or the current stance wrong. The records suffice, so this
  isn't a capture problem.

Retrieval and reasoning are both read-side causes: the records are enough, and the fix
is in how they're searched or presented. Group them as **read-side** (with the split
recorded). The main cause is:
- **Missing** if missing failures are more than half.
- **Read-side** if retrieval plus reasoning failures are more than half, however they
  split between the two.
- **Mixed** only when missing and read-side failures are exactly even.

**Output:** add the results to `docs/position-classification-2026-10.md`.

## 1.6 Derivation design: what a position and a trajectory are

*(Added 2026-10-19. Numbered 1.6 so the existing references to the 1.5 verdict stay valid;
it runs before 1.5.)*

1.1 makes the session line the unit of capture and marks some lines as carry-forward
items. It says positions and trajectories are **derived at read time**, which is how
`docs/decision-graph.md` first described them. This section works out what that means
precisely enough to test by hand, before any code. The wish log's primitive is: *a topic's
sequence of items over a date range*. Pairwise comparison, a full narrative, and walking a
chain of supersessions are all queries against that.

The working answers below are hypotheses. 1.6 ends in a document that settles them.

### Questions and working answers

| # | Question | Working answer |
|---|---|---|
| D1 | What is a **position**? | A topic's current carry-forward item or items, at scope `person` or `world`. Strictly a *position* (a belief the user holds) needs source `user` and either two or more items on the topic or the same topic in two or more projects. A single `user` item is a **standing item**, not yet a position. This borrows Dalio's pattern: the durable thing is induced from a series, not announced once. Open: is the recurrence rule needed, or is "newest unreplaced `user` item" enough? |
| D2 | What is a **trajectory**? | The items for one topic in date order, each with date, session id, project, source, scope and the line it replaces, plus the gaps between them. Restatements count: a later item that says the same thing is a reaffirmation, which the reading client recognizes. The server doesn't judge it. |
| D3 | How are items grouped into **topics**? | Not by a writer-supplied key. Free-form keys are a suspect in the 2-in-294 capture miss, and the research found 15 of 22 reversals linked only by words like "corrected". Working answer, in two layers: **(a)** an explicit `replaces` pointer where the writer knows (within a session, the dominant case); **(b)** read-time grouping everywhere else: the server returns candidate items for a topic query, and the client decides which belong to one chain. Alternatives to test: a closed list of live topics injected by the hook; embedding clusters. |
| D4 | What does the **server** do, and what does the **client** do? | The server runs no model. It filters by scope, source and date, searches by topic, sorts by date, and returns items with their marks, ids and the replaces links. The client clusters, judges same-topic, states the current stance, and narrates the change with dates. This matches the SCN-007 precedent: read-time interpretation is an instruction to the client. |
| D5 | How do items **end**? | By being replaced, by their `until` passing, or by dormancy (no reaffirmation for N months, shown as an age, never deleted). Situational facts need `until`; without it they go stale silently ("still employed"). Open: whether the server computes expiry or only displays it. |
| D6 | How is **attribution** shown? | Every item shows its source and the verb that justified it. An `assistant`-only item is labeled "assistant finding, not adopted by the user" and is never presented as the user's belief. |
| D7 | What is the **tool surface**? | Rework `librarian-positions` to return a topic's chain, instead of adding a tool. Pairwise and "how has my thinking moved" are the same call with different date windows. Open: whether a separate `librarian-trajectory` name is clearer for the client. |
| D8 | How are **several claims in one turn** captured? | Within one directive. The parser keeps only the last directive per capture (`src/directive.ts:51`), so two directives in one turn lose the first, and splitting a bundled line into two lines doesn't work. Working answer: the session directive carries an optional list of marks, each with its `scope`, `source`, optional `replaces` and `until`, and a short `about` phrase that names its claim. A cap (3 marks, to fit the budget) is an open number. The alternative, changing the parser to keep every directive in a turn, is a capture change with its own idempotence questions (SR-013, SR-014) and is only chosen if the list form fails the replay. The 1.3 bundling figures size the cap. Existing bundled records stay as written (INV-6); the read side shows their claims unmarked. |

### Parts, and when each runs

**Part 1: design answers (D1 to D8).** Desk work. Runs once the 1.3 labeled list exists,
for every branch that keeps positions (A, B or C). Skipped only when the 1.3 reading is
**rare** and 1.4 doesn't run, since that path goes to D. C needs the derivation answers
too: its tool output comes from D4 and D7.

**Part 2: prototype (below).** Runs only when the 1.5 table points to the capture choice,
that is, when 1.4 ran and ended Partial or Short with a missing or mixed cause, or a
read-side rerun failed. It is the test of B. It doesn't run when the verdict is D or C, and
it can't run when 1.4 was Insufficient (no question set to score). For that case see Part 3.

**Part 3: replay test.** Runs before B or A goes to its 14-day trial, in every capture
path including Insufficient. It tests the instructions, which the prototype can't.

### Part 2: prototype method (no code)

The comparison has to isolate what the marks buy. A hand-built view for B against
self-retrieval for C would credit B with better retrieval and grouping as well. So the
arms differ in only one thing:

1. **Fix the retrieved set.** For each 1.4 question, take every entry the 1.3 labeling
   assigned to the question's topic, items or not, and order them by date. Use the same
   set, order and layout for the arms below.
2. **Arm M (marked).** That set presented in the D7 tool-output shape, with each claim's
   scope, source, replaces link and until.
3. **Arm U (unmarked, same retrieval).** The identical set and layout with all marks and
   replaces links removed. The only difference from M is the marks.
4. **Arm R (self-retrieval).** The 1.4 baseline, reported for reference: plain records,
   the client retrieves for itself.
5. **Score and compare.** Each arm is answered by a fresh client using only that view
   plus `librarian-search` over the plain records, scored on the four 1.4 points, with the
   same acceptance rule.
   - **Classify by the first rule that matches.** "Acceptance" below is the full 1.4
     acceptance rule, including its trajectory condition. Each result lands in exactly one
     outcome:
     1. **Grouping is enough** if U meets acceptance, whatever M scored. Choose C with the
        grouped, dated output from D4 and D7, and no marks.
     2. **Marks help** if U misses acceptance, M meets acceptance, and M beats U by at
        least 20 percentage points on all-four-points *(new, confirm)*. This supports B.
        M must clear the absolute bar. An improvement that still misses acceptance is not
        enough.
     3. **No branch change** for anything else: M misses acceptance, or M meets it by less
        than the margin over a U that misses. Diagnose by main cause, using the 1.4 rules
        (missing, read-side, mixed), and follow the next list.
   - **Outcome 3, by cause.**
     - **Missing** (more than half the failures are beliefs absent from the labeled
       records): the history can't speak to B. Both arms fail on the same absent content.
       Go to Part 3, which tests the new instructions. If the replay clears its bar, B
       goes to trial. Missing content in old summaries is not a reason to prefer A.
     - **Read-side** (more than half are grouping or the client reasoning badly from
       complete chains): fix the D-answers and rerun Part 2 once. If the rerun is still
       outcome 3 with a read-side cause, the outcome is **unresolved: derivation**. Stop.
       Marks wouldn't fix this, so B isn't put on trial. Robin decides among redesigning
       the derivation, living with the 1.4 baseline (C as it is), or retiring (D, only if
       the 1.3 reading was rare).
     - **Mixed:** go to Part 3 as for missing. If B goes to trial, ship the derivation
       improvements alongside it.
   - **M versus R is an upper bound,** not a test: M's set is hand-built from the
     labels. Report it, and don't use it to justify B.
6. **Guard against circularity.** The retrieved set comes from 1.3 labels of the same
   entries some questions might be drawn from. Report questions from the transcript-based
   recognition list (independent of the labels) separately from questions drawn from 1.3
   items. Only the first group can support a "marks help" reading.
7. **Test the within-session case.** Take the minutes-apart reversals the research found
   (a proposal corrected in the same session). Check the `replaces` pointer would have
   linked them, and that grouping by session doesn't hide a stage that mattered.

### Part 3: replay test (the capture instructions)

Retrospective labeling can't recover content the summaries left out. The older records were
written under a 40-word contract that cut the because-clause, and the primary window's
summaries were written while the instructions were truncated. A low retrospective hit rate
is therefore a limit of the history, not proof that B can't capture the content. B changes
the instructions going forward, so test those.

1. Draft the B instruction text, fitted to the measured budget (2.0). Draft the A text too
   if A could be next.
2. Take the sessions behind the confirmed beliefs on Robin's recognition list (1.3,
   completeness check, source 2). The transcripts are already copied to
   `data/positions-investigation/transcripts/`.
3. For each session, have a fresh client replay the transcript and write what it would
   emit at the end of each turn under (i) the current instructions and (ii) the draft B
   instructions.
4. **Score what would be stored, not what was written.** The current session parser
   (`parseSessionDirective`) validates against `{summary, refs}` and strips anything else,
   so it would drop B's marks and can't evaluate B. Use a **scratch parser** instead,
   written outside the repo (in the session scratchpad; Section 1 makes no code changes):
   - It copies the current parser's behavior exactly: the same directive pattern, the last
     directive in the text wins, the same unfilled-template guard, and any failure to
     parse returns nothing.
   - It adds the proposed `marks` list from 2.B: each mark has `scope`, `source`, and
     optional `replaces`, `until` and `about`. A mark with an invalid enum value is
     dropped and the summary is kept, since marks are optional and must not cost the
     line. Marks past the cap (D8) are dropped in order.
   - **Parity check first:** on the existing parser's test fixtures (directives without
     marks), the scratch parser must return the same results as the real one. Otherwise
     the replay is measuring a different parser.
   - For A, use the real `parsePositionDirective`, which is unchanged.

   A belief the model wrote in an earlier directive in the same turn, which the last-wins
   rule dropped, counts as not captured, and so does a mark the scratch parser dropped.
   For each confirmed belief, score: captured or not, and for (ii) whether the mark
   covering it has the right scope and source. Robin judges.
5. **Bar** *(new, confirm)*: (ii) must capture at least 60% of confirmed beliefs and beat
   (i). Destinations:
   - **B clears the bar:** B goes to its 14-day trial. This holds even if Part 2 found
     both arms failing on missing content.
   - **B misses:** run the same replay for A's draft. If A clears the bar, A goes to its
     trial.
   - **Neither clears it:** the outcome is **unresolved: capture** (see "Return after a
     failed trial" in 1.5).

If the recognition list holds fewer than 5 confirmed beliefs, the replay can't produce a
rate. Skip it, record how many there were, and let the 14-day trial be the test.

### Output and exit

**Output:** `docs/position-derivation-2026-10.md`, giving the settled answers to D1 to D8,
the tool-output shape with a worked example, and, when they ran, the Part 2 scores for
arms M, U and R and the Part 3 replay results.

**Exit:** Robin accepts the Part 1 answers. If Part 2 ran, it reached a result (marks
help, grouping helps, or neither) under the rules above. If Part 3 ran, its bar was met or
the path under "Return after a failed trial" was taken.

## 1.5 Verdict

The table covers every combination of the 1.3 reading, the 1.4 outcome and the main
cause.

| 1.3 reading | 1.4 outcome | Main cause | Choose |
|---|---|---|---|
| Rare | not run | — | **D** |
| Rare | Enough | — | **C** (cheap, and the few belief questions still get answers) |
| Rare | Partial or Short | read-side | **C** plus search improvements for the retrieval failures and tool output that labels attribution and sorts by date for the reasoning ones, then rerun 1.4 once. If the rerun isn't Enough: **D**. |
| Rare | Partial or Short | missing or mixed | **D** |
| Rare | Insufficient | — | **D**. Too few beliefs surfaced from any source to build a question set, which agrees with a rare reading. |
| Often or inconclusive | Enough | — | **C** |
| Often or inconclusive | Partial or Short | read-side | **C** plus the matching improvements, then rerun 1.4 once. If the rerun isn't Enough, apply the capture choice below. The improvements have had their chance, so this doesn't send it round again. |
| Often or inconclusive | Partial or Short | missing or mixed | The capture choice below. Search or output improvements can ship alongside it when read-side failures are part of a mixed cause. |
| Often or inconclusive | Insufficient | — | The capture choice below. C is untested, so the 14-day measure of the chosen option is the test. |

**Capture choice (revised 2026-10-19): B on a first pass.** The earlier rules chose
between A and B by the share of `decision+position` versus standalone `position` items.
That label no longer exists. The research found a separate stream asks the writer to make
the same decision-or-belief judgment on every turn, and it found standalone belief lines
are still session lines, so a mark on the line covers them. A stays as the fallback for
the "Return after a failed trial" rule below.

What must pass before B's 14-day trial depends on the row that sent you here:
- **1.4 ran (Partial or Short, missing or mixed, or a failed read-side rerun):** run 1.6
  Part 2, then Part 3 where the outcome sends you there. The three outcomes are exclusive:
  - **Grouping is enough:** choose C with the grouped output and no marks. Part 3 doesn't
    run.
  - **Marks help:** run Part 3. B goes to trial if the replay clears its bar.
  - **No branch change:** follow the cause. Missing or mixed goes to Part 3 and B goes to
    trial if it clears. Read-side gets one rerun of Part 2, then **unresolved:
    derivation** (Robin decides; B is not put on trial).
- **1.4 was Insufficient:** the prototype can't run, since there are fewer than 10
  questions to score. Run Part 3 only. If the replay clears its bar, B goes to trial, and
  the 14-day measure is the test. If it can't produce a rate (fewer than 5 confirmed
  beliefs), B goes to trial on its own.
- **A retrospective miss isn't a verdict on B.** Labeled historical records that lack a
  belief show a limit of the old summaries. Only the Part 3 replay, which tests the new
  instructions, can move the choice from B to A.

After a failed 14-day measure, see "Return after a failed trial" below.

**Return after a failed trial.** The transition depends on which option failed, and
each option gets one trial:
- **A failed:** try **B**.
- **B failed:** try **A**.
- **Both failed:** the outcome is **unresolved**. Stop. Robin decides among redesigning
  capture, C (if 1.4 was Enough or never run), or living without. D stays closed unless
  the 1.3 reading was rare.

Record each trial's result in `docs/position-classification-2026-10.md`. Each option gets
one trial, so a trial that found nothing can't pick itself again.

Summary recall doesn't feature in the capture choice. It measures whether summaries
keep beliefs, which decides whether D is allowed. It doesn't say what shape a capture
channel should take, and low recall is a problem both A and B are meant to fix.

D is reachable only from a **rare** reading. Summaries that leave beliefs out, or evidence
that's inconclusive, never lead to D.

Record the verdict, the evidence and the option chosen in
`docs/position-classification-2026-10.md`. Robin accepts it before Section 2 starts.

### Decisions for Robin in Section 1

Status as of 2026-10-19:

1. Accept the 1.1 definitions as the rubric for 1.3. **Accepted 2026-10-19: the
   carry-forward cut** (scope, source, replaces), replacing decision/position. This
   unblocks 1.3. Still open inside it: the name (see 2.0).
2. Fix the 1.3 and 1.4 thresholds before running: positive agreement 0.7, summary recall
   60%, and the 1.4 proportions. **Accepted** for the agreement gate, the recall bar and
   the 1.4 proportions. **Re-opened 2026-10-19** for the 1.3 count bands, which were set
   for the old unit. Scope agreement (0.7) is new and needs confirming. Set the bands from
   the pilot (1.3, Corpus) before the primary window is read.
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
7. Settle the derivation design (1.6 Part 1, D1 to D8): what a position and a trajectory
   are, how topics are grouped, what the tool returns, and marks per line. **Open.** Start
   from the working answers in 1.6. Robin accepts or changes them after the 1.3 labeled
   list exists.
8. Confirm the pilot approach for the 1.3 count bands, and the new gates: scope agreement
   (0.7), the claim-matching rule, the 20-point marks-help margin, the replay bar (60%)
   and the bundling limit (25%). **Part accepted 2026-10-19:** the pilot approach, the count bands and the primary window
   (frozen by date, 2026-10-02 to 2026-10-19). **Still open:** the new gates listed here.

**Do first, whatever else waits:** copy the 1.3 sample transcripts before they age out
(about 2026-11-01). **Done 2026-10-19.** All 61 Claude Code transcripts on disk are
copied to `data/positions-investigation/transcripts/`, which is gitignored.

---

# Section 2: Execution (conditional on the Section 1 verdict)

Only the branch Section 1 chose runs. Every branch shares the first two steps.

## 2.0 Shared steps

- **Ratify the definitions.** Put the 1.1 carry-forward definitions (scope, source,
  replaces), as revised by 1.3, and the 1.6 answers for position and trajectory into
  `spec/spec.md` as a glossary entry. This applies to every option except D. Under D,
  record them in the retirement note instead.
- **Fix the budget test's provenance.** Update `test/instructions-budget.test.ts` and
  `src/server.ts` to cite `docs/instruction-limits-2026-10.md`. If the clients' limits
  differ, make the test use the smallest observed limit and name the client.
- **Vocabulary.** Decide the name for the mark and the derived view. "Position" collides
  with IBIS, where it means a candidate answer to a question, and with the marketing sense
  of "positioning" that already shows up in session records. Candidates: "carry-forward"
  or "standing" for the mark; "position" kept only for the derived view in 1.6 (D1). Keep
  the existing code and tool names (`librarian-positions`) unless 1.3 shows them causing
  misfiles, since renaming a tool breaks installed clients.

## 2.A Branch A: fix separate position capture

*(Fallback from 2026-10-19: B is the first-pass choice. A runs after B fails, or if the
1.6 Part 3 replay shows marks can't carry the content.)*

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
- **Otherwise:** A has failed. Try B once (see "Return after a failed trial" in 1.5).

## 2.B Branch B: carry-forward mark on the session line

*(Rewritten 2026-10-19. The earlier B added a `position` field with kind, topic and
stance. That asked the writer for the decision-or-belief judgment this plan dropped.)*

1. Add an optional mark to the session directive: `scope` (`project`, `person`, `world`),
   `source` (`user`, `assistant`), an optional `replaces` pointer to the writer's previous
   line, and an optional `until`. A directive may carry a short list of marks, each naming
   its claim (1.6, D8), because the parser keeps only the last directive per capture and a
   second directive in the same turn would be lost. Additive to `session-record@1`, so this
   needs a spec decision on the session schema invariant. The marks are omitted on lines
   that aren't carry-forward items, which is most of them. The parser must validate the
   list per mark, dropping an invalid mark and keeping the summary, and keep today's
   last-directive-wins rule (the Part 3 scratch parser is the reference for this).
2. Capture-cli stores the marks with the session entry, with no second event and no topic
   key. The separate `librarian-position` directive is accepted for one release, then
   removed (see 2.D step 2 for retiring the writer).
3. Instructions: one line, framed as the 1.1 test ("if a later session would need this to
   avoid contradicting or redoing it, mark its scope and whose word it is"). A standalone
   statement of preference ("purple is my favorite color") is a session line with a
   mark, so removing the separate directive leaves no belief without a route. The line
   should keep its reason when it has one, since the 40-word contract cut reason-bearing
   lines from about 55% to 30% (see the research). Within the measured budget.
4. Read side: build the derived view as settled in 1.6 (D1 to D8), reworking
   `librarian-positions` to return a topic's chain with marks, dates and session ids.
5. Same spec, test and README steps as 2.A, plus the schema change and the new tool output.

**Backfill:** older records carry no marks. Don't rewrite them (INV-6). The read side
treats unmarked lines as unmarked and still searches them.

**Measure (registered before shipping), over 14 days:**
- **Unit:** the mark, not the line. A line may carry several marks, and bundling must not
  change the result: five valid claims in two lines score the same as five lines.
- **Duplicates:** a mark is **distinct** unless Robin rules that it restates an earlier
  mark's claim with the same scope and source (incremental capture can restate). Such a
  restatement is reported but left out of every count below. A mark that changes the
  scope or source, or carries `replaces`, is distinct.
- **Judging:** a mark is judged correct or not on three points: the `about` phrase names
  a real claim in the line, the scope is right, and the source is right. Robin judges
  every distinct mark when there are 60 or fewer. Above 60 *(new, confirm)*, the two
  success measures are evaluated separately so that sampling affects only one of them:
  - **Correctness rate:** judge a random sample of 60 distinct marks, drawn from all
    distinct marks regardless of scope or source. The rate is correct marks in the sample
    ÷ 60. This is the only place the sample is used, and the report states the
    denominator and the number of distinct marks it was drawn from.
  - **Five qualifying marks:** this is a count, so a sample can't establish it. Take every
    distinct mark with scope `person` or `world` and source `user` (the qualifying set),
    in date order, and judge them one at a time until five are correct or the set runs
    out. These checks sit outside the random-sample percentage. A mark that falls in both
    is judged once and counted in both.
- **Success:** at least 5 correct qualifying marks (the count above); a correctness rate
  of at least 70% (the sampled rate, or all distinct marks when there are 60 or fewer);
  and at least one chain where a later mark replaces an earlier one (by pointer or by
  read-time grouping).
- **Otherwise:** B has failed. Try A once if A hasn't been tried; otherwise the outcome is
  unresolved (see "Return after a failed trial" in 1.5). Rerun the 1.4 questions against
  the live tool when the 14 days end.

## 2.C Branch C: derive at read time

1. Remove the position directive from the instructions. That frees about 370 characters
   of budget.
2. Rework `librarian-positions` to answer from session records: search by topic, sort by
   date, and return the matched entries with dates and session ids. The tool reports what
   it found; the client turns it into a stance. The output shape comes from 1.6 (D4, D7),
   minus the marks, since C writes none.
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

## 2.E Actor-credit session line: trial and no-regression check

*(Registered 2026-10-20, before the release. Covers the fix shipped in PR #149. This is
for us, not an end-user feature.)*

**Window:** 14 days from the first day the released wording runs in Robin's own install.
Start date: _to be filled in at release_.

**Measure (primary):**
- **Unit:** each session line that credits Robin (says Robin decided, chose, ruled on or
  corrected something).
- **Check:** at day 14, list every credited line from `_librarian/sessions/`. Robin marks
  each "real decision" or "just a request", blind to the session it came from.
- **Success:** at least 70% are real decisions, and at least 10 credited lines exist.
- **Failure:** below 70%, or fewer than 10 credited lines. The fix has used its one
  trial (see "Return after a failed trial" in 1.5); the same wording is not retried.
- Also record lines that credit Robin for only asking, as examples for the next attempt.

**No-regression check (guardrail):** the wording change must not weaken decision logging
in general. Baseline is the 14 days before the change (2026-10-06 to 2026-10-19):
12 active days, 286 session lines (about 24 per active day), median 38 words,
0.3% over the 60-word ceiling, 4 position-stream entries in October. At day 14 compare
the same figures for the trial window. The guardrail fails if any of these holds:
- lines per active day fall by more than 25% (about 18 or fewer);
- median length drops below 25 words, or more than 5% of lines exceed 60 words;
- Robin finds, in a blind sample of 20 lines, that fewer lines than before keep a stated
  reason (the credit clause says to keep it; losing reasons would be the regression);
- position lines stop appearing where the user stated a belief (spot check of 5 known
  cases).
A guardrail failure holds the release even if the primary measure passes.

**Standing automated check:** `test/instructions-budget.test.ts` pins that the credit rule,
the keep-the-reason rule, the session directive, the cadence and the position-line syntax
all sit inside the first 2,033 characters, so a later wording edit cannot silently push
any of them out of reach of the tightest client. It cannot show a model still follows
them; that is what the day-14 comparison is for.

## Sequencing

1.1 and 1.2 are done. 1.3 starts once the count bands are re-fixed from the pilot
(decision 8, now settled for the bands). 1.4 needs the 1.3 report for its questions and can run its baseline once the
question set is approved. 1.6 Part 1 needs the 1.3 labeled list and runs on every branch
that keeps positions. Parts 2 and 3 run only when 1.5 points to the capture choice: Part 2
needs the 1.4 question set, Part 3 needs the recognition list. 1.5 needs 1.3 and 1.4, plus
whichever parts of 1.6 apply. Section 2 starts only after Robin accepts the 1.5 verdict,
and runs one branch. No code changes in Section 1.
