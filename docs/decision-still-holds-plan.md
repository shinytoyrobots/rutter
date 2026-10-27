---
type: plan
status: proposed
created: 2026-10-26
updated: 2026-10-26
domain: recall
---

# Does this decision still hold? A read-time check

## Intent

When Robin asks "what did I decide about X?", the answer should also show whether anything
later touched that decision: a later session line on the same subject, or a change to a note
the decision cited. The server lists what it finds, in date order. The client tells it as a
history and judges whether the decision still holds. The server's own text never says "superseded"
or "still holds", because that is a judgment, and INV-6 keeps judgment off the read path.
Quoted session lines are verbatim and may contain those words.

Source: the 2026-10-26 opportunity scan, which ranked this first (score 336). Stale memory
applied as if current is a well-evidenced pain, and no platform memory checks decisions.
Kept in Robin's vault: `Notes/Reference/Invention-Skills/opportunity-scan/2026-10/26-rutter-memory/`.

Constraints (Robin, 2026-10-26):
- **On request only.** No unprompted recall: no hooks that push records into a session.
- **No instruction budget.** The server instructions are within about 10 characters of
  Grok's 2,033-character limit. Everything new lives in tool output and tool descriptions.
- **No model in the server.** Matching and grouping are deterministic.

Not in scope: changing how session lines are captured or stored, and positions capture
(that is `positions-plan.md`).

## What exists today (checked 2026-10-26)

- **No topic search over session lines.** `_librarian/` is in `config.ignoreDirs`, so it is
  outside the notes FTS index. `librarian-recent` filters by project, window and count
  only. Today a client finds a past decision by reading the newest sessions, or indirectly
  through prior-engagement notes on note search. That is the 1.4 retrieval failure (Q19:
  the ruling sat in 2026-08-05 records the client never reached).
- **Session refs carry content hashes.** Each ref is `path` plus `sha256` as read
  (`src/refs.ts`), and the identity projection (SCN-008, SCN-009) resolves renames.
  514 of 1,039 session entries have at least one ref, so the "note changed since" check
  covers about half the records.
- **`librarian-recent` already reads every session file on every call**
  (`readAllRecords` in `session-record.ts`). Today that is 76 files and 1.5 MB, parsed in
  about 20 ms cold and 5 ms warm (measured 2026-10-26). The cost grows without limit,
  though: at roughly 350 entries a month, three years is about 1,100 files and 18 MB, with
  every call paying the YAML parse for all of them. A topic search must not copy this
  pattern (Robin, 2026-10-26).
- **Robin's older records sit under the project name `my-librarian`.** This is specific to
  Robin's vault: every other user has only ever had `rutter`, so the product handles no
  earlier project names (Robin, 2026-10-26). It matters only for measuring in Robin's
  vault (see Measure).

## Design

### 1. Search session lines by topic

Free-text match over session summaries, using the same rule as `librarian-search` (all
terms must match, case-insensitive). Optional project filter and date range. Results come
oldest first, because the answer is a history. Order is an `ORDER BY` on the index, so it
costs nothing extra.

Each result shows: date and time, project, client, session id, the summary verbatim, and
its refs.

**One timeline, no repeats.** Matches and their later related lines form a single
date-ordered timeline. A line appears once, however many matches it relates to. When a
later line is itself a match, it sits in the timeline as a match and earlier matches point
to it by id instead of repeating it.

**Pages, without hiding the latest.** A page holds 10 matches, oldest first. When there are
more, the page also shows the newest match, pinned at the end and labeled "latest match", and
states what was skipped: "matches 1–10 and 37 of 37; 26 between them omitted. Pass
`page: 2` to continue." The origin and the latest word are both always on the first page,
so a reversal can't fall off the end. Paging is a plain `page` number over a stable order
(date, then entry id), so the client can fetch any page.

**Index, not file scans.** Session lines go into the SQLite index the server already keeps:
a `session_entries` table (one row per line: day, time, project, client, session id,
summary, refs with hashes) and an FTS5 table over the summaries. The files stay the source
of truth. The index is a projection of them, like the notes and position tables.

**Keeping it fresh without a rescan.** Captures are written by the hook, a separate
process, so the server can't know about them in advance. On each query:
1. List the sessions folder and stat each day file. Even at 1,100 files this is a few
   milliseconds, and no file is opened.
2. Re-read only files whose size or modified time differs from what the index recorded.
   Usually that is just today's file.
