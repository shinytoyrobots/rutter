---
version: "3.10.0"
parent: "3.9.0"
changed-at: "2026-08-04"
change-type: minor
effort: decision-graph
hitl: "resolved 2026-08-04 — gen-1 population fork surfaced as one single-decision prompt; recommendation (confirmed-sticky) accepted"
change-summary: "+SR-046: a human-confirmed binding is never silently superseded by automatic detection — conflict surfaced, fresh confirmation required"
diff-summary: |
  + SR-046: if an automatic exact-hash detection conflicts with an existing
    detected: confirmed binding for the same (path, hash) ref, preserve the
    confirmed binding, append no automatic binding, surface the conflict at read
    surfaces; only a fresh human confirmation (SR-044) supersedes.
    (unwanted-behavior, ← SCN-009; scopes SR-045's newest-wins to AUTOMATIC
    bindings only — SR-045's text unchanged)
  ~ traceability row SCN-009: + SR-046
  (no existing SCN/SR/INV text modified)
provenance: |
  Found by the gen-1 POPULATION, not the panel: var-1 (convention) flagged it HIGH
  in ambiguity.md; var-3 (reversibility) independently hit the same fork at MEDIUM.
  This is the population-as-spec-probe mechanism working as designed (P4/dispatch
  §Light path): two of three independent implementations disagreed with each other
  about a case the suite cannot yet discriminate.
conformance-note: |
  All three gen-1 variants (961c3c5 / 8238cd2 / 6684dff) implement uniform
  newest-wins and predate this SR. Expected nonconformance at cull — recorded there
  as a rework item, not a defect: the spec moved after generation, which is the
  additive-minor regeneration path (new SR -> targeted refinement, existing code
  otherwise unchanged). Suite: SR-046 harness entry mapping-pending: true —
  TODO(flow-eval) dedicated conflict-surfacing task; interim coverage via the
  cull's decision-ledger audit.
---
