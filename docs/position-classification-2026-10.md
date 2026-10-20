---
type: report
status: in-progress
created: 2026-10-20
updated: 2026-10-20
domain: capture
---

# Positions investigation: results so far

Companion to `docs/positions-plan.md`. 1.2 is in `docs/instruction-limits-2026-10.md`. This file holds the 1.3 and 1.4 results as they land.

## 1.3: reclassifying past session records (partial)

- **Corpus:** frozen primary window 2026-10-02 to 2026-10-19, 303 entries. Count bands were re-fixed from a 40-entry pilot (9 of 40 older entries held a cross-project claim; 4 of 40 with source `user`): often is 5 or more per 100, rare is 2 or fewer per 100.
- **Pass 1** (Claude, rubric from plan 1.1): 144 claims in 132 entries; 49 cross-project (33 world, 16 person), 15 of those sourced to the user.
- **Pass 2** (Codex, blind): 232 claims in 145 entries; 44 cross-project.
- **Agreement (plan matching rule):** claim agreement 0.585 against a 0.7 gate, **failed**. Scope agreement 0.891, passed. Source 0.855, replaces 0.755. Codex flagged many more project-scope implementation details (85 of its 99 unmatched claims).
- **Status:** the 1.3 reading is not formally closed. The rubric rerun is deferred. On the pass-1 count (49 against an often line of 16) the reading would be often, but that count is unadjudicated and summary recall (the completeness check) has not been measured.

## 1.4: can session records answer belief questions? (baseline arm R)

**Question set:** 20 questions, 19 scored. Q20 (the wish-log cross-month check) is reported separately: the decisions it concerns predate the records, and the question was mis-posed (the wish was a check of past predictions against outcomes). Q7 and Q13 are excluded: no belief was ever stated as one. Q8 was marked changed after the fact, on Robin's report that the rule updated an earlier acceptance. Q17 and Q18 concern private job-search matters; details are withheld.

**Method:** a fresh client per question, using only `librarian-search` and `librarian-recent`. Robin judged each answer.

**Result: Short.** 5 of 17 scored questions passed all four points (29%): Q1, Q10, Q16, Q17, Q18. The Short line is 40% or less. Of the 6 changed questions (Q1, Q2, Q8, Q10, Q15, Q19), 2 passed trajectory.

| Cause | Count | Questions |
|---|---|---|
| Missing: the record shows the action but not that the user decided it (or has no record at all) | 11 | Q2, Q3, Q4, Q5, Q6, Q8, Q9, Q11, Q12, Q14, Q15 |
| Retrieval: the record exists but the answering client did not reach it | 1 | Q19 |
| Reasoning | 0 | |

**Main cause: missing.** Most failures are attribution: the session line says what was chosen, not that the user chose it. The three clearest cases (Q2, Q3, Q4) are choices Robin confirms making, in records that do not say so.

**Caveats:**
- Several answering clients filtered to `project=rutter` and read only the newest 30 to 40 sessions. Older work sits under the earlier project name `my-librarian`. Q19's ruling is in three records dated 2026-08-05 and was never reached.
- This session's own records were in the index while the baseline ran.
- The questions are drawn from one week and mostly one repo.
- Pass and fail judgments are Robin's; the cause classification is the investigator's.

## Direction (from Robin, 2026-10-20)

Test a lighter fix than marks: name the actor in the session line only when the user ruled, corrected or chose the item, and keep any reason they gave. No schema change. Standing rules the user states belong in CLAUDE.md or project guidance, not rutter, so they are out of scope. The 1.6 Part 3 replay is the test before any trial.

## 1.6 Part 3: replay of the actor wording

**Test:** 12 saved sessions (those behind the confirmed decisions), each replayed turn by turn by a fresh client under three instruction texts, one run each. The scored unit is whether the session line credits the user for a decision the user made (19 decisions Robin confirmed; the scoring below is the investigator's first read and Robin judges).

| Variant | Wording added to the style paragraph | Decisions credited to the user | Lines naming the user |
|---|---|---|---|
| A (today) | none | 1 of 19 (5%) | 6 of 60 |
| B | "credit a decision to the user only if they made, ruled on or corrected it. Keep any reason given" | 8 of 19 (42%) | 15 of 62 |
| C | "credit the user whenever they directed, chose, ruled on or corrected it. Keep any reason given" | 16 of 19 (84%), plus 3 partial | 55 of 65 |

**Reading:** the 60% bar is cleared by C and missed by B. B worked when the user chose among options and failed on plain instructions ("rutter is lower case", the version number, "don't mention Claude Code"). C also credited those.

**Risks:**
- **Relayed reviews:** in 9 lines C credits the user for review findings pasted from another reviewer (e.g. "after Robin's review"). A and B made none. Robin ruled (2026-10-20) that pasting a review is tacit approval, so these are not counted as false credit; no extra clause is needed.
- C names the user on most lines (55 of 65), including routine requests such as commit and merge. That blurs the signal "the user ruled on this" against "the user asked for this".
- One run per variant, so some of the lift may be noise. B's lines left `refs` empty more often than A's (46 of 73 against 33 of 74); not yet checked for C.
- Replay clients are not real rutter clients, and one client addressed the user as "you" instead of the configured label.
- Budget: C comes to 2,029 characters against Grok's 2,033 (4 spare).

**Scoring rule (Robin, 2026-10-20):** "requested" and "asked" do not count as crediting a decision; only decided, ruled, chose or corrected do. Re-scored on that rule:

| Variant | Credited, strict rule |
|---|---|
| A | 1 of 19 |
| B | 6 of 19 (32%) |
| C | 12 of 19 (63%), up to 14 of 19 (74%) if "per the user's instruction" (#16) and "at the user's direction" (#19) are accepted |

Dropped under the strict rule: #1 ("asked for"), #12, #14 ("at the user's suggestion"), #17, #18. Ambiguous and counted: #5 ("set"), #8 and #9 ("per the user"). C still clears the 60% bar, narrowly on the firm count.

### Variant E (Robin's trimmed wording, 2026-10-20)

Wording, in the style paragraph: "...(terms the vault uses are fine); credit the user when they decided, chose, ruled on or corrected it, not for asking. Keep any reason given. Aim for 40 words and stop by 60 -- one line, not a build log; stored verbatim." (Robin's draft read "corrected ," with the word "it" missing; the test used "corrected it,".) Length 2,023 characters, 10 under Grok's limit.

| Variant | Credited, strict rule | Lines naming the user | Request-type credits ("request", "asked", "suggest", "per the user", "go-ahead", "direction", "instruction") | Decision-type credits ("ruled", "chose", "decided", "corrected", "settled", "approved") |
|---|---|---|---|---|
| A | 1 of 19 | 13 of 74 | 13 | 12 |
| B | 6 of 19 | 19 of 73 | 14 | 10 |
| C | 12 to 14 of 19 | 68 of 80 | 50 | 11 |
| E | 13 of 19 (68%) | 46 of 70 | 26 | 17 |

E credits the user for the decisions C did and clears the 60% bar, with about half C's request-type noise and the most decision-type credits of any variant. The misses under the strict rule: #1 tagline (credited as "at the user's request"), #14 version ("as the user suggested"), #10 standalone path for every client (not recorded), #12 voice guides, #17 dotfiles, #18 decision-vs-position (credited as "at the user's request"). The relayed-review lines read "Robin's review finding, accepted", consistent with Robin's tacit-approval ruling.