3. Replace that day's rows in one transaction, so a concurrent reader never sees the day
   empty.

A full rebuild still happens wherever the existing startup check would rebuild. The hook
never writes to the database: capture stays file-only, as SR-055 requires.

**Side benefit, separate work:** `librarian-recent` could read from the same table and lose
its full scan. That is not part of this plan, because it changes a shipped tool's data path.

### 2. For each match, list what came later

Two deterministic signals, each shown under the match it belongs to:

- **Later lines on the same subject.** Session lines dated after the match that either
  match the same query, or cite a note the match cited (identity-resolved, so renames
  count). Lines matching the query are already in the timeline, so this adds only the
  shared-note lines, labeled "later, cites the same note". At most 5 per match: the **5
  newest**, so the latest related line is never the one dropped. The count of any left out
  is stated, with how to get them: `expand: <entry id>` returns every related line for
  that match, paged the same way.
- **Cited notes changed since.** For each ref on the match, compare the recorded hash with
  the current hash of the identity-resolved note. Shown as "note N has changed since this
  line (now modified YYYY-MM-DD)". A missing or ambiguous note uses the SCN-009 wording.

### 3. Say what's missing

Every answer ends with what the server could not see, stated plainly, not guessed:
- "No later lines matched" (never "still holds").
- "This line cites no notes, so changes to notes can't be checked."
- When a page or a related list omitted lines, the totals and the parameter that
  retrieves them.

### 4. Tool description

The description tells the client to tell the result as a dated history, crediting whoever
the line credits, and to leave the "does it still hold?" judgment to the reader when the
later lines are ambiguous. This lives in the tool description, not the instructions, so it
costs no budget. It is also the "history-shaped answer" Phase 5 of the roadmap describes.

## Where it lives: depends on the positions verdict

Routing is the expensive part. A new tool needs a routing line in the instructions, and
there's no budget for one. The instructions already send "what do I think about X?" to
`librarian-positions`, so the check goes there, and the routing text stays as it is.

**That routing is an assumption, not a fact.** The instructions name "what do I think?"
questions. They don't name "what did I decide?" or "does it still hold?", so the tool
description has to carry those. A routing test settles it before the build is called done
(see Measure). If clients don't reach the tool, the fixes in order are: the tool
description, then a routing line in the instructions with a budget check.

| 1.5 verdict | What this plan becomes |
|---|---|
| **C** (derive at read time) | This *is* 2.C step 2: `librarian-positions` answers from session lines. Build it as 2.C, with the signals above added. |
| **B** (mark on the session line) | Same search, with marked lines ranked first and labeled. |
| **A** (separate position stream) | Session-line results sit alongside the stream's chain in the same answer. |
| **D** (retire positions) | Not authorized by the verdict. `positions-plan.md` 2.D removes `librarian-positions` or keeps it read-only for one release, which is a different thing. Repurposing it for decisions would be a separate proposal, decided after the readout. Without it, this plan needs a new entry point and a routing line, with a budget check. |

`librarian-positions` already takes `query` (free text over stances). Under A, B and C,
`query` also searches session lines, and the answer marks which source each result came
from.

This replaces decision-graph Phase C (drift over positions) for session lines. Phase C's
unprompted exit no longer fits (roadmap, 2026-10-26).

## Spec work (before code, flow process)

- **New scenario SCN-014:** "a past decision is recalled with what came later, on request".
  Given/when/then for: a match with a later related line; a match whose cited note changed;
  a match with no refs; no later lines.
- **Requirements:**
  - a session index that is a projection of the day files, refreshed by stat on each query,
    re-reading only changed files, and never written by the capture hook;
  - deterministic matching (same rule as search);
  - oldest-first order, one timeline with no repeated lines;
  - pages of 10 with the newest match pinned on every page and the omitted count stated;
  - the later-related cap of the 5 newest, its stated count, and `expand` to retrieve the rest;
  - hash comparison through the identity projection;
  - the gap statements;
  - no verdict words ("superseded", "still holds", "outdated") in server-authored text:
    labels, headers, gap statements and notices. Quoted session lines are exempt, because
    they are verbatim. Pinned by a test;
  - output is read-only, and stateful calls are logged like the other recall tools (SCN-004).
- If the verdict is C, restate SCN-011 against session lines, as 2.C step 6 already says.

## Tests

- Search: all-terms match; project and date filters; oldest-first; summary byte-verbatim.
- Later-related: by shared ref and by a renamed ref; the 5 newest are kept; the omitted
  count is stated; `expand` returns all of them.
