---
version: "3.8.1"
parent: "3.8.0"
changed-at: "2026-08-04"
change-type: patch
effort: decision-graph
hitl: not-required (patch; mapping registration only, no scenario/requirement/invariant semantics changed)
change-summary: "mapping-pending cleared for SCN-008/009 + SR-036..043 — eval suite 0.6.0 registered every mapping; SR-104 remains pending-calibration"
diff-summary: |
  ~ frontmatter: version 3.8.1; mapping-pending true -> false (SR-104's numeric-bound
    calibration carried on its harness entry, not the spec flag)
  ~ SR-036..043 inline comments: "mapping-pending: true — TODO(flow-eval)" ->
    "mapping registered @ suite 0.6.0 (v3.8.1)" (8 lines, comment-only)
  ~ traceability rows SCN-008 / SCN-009 / SR-104: dataset + grader columns filled
    (COR-R-028..037, COR-A-013..017, SEC-A-014/015 + SEC-R-006 control,
    PERF-R-006 report-only)
  ~ Conformance tests: v3.8.0 pending-paragraph re-tensed to historical; new v3.8.1
    resolution paragraph, including the recorded suite debt: SR-024..035
    (v3.3.0-v3.7.0) were never mapped into the eval suite — backfill pass
    recommended, currently guarded by the repo test suite only
  (no SCN/SR/INV semantics changed; SR-104's numeric bound still deliberately absent —
  calibrated from PERF-R-006's gen-1 baseline, then fixed by a further patch amendment)
companion-artifacts: |
  evals/ suite 0.5.0 -> 0.6.0 (same day, flow-eval DESIGN pass): +19 tasks across
  correctness-real/adv, security-real/adv, performance-real; harness mappings for
  SCN-008/009 + SR-104; GOODHART.md 2026-08-04 section (adv pairing maintained;
  SR-104 real-only accepted gap w/ close-trigger; INV-fixture gap for the ledger
  path recorded with SEC-A-014 as compensating probe). Graders and INV datasets
  unchanged (no re-eval of converged s1-5 population triggered).
---
