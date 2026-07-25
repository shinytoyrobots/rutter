---
version: "2.0.0"
parent: "1.0.0"
effort: s1-5-ambient-capture
date: 2026-07-25
change-type: major   # constitution amendment — always a major increment
author: flow-init (completion run)
hitl: approved       # 2026-07-25, explicit AskUserQuestion approval
mapping-pending: true
---

# History — Spec v2.0.0 (constitution amendment at flow-init completion)

## Change summary

`/flow-init` was run to complete the effort bootstrapped by `/flow-spec` (which created
spec v1.0.0, constitution, and a mappings-only harness, but not the canonical
6-dimension eval suite, grader specs, datasets, or codebase index).

One semantic change, HITL-approved: **the default `accessibility` eval dimension is
replaced by `documentation`** (constitution "Eval & dispatch overrides" §1). Rationale:
headless stdio MCP server, no UI surface; the new dimension gives SR-103 (docs pass at
every shipped stage) a scored home at weight 0.10, threshold 0.90.

**No SCN, SR, or INV semantics changed.** The major bump is forced by the
constitution-change rule (any constitution edit = major version increment).

## Also decided at this HITL gate

- Starting temperature set to **0.5** (bootstrap had seeded 1.0) — balanced
  explore/exploit for a tightly pre-specified slice.
- Harness mapping dimensions consolidated onto the six Pareto axes:
  SR-100 (mdbase frontmatter schema) → `correctness`; SR-101/SR-102 → `security`;
  SR-103 → `documentation`. Grader/dataset names preserved where possible.

## Diff summary

- ~ constitution: version 1.0.0 → 2.0.0; added "Eval & dispatch overrides" §1
  (accessibility → documentation swap + re-add condition)
- ~ evals/harness.yaml: rebuilt in canonical form (dimensions, weights,
  goodhart-mitigation, metastable config) with all v1.0.0 SCN/SR/INV mappings
  preserved; still entirely mapping-pending
- + evals/graders/{correctness,performance,maintainability,documentation,security,cost}.md
  (placeholder grader specs)
- + evals/datasets/*.jsonl (empty, per dimension)
- + .flow-index/ (codebase index; gitignored)
- ~ efforts/s1-5-ambient-capture/flow-state.yaml: temperature 1.0 → 0.5,
  reheat trigger `dissent-reactivation-cluster` armed
