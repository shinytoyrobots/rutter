# Post-ship eval — ship-2026-07-25-0001

Suite 0.2.0 continues against the shipped tree (`s1.5-spec` @ `dd58d14`). Single-user
local tool: "production data" = Robin's real vault + real session records.

## Weekly cadence (during the 2-week gate window, 2026-07-25 → ~2026-08-08)

1. `npm test` — 46/46 expected; any failure = regression alert.
2. `npm run gate` — per-ISO-week stateful-use count; the gate metric itself.
3. Spot-check: `_librarian/sessions/` records validate (typed frontmatter parses,
   one line per session, refs resolve or are explicitly `unresolved`).
4. Invariant sentinels: no vault mutations (INV-2), no record deletions (INV-3),
   `data/` delete + `npm run reindex` still rebuilds cleanly (INV-4, monthly is fine).

## Anomaly thresholds

- Any dimension regressing >0.10 from ship scores (correctness 1.0 / perf 1.0 /
  maint 0.99 / docs 1.0 / sec 1.0) → alert, consider `/flow-ship --rollback`.
- Any INV failure → immediate rollback candidate (hard-cull semantics don't stop at ship).
- Enrichment latency watch: if search feels slow as records accumulate, measure the
  O(records) rebuild (chavruta watch item) — becomes a gen-2 requirement, not a hotfix.

## Dissent monitoring

dissent-0001 and dissent-0002 reactivation conditions are armed (see
dissents-active.yaml). Check on: the 2026-08-08 gate verdict (mandatory), any cost-budget
recalibration in evals/harness.yaml, any commit touching ≥8 src files for one behavior.
`/flow-dissent --check` runs the scan.

## The verdict (2026-08-08, mandatory HITL — constitution escalation trigger 2)

- **PASS** (≥3×/week unprompted, 2 weeks): wish log picks H2 (belief-lifecycle) vs
  H3 (ingestion). dissent-0001 stays provisionally resolved.
- **FAIL**: product stops here (cheap kill, by design). dissent-0001 REACTIVATES
  (velocity's cheapest-instrument thesis was right) — record it before archiving.
