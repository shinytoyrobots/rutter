---
version: "2.0.1"
parent: "2.0.0"
effort: s1-5-ambient-capture
date: 2026-07-25
change-type: patch   # metadata only — mapping-pending flag cleared
author: flow-eval (full-suite bootstrap)
hitl: not-required   # no threshold/dimension/replacement change; datasets derive from approved ACs
mapping-pending: false
---

# History — Spec v2.0.1 (conformance mappings complete)

## Change summary

`/flow-eval` ran its full-suite bootstrap (suite 0.1.0 → **0.2.0**, status active).
The spec's `mapping-pending: true` front-matter flag — set at v1.0.0 and carried
through v2.0.0 — is cleared. No scenario, requirement, invariant, or glossary
semantics changed.

## What now backs the spec

- **86 tasks across 19 datasets**: correctness-real (16, one per SCN acceptance
  criterion + 2 SR-100 schema tasks) + correctness-adv (8 metric-gaming holdouts);
  security-real (5) + security-adv (12 attack corpus for SR-101/102); performance (5),
  maintainability (5), documentation (5, SR-103); six INV real+adversarial pairs
  (2–3 tasks each). Cost is harness-tracked, no dataset.
- **12 grader specs**: six dimension graders (still `status: placeholder` — their
  runner scripts are built with the gen-1 implementation, recorded in the harness
  `runners:` block) and six invariant graders (`status: ready`, threshold 1.0,
  hard-cull).
- **Goodhart posture** recorded in `evals/GOODHART.md`: correctness + security +
  all invariants carry adversarial holdouts; performance/maintainability/documentation
  are real-only — an accepted, trigger-documented gap (close on Goodhart signal or a
  dissent naming a gaming mode).

## Non-convertible acceptance criterion (by design)

SCN-004/AC-4 ("unprompted" classification) is spec-marked `(Open)` and
non-automatable; it is supported by instrumentation task COR-R-014 (timestamps enable
manual wish-log review), not graded as behavior.

## Effect

`flow-generate` is UNBLOCKED for gen-1 against spec v2.0.1 / suite 0.2.0.
