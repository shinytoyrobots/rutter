# Post-ship eval config — ship-2026-08-05-0001

No CI/CD exists (local personal tool); post-ship evaluation is operator-run or
picked up by the next flow session. Three watch layers:

## 1. Regression re-run (on demand / next flow session)

Re-run suite 0.7.0 quick + adversarial-correctness against the shipped tree.
**Alert threshold**: any dimension < (ship score − 0.10):
correctness < 0.90 · performance < 0.75 · maintainability < 0.76 ·
documentation < 0.87 · security < 0.90 (note: threshold itself is 1.0 — any
security drop is an alert regardless) · cost n/a post-ship.

## 2. Dissent reactivation probes (mechanical; flow-dissent-monitor or by hand)

- `grep -c 'optional()' src/identity.ts` ≥ 1 → dissent-0002 fires
- ledger binding count ≥ 1 → arms the re-derivability probe + confirmed-entry watch
- re-derivability probe: copy vault, drop ledger, reindex, diff bindings —
  non-empty diff means the ledger is now primary data (dissent-0002)
- `sqlite3 data/librarian.db "select count(*) from identity_unresolved where candidates in ('','[]')"` ≥ 1 → dissent-0001 fires (a real zero-candidate ref now exists)
- any change to SR-039/SR-043 text or `IDENTITY_SCHEMA_ID` → both dissents re-check

## 3. Live-vault behavior (ambient, during dogfood)

- Daily reindex wall-time on ~2,300 notes: identity pass should stay ~100ms-class
  (shared-corpus p50 103ms). Visible slowdown = SR-104 signal; also the trigger to
  finally instrument the NAMED span and patch the bound (owed calibration).
- First real rename caught / first unresolved ref surfaced / first confirmation:
  each is a wish-log-worthy event for the desirability narrative — and the first
  `detected: confirmed` entry makes the ledger unrecoverable-if-lost (back up
  `_librarian/` with the vault, as already practiced).

## Prohibition 9 (constitution v3.0.0+)

Identity-introduced reads NEVER count toward the SCN-004 desirability-gate metric.
The gate CLI and stateful-use.jsonl instrumentation were not modified by this ship —
verified at cull (SEC/regression tasks) — so no exclusion logic was needed; keep it
that way if Phase A ever adds read tools.
