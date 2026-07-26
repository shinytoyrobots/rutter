---
name: maintainability
version: "1.0.0"
status: placeholder
dimension: maintainability
grader-type: hybrid   # deterministic static metrics + LLM-judge readability
threshold: 0.70
covers-sr: []         # cross-cutting; not tied to a single SR
covers-scn: []
datasets: [maintainability-real-v1]   # = the variant's own src/ tree (self-referential)
judge-model: claude (client-side)
---

# Maintainability grader — S1.5 ambient memory-of-use

Scores how well a variant's source will survive change, blending deterministic static
metrics with an LLM-judge readability pass calibrated to the **existing S1 src/ style**.
Aggregate = weighted mean of the sub-scores below. Threshold **0.70** (advisory-strict:
a variant below 0.70 is positioned low on this axis, not culled).

## Grader type

**Hybrid.**

Deterministic sub-scores:
- **`tsc --noEmit` clean** — `npm run typecheck` exits 0 with zero errors. Binary.
- **Cyclomatic complexity** — per-function; flag any function > 10, hard-flag > 15.
- **Coupling / module fan-out** — import edges per module; flag modules importing > 8
  others or forming an import cycle.
- **File size** — flag any `src/*.ts` > 200 lines (S1 files are 8–98 lines; this catches
  god-modules early).

LLM-judge sub-score:
- **Readability**, calibrated to S1. The judge is shown 2–3 existing S1 files
  (`vault.ts`, `search.ts`) as the style anchor, then the variant's new/changed files,
  and scores naming, comment quality (S1 comments explain *why*, e.g. the FTS
  AND-tokenization and the YAML-date coercion notes), and structural clarity.

## Input format

The "dataset" is the variant's own `implementation/src/` tree. A manifest lists the
files to score and which S1 files serve as the style anchor:

```json
{"anchor":["src/vault.ts","src/search.ts"],
 "score":["src/sessions.ts","src/recent.ts","src/instrument.ts"],
 "complexity_warn":10,"complexity_fail":15,"file_lines_warn":200}
```

## Scoring rules (per sub-score, then weighted)

- `tsc` clean: `1.0` / `0.0` (weight 0.30). A `0.0` here SHOULD be surfaced prominently.
- Complexity: `1.0` if all functions ≤ warn; linear penalty per function between warn
  and fail; any function ≥ fail caps this sub-score at 0.4 (weight 0.25).
- Coupling: `1.0` if no module exceeds fan-out threshold and no cycles; `0.0` on any
  cycle (weight 0.15).
- File size: `1.0` if all files ≤ warn, else linear penalty (weight 0.10).
- Readability judge: 0..1 (weight 0.20).

## Failure-rationale requirement

Each sub-threshold breach records: metric, file/function, observed vs threshold, and
(for readability) the judge's verbatim rationale + which anchor property it violates.
Written to `evals-failures/{variant-id}-maintainability.md`.

## Open assumptions (flow-eval attention)

- **No complexity/coupling tooling is configured.** Assumes flow-eval wires a metric
  source (proposed: `typescript-eslint` complexity rule + a small import-graph script,
  or `ts-morph`). **Tooling to be established.**
- The style anchor is S1 as shipped; if S1 is refactored, update the anchor set.
- Readability weighting is deliberately modest (0.20) so a subjective judge cannot sink
  an otherwise clean variant; flow-eval may re-tune weights.
- No line-coverage sub-score yet — deferred until a test harness exists (see
  correctness.md). flow-eval may add coverage once tests land.