- Timeline: a line related to two matches appears once; a later match is not repeated
  under an earlier one.
- Pages: 37 matches give page 1 with matches 1–10 plus the pinned 37th and the omitted
  count; `page: 2` continues; the order is stable across calls.
- Changed note: hash mismatch shows the change; an unchanged note shows nothing; missing
  and ambiguous notes use the SCN-009 wording.
- Gaps: each statement appears exactly when its condition holds.
- Verdict words: no server-authored string contains them. A fixture session line
  containing "superseded" renders byte-verbatim, and the test still passes.
- Index freshness: a line captured after startup is found on the next query; an unchanged
  folder re-reads no file; a changed day file replaces only that day's rows; a reader
  running during a refresh never sees the day missing.
- Scale: with a synthetic 1,100-day folder (about 13,000 lines), an unchanged-folder query
  stays under 50 ms, and no query parses more than the changed files.

## Measure

- **Primary: retrieval, on a frozen corpus.** Compare the existing tools (arm R) with the
  new tool (arm N) on the **same frozen copy** of `_librarian/sessions/`, so the only thing
  that differs is retrieval. Freeze the copy at the moment the 1.4 baseline started
  (2026-10-20), so later sessions, including discussions of this evaluation, can't supply
  answers. Session records are append-only, so the copy can be rebuilt at any time by
  keeping only entries timestamped before the cutoff. Run both arms fresh on that copy; don't reuse the 2026-10-20 arm R result,
  because its clients also saw that day's records.
  - **Denominator:** the 1.4 set has 20 questions. Q20 is reported separately, and Q7 and
    Q13 are excluded (no belief was stated), so **17 are scored**. The historical 5 of 17
    is context, not the comparison.
  - **Success:** N meets the 1.4 "Enough" rule, and passes at least 2 more of the 6
    changed questions on trajectory than R does on the same copy.
  - **Failure:** the cause classification says where to look. A retrieval miss in N means
    the matching rule needs work. A miss in both arms because the record lacks the
    decision is a capture problem, not this tool's.
- **Capture is scored separately.** Whether newer records credit Robin better is the
  actor-credit trial's question (`positions-plan.md` 2.E). It is not mixed into this
  measure.
- **Routing.** Without naming any tool, ask each of the three most-used clients
  (Claude Code, Codex, Grok) 10 prompts: "what did I decide about X?", "does my decision
  on X still hold?", and "what do I think about X?" for real topics. Record which tool each
  client calls. Success: at least 8 of 10 reach `librarian-positions` on each client.
- **Staleness check:** Robin names 5 decisions that were later reversed or worked around.
  For each, does the answer show the later line or the changed note? Success is 4 of 5.
- **Noise check:** for 5 decisions that were never revisited, the answer should show no
  later lines, or only lines Robin judges related. More than 2 unrelated "later" lines on
  average means the shared-ref rule is too loose.

Run the rerun without a project filter, or with both `rutter` and `my-librarian`, so
Robin's older records are reachable. This is a measuring step for Robin's vault, not a
product feature.

Run the comparison after the build. Its timing doesn't depend on the trial, because both
arms use the frozen copy.

## Sequencing

1. Wait for the trial readout (2026-11-03) and the 1.5 verdict. The verdict fixes the row
   in the table above. Under D, the entry point needs its own decision first.
2. Spec entries (SCN-014 and its requirements), with Robin's approval.
3. Build: the session index and its refresh, then search, then later-related, then changed
   notes, then gaps. Each is shippable alone.
4. Measure (frozen-corpus comparison, routing test, staleness and noise checks), and record
   the results in `docs/position-classification-2026-10.md`.
5. Release, with a changelog entry and a GitHub Release made by hand.

## Open questions for Robin

1. **Matching rule.** All terms must match (same as note search) is predictable, but it
   misses rewordings. Allow a fallback to any-term matching with a stated notice, or let the
   client retry with fewer words?
2. **Later-related by query.** Is a later line matching the same query terms a good enough
   signal, or should only shared refs count, which is stricter and covers half the records?
3. **Positions in the same answer.** Under A or B, show stream positions and session lines
   in one date-ordered list, or as two sections?
4. **Under D.** If positions are retired, propose repurposing `librarian-positions` for
   decisions, or give this check a new entry point and spend budget on its routing line?
   A separate decision after the readout.
