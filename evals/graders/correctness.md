---
name: correctness
version: "1.0.0"
status: placeholder
dimension: correctness
grader-type: hybrid   # deterministic test execution + LLM-judge for non-testable ACs
threshold: 0.95
covers-scn: [SCN-001, SCN-002, SCN-003, SCN-004]
covers-sr: [SR-001, SR-002, SR-003, SR-004, SR-005, SR-006, SR-007, SR-008, SR-009, SR-010, SR-011, SR-012]
datasets: [correctness-real-v1, correctness-adv-v1]
judge-model: claude (client-side; MUST NOT run inside the server — INV-6)
---

# Correctness grader — S1.5 ambient memory-of-use

Scores a variant's observable behavior against the scenario acceptance criteria of
SCN-001…SCN-004. One task per acceptance criterion; the aggregate is the mean of
per-task scores (0..1). Threshold **0.95** — near-total pass required.

> Invariant graders (INV-1…INV-6) are **separate specs owned by flow-eval** and are
> not authored here. Correctness does not re-score invariants; a variant may pass
> every correctness task and still be culled on an invariant failure.

## Grader type

**Hybrid.** Most acceptance criteria are deterministic (file exists, entry count,
ordering, empty-state string, log line appended, weekly count math). A minority are
qualitative and get an LLM-judge pass:

- SCN-001 "exactly one *curated summary line*, not the raw transcript" — judge that the
  captured entry is a single distilled line, not a dumped conversation.
- SCN-003 annotation reads as an additive prior-engagement signal, not a re-ranking or
  a nag (couples with the deterministic "membership + order identical to S1" check).

Judge runs **client-side** (the grader is not the server); the server under test still
performs no inference (INV-6).

## Input format

Tasks live in `correctness-real-v1.jsonl`, one JSON object per line:

```json
{"id":"SCN-001-ac1","scn":"SCN-001","sr":["SR-001"],"kind":"deterministic|judge",
 "setup":"fixture description / seed session records","invoke":"librarian-recent {...}",
 "expect":"assertion or judge rubric","weight":1.0}
```

Fixtures use a throwaway temp vault + `_librarian/sessions/` tree and a temp
`data/librarian.db`; the grader never touches Robin's real vault.

## Scoring rules (per task)

- Deterministic task: `1.0` if the assertion holds, else `0.0`. Partial credit only
  where an AC is a set (e.g. N ordering pairs) — then score = fraction correct.
- Judge task: judge returns 0..1 against the rubric; scores <0.5 are failures.
- **Pass/fail vs threshold:** dimension passes when aggregate ≥ 0.95. Any single
  deterministic `0.0` on a load-bearing AC (capture happened; empty-state returned;
  event logged) SHOULD be surfaced even if the mean clears 0.95.

## Failure-rationale requirement

Every failed task MUST record: task id, SCN/SR, expected vs observed, and (for judge
tasks) the judge's verbatim rationale. Written to
`evals-failures/{variant-id}-correctness.md`.

## Coverage map (task seeds — flow-eval populates exact tasks)

- **SCN-001 / SR-001..004:** one curated line appended per session; referenced note
  recorded by path + content-hash/git-ref (not path alone); empty/failed hook → no
  entry, no empty file; capture needs zero in-session user action.
- **SCN-002 / SR-005..007:** reverse-chronological order; date + versioned provenance
  per entry; window/count limit honored; explicit empty-state message when no records.
- **SCN-003 / SR-008..010:** referenced result carries annotation; unreferenced result
  is silent; membership + ranking byte-identical to S1 search for the same query.
- **SCN-004 / SR-011..012:** `librarian-recent` logs one event; search-with-signal logs
  one event; per-ISO-week count derivable over an arbitrary date range.

## Open assumptions (flow-eval attention)

- **No test framework is configured** (`package.json` scripts are build/reindex/search
  only). This grader assumes flow-eval establishes a runner (proposed: `tsx` +
  `node:test`, already available via the `tsx` dev dep and Node ≥22 built-in test
  runner) and exposes a machine-readable pass/fail per task. **Test harness to be
  established.**
- The Stop-hook wiring is an open spike (spec §Scope). SCN-001 tasks assert on the
  *observable result* (the appended entry), not on how the hook fired — the grader
  injects a summary via the same code path the hook would call.
- "As-read" content-hash vs git-ref: the grader accepts either identity form for SR-003
  as long as it is durable and reproducible from the referenced note.
