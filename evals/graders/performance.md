---
name: performance
version: "1.0.0"
status: placeholder
dimension: performance
grader-type: deterministic   # timed benchmarks against fixture corpora
threshold: 0.80
covers-sr: [SR-005, SR-008, SR-010]   # recall + search-enrichment latency envelopes
covers-scn: [SCN-002, SCN-003]
datasets: [performance-real-v1]
---

# Performance grader — S1.5 ambient memory-of-use

Times the librarian's operations against fixed-size fixture corpora and scores each
against a **DRAFT budget**. Aggregate = weighted mean of per-benchmark scores (0..1).
Threshold **0.80**.

## Grader type

**Deterministic.** Each benchmark runs N iterations (warm + measured), reports p50 and
p95, and compares p95 to the budget. Wall-clock only; no LLM. Runs on a declared
reference machine (see assumptions) and records host specs for reproducibility.

## DRAFT budgets (per operation, p95)

Calibrated to the S1 baseline: full reindex of ~2,300 notes currently runs ~1s
(`README`), well under the DESIGN 60s ceiling. Budgets are set with headroom but far
below the ceiling so regressions surface early.

| Benchmark | Corpus | DRAFT p95 budget | Rationale |
|-----------|--------|------------------|-----------|
| Full reindex | ~2,300 vault notes | **≤ 10s** (hard ceiling ≤ 60s per DESIGN) | S1 ~1s today; 10s catches a 10x regression before the ceiling |
| `librarian-recent` (default window) | 60 daily session records | **≤ 50ms** | pure `_librarian/` markdown read + parse |
| `librarian-recent` (2-week window) | 365 session records | **≤ 150ms** | scan + filter + reverse-chron sort |
| Search enrichment **overhead** | 8 results, 365 session records | **≤ 20ms added** over S1 search p95 | annotation is additive lookup, not a re-query |
| Stateful-use weekly count | 5,000 log events | **≤ 30ms** | range scan + ISO-week bucketing |

Enrichment overhead is measured as the *delta* between enriched and un-enriched search
for the same query — this isolates the S1.5 cost from S1 search latency.

## Input format

`performance-real-v1.jsonl`, one benchmark per line:

```json
{"id":"reindex-2300","op":"reindex","corpus":"vault-2300","iterations":5,
 "budget_p95_ms":10000,"weight":1.0}
```

Fixture corpora are generated deterministically (seeded) so runs are comparable.

## Scoring rules (per benchmark)

- `1.0` if p95 ≤ budget.
- Linear ramp to `0.0` between `budget` and `2 × budget`:
  `score = clamp(0, 1, (2·budget − p95) / budget)`.
- `0.0` if p95 ≥ 2 × budget.
- **Hard fail flag** (not a veto): reindex p95 ≥ 60s trips the DESIGN ceiling and MUST
  be surfaced regardless of the aggregate.

## Failure-rationale requirement

Each under-budget benchmark records: benchmark id, budget, observed p50/p95, iteration
spread, and host specs. Written to `evals-failures/{variant-id}-performance.md`.

## Open assumptions (flow-eval attention)

- **Budgets are DRAFT.** flow-eval should confirm the reference-machine class and may
  re-baseline once a variant exists; the numbers above are proposals, not measurements.
- **No benchmark harness exists yet.** Assumes flow-eval adds a timing runner (proposed:
  `tsx` script using `perf_hooks`). **Test harness to be established.**
- Corpus sizes (2,300 notes, 365 session records, 5,000 events) are S1.5 planning
  figures; scale them if the real vault differs materially.
- `node:sqlite` cold-open cost is excluded from per-query budgets (measured once, warm).
