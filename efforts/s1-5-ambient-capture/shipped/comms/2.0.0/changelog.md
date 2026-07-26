# Spec v2.0.0 — s1-5-ambient-capture (2026-07-25)

*Constitution amendment at flow-init completion; no behavior change. Single-audience
changelog (personal project).*

## What changed

- **Eval dimension swap:** `accessibility` → `documentation` (constitution v2.0.0,
  "Eval & dispatch overrides" §1). The librarian is a headless stdio MCP server with
  no UI; the documentation dimension (threshold 0.90, weight 0.10) scores SR-103 —
  the docs-pass-at-every-shipped-stage rule added at the v1.0.0 HITL gate.
- **No SCN/SR/INV semantics changed.** The major version bump is forced by the
  constitution-change rule.
- **Eval suite scaffolding now complete:** canonical 6-dimension harness, placeholder
  grader specs, empty per-dimension datasets, codebase index (`.flow-index/`).
  Temperature set to 0.5.

## Blocking next step

Unchanged from v1.0.0: run `/flow-eval` to populate datasets (one task per acceptance
criterion) and finalize graders — including the six invariant grader pairs — before
`/flow-generate`.
