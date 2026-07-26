---
name: documentation
version: "1.0.0"
status: placeholder
dimension: documentation   # replaced `accessibility` per constitution override (headless stdio MCP, no UI)
grader-type: hybrid        # deterministic surface-inventory + LLM-judge coverage
threshold: 0.90
covers-sr: [SR-103]
covers-scn: [SCN-001, SCN-002, SCN-003, SCN-004]   # every new user-visible behavior
datasets: [documentation-real-v1]
judge-model: claude (client-side)
---

# Documentation grader — SR-103 docs currency at ship

Scores whether the user-facing "how-to" docs (`README.md`, `docs/`) cover **every new or
changed user-visible behavior** in the shipped S1.5 stage. This is the SR-103 /
constitution-prohibition-7 dimension: no stage ships without a docs pass. Aggregate =
coverage fraction adjusted by an accuracy penalty. Threshold **0.90**.

## Grader type

**Hybrid.**

1. **Deterministic surface inventory.** Enumerate the S1.5 user-visible surface from the
   variant + spec: the new tool `librarian-recent` (and its window/count params), the
   search-result prior-engagement annotation, the session-record location/format Robin
   sees, and how stateful-use instrumentation is inspected. This yields a checklist of
   behaviors that MUST be documented.
2. **LLM-judge coverage.** For each checklist item, the judge reads `README.md` + `docs/`
   and decides: **covered** (a user could accomplish/understand it from the docs),
   **partial**, or **absent** — and separately flags any doc statement that is **wrong**
   (describes behavior the variant does not have).

## Input format

`documentation-real-v1.jsonl`, one behavior per line:

```json
{"id":"recent-window","behavior":"librarian-recent accepts a time-window/count limit",
 "surface":"tool","user_question":"how do I see just last week's work?","weight":1.0}
```

The judge is given the variant's actual `README.md` + `docs/` contents as context.

## Scoring rules

- Per item: **covered = 1.0**, **partial = 0.5**, **absent = 0.0**.
- Coverage sub-score = weighted mean over checklist items.
- **Accuracy penalty:** each doc statement judged *wrong* subtracts 0.15 from the
  aggregate (floored at 0). Stale/incorrect docs are worse than missing ones — they
  mislead Robin.
- Aggregate = `max(0, coverage − 0.15 · wrong_count)`. Pass when ≥ 0.90.

## Failure-rationale requirement

Each absent/partial/wrong item records: behavior id, verdict, the doc location checked
(or "not found"), and the judge's verbatim rationale. Written to
`evals-failures/{variant-id}-documentation.md`.

## Coverage map (checklist seeds — flow-eval finalizes)

- `librarian-recent`: what it does, invocation, window/count option, empty-state.
- Search enrichment: that results may carry a prior-engagement annotation, and that
  absence of an annotation is intentional silence (not a bug).
- Session records: where they live (`_librarian/sessions/<date>.md`), that they are one
  curated line per session, git-committed, never auto-deleted.
- Ambient capture: that summaries are captured at session end with no user action (and
  the current state of the Stop-hook setup, even if "manual for now").
- Stateful-use instrumentation: how Robin/observer reads the per-ISO-week count.

## Open assumptions (flow-eval attention)

- Current docs (`README.md`, `docs/overview.md`, `docs/DESIGN.md`, `docs/HANDOFF.md`)
  describe **S1 only**; the S1.5 surface is expected to be absent until a variant ships
  its docs pass. That is the point of this grader — do not treat pre-ship absence as a
  tooling error.
- SR-103 fires "when a stage ships." flow-eval should confirm whether this grader runs
  on every variant or only at the ship gate; the placeholder assumes per-variant so the
  cost of a missing docs pass is visible on the Pareto front early.
- Threshold is high (0.90) because prohibition-7 is a hard constitution rule; wrong-doc
  penalty is tunable by flow-eval.
