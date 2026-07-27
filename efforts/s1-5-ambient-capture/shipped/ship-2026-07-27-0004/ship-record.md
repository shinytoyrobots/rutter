# Ship record — ship-2026-07-27-0004

**Date:** 2026-07-27
**Effort:** s1-5-ambient-capture
**Spec:** v3.2.0 (SCN-007 recall clarity; SR-021..023) — HITL-approved 2026-07-27
**Suite:** 0.5.0 (+COR-R-025..027, +COR-A-012)
**Variant:** gen-4/var-1 (documentation bias) @ `6e72150`, single-variant hotfix-style generation
**Merge:** `13f109d` (--no-ff) on `feat/output-clarity`; spec/suite base `a2531a6`
**Ship type:** FULL (adversarial cull compensating for no chavruta, per hotfix dispatch rule)

## What shipped

Wish-log finding #3 (2026-07-26): session summaries were authored in build-session
jargon and needed a translator at recall time. Fix, per the wish's own design sketch:

1. **Authoring style contract** for `librarian-session` summary directives — write
   for a smart reader in a hurry who was not in the session; lead with what was
   decided or produced; common words over session shorthand; expand or avoid
   session-local codenames/version tags/abbreviations. Carried in the server-level
   MCP instructions (SR-021) and the global capture directive rule
   (`~/.claude/CLAUDE.md`, updated at ship — SCN-007 AC#3 deployment step done).
2. **Read-time render guidance** (SR-022): server instructions direct clients to
   report recalled summaries in plain language, explicitly covering pre-contract
   records (the only layer that reaches them; no retrofit — HITL choice).
3. **Verbatim storage made normative** (SR-023): the server never rewrites,
   truncates, or rejects a directive on style grounds. Already true in code; now
   asserted by spec + tests (byte-compare through the real MCP tool).

Server version 0.3.0 → 0.4.0. Tests 69 → 75 (75/75 post-merge; build + tsc clean).
Docs pass: README, docs/overview.md, docs/memory-of-use.md.

## Cull result (adversarial, evaluator-independent)

SURVIVE — correctness 5/5 (COR-R-024 regression + 025/026/027 + COR-A-012),
17/17 synthesis probes, 0 invariant failures (INV-5 verified over live stdio;
INV-6 structurally impossible to violate — zero executable logic added).
Anti-laundering confirmed by three independent routes. Goodhart: none
(correctness at ceiling since gen-1; flat 1.00 is a ceiling artifact).
Full artifact: `generations/gen-4/eval-results/var-1.md` (on-disk, gitignored).

## Dissents

0001/0002/0004 checked at spec amend and cull: **0 reactivations.**
- 0001 shell condition: 1 src file touched (threshold ≥8) — third consecutive
  data point against the change-amplification thesis.
- 0004 restart sentinel does NOT advance: gate clock kept (HITL) — first
  amendment since ship-0001 that improves the slice without resetting its
  measurement. Verdict stays **~2026-08-09**.

## Findings carried forward

- **ST-1 (spec tension → flow-eval/H2):** COR-R-027 asks for a 300+ word fixture;
  the SR-101 `maxSummaryChars` cap (2000, pre-existing) leaves only ~90 chars of
  headroom. A wordier fixture would fail on the length guard, which SR-023 does
  not govern. Variant's test pins the precondition so a cap change fails loudly.
- **F-1 (minor docs precision):** user-facing docs say "byte-verbatim" without
  naming SR-101's pre-existing inert-line transforms (newline collapse, control
  stripping, 2000-char cap). Partially pre-existing; fold into the next docs pass.
- **OBS-1 (watch):** server instructions grew 1317 → 2093 chars (+59%). Fine now;
  a bloat surface if every scenario appends a paragraph.

## Rollback

`git revert -m 1 13f109d` (code); restore the shorter directive line in
`~/.claude/CLAUDE.md` (deployment); no data migration in either direction —
record schema untouched.
