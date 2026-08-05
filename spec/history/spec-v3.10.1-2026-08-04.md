---
version: "3.10.1"
parent: "3.10.0"
changed-at: "2026-08-04"
change-type: patch
effort: decision-graph
hitl: "not required (patch: mapping registration only, no semantic change); the eval-first sequencing itself was HITL-chosen at the /flow-generate Step-2 halt"
change-summary: "SR-046 mapping-pending cleared — suite 0.7.0 registers dedicated adversarial holdouts before gen-2 dispatch"
diff-summary: |
  ~ frontmatter: mapping-pending exceptions narrowed to SR-104 only (calibration)
  ~ SR-046 trailing note: TODO(flow-eval) replaced with the registered mapping
    (COR-A-018 conflict preserve+surface; COR-A-019 fresh-confirmation supersede)
  ~ traceability row SCN-009: dataset column notes 0.7.0 additions
    (COR-A-018/019 SR-046; COR-A-020 SR-043 enrichment-surface discriminator)
  (no scenario, requirement, or invariant text modified)
provenance: |
  /flow-generate SR-046,SR-043 halted at Step-2 validation: SR-046 had no runnable
  eval task (tasks: [], mapping-pending: true), so the gen-2 cull could not have
  discriminated a correct confirmed-sticky implementation from a wrong one. HITL
  (preference-articulator) chose flow-eval-first over override. COR-A-020 rides
  along from the gen-1 cull's suite-gap backlog because SR-043 is the other half
  of the gen-2 scope and its existing holdout (COR-A-016) under-probed the
  enrichment surface (var-3 passed while silent there).
conformance-note: |
  Suite 0.6.1 -> 0.7.0, ADDITIVE ONLY: no existing task edited, no re-evaluation
  of prior variants. Gen-1 survivors' SR-046 nonconformance stays recorded in
  gen-1/summary.md as the gen-2 refinement target. Remaining suite backlog
  (4 items, gen-1/summary.md §Suite gaps) intentionally untouched: re-introduced
  ambiguity onto an already-bound ref (needs a spec reading before a task),
  confirm-target validation, cost-grader normalization formula, SR-024..035
  backfill.
---
