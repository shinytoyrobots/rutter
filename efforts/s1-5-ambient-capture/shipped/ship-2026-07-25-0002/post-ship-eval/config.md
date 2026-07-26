# Post-ship eval — ship-2026-07-25-0002

Inherits ship-2026-07-25-0001's config (weekly cadence, anomaly thresholds, dissent
monitoring) with these deltas:

1. **Duplicate sentinel (the fixed bug):** any day file in `_librarian/sessions/`
   gaining >1 entry with identical (session_id, summary) = regression alert →
   rollback candidate. Cheap check: entry count per session id.
2. **Capture-scan latency watch:** O(session-files) scan on the hook path — 9ms p95
   @ 366 files at ship. Re-measure if `_librarian/sessions/` exceeds ~2k files.
3. Suite baseline is now 0.3.0 / 49 tests; `npm test` regression bar updated 46 → 49.
4. Gate instrumentation unchanged — verify `npm run gate` counts remain sane after
   the first week (hammering Stop must not inflate; probe P10 covered this at eval).
