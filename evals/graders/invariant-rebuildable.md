---
name: invariant-rebuildable
version: "1.0.0"
status: ready
dimension: invariant
invariant: INV-4
grader-type: deterministic   # delete-and-rebuild equivalence
threshold: 1.0               # hard-cull
datasets: [rebuild-real-v1, adversarial-rebuild-v1]
judge-model: none
---

# Invariant grader — INV-4: Rebuildability

Verifies INV-4: **the SQLite index is fully reconstructible from the vault plus
`_librarian/`; no load-bearing state lives only in the DB, and a delete-and-rebuild
preserves all session-record-derived behavior.**

## Method (deterministic)

1. **Delete-and-rebuild equivalence.** Build `data/librarian.db`; snapshot index row
   counts and the searchable result set for a fixed query. Delete the DB entirely, rebuild
   from vault + `_librarian/`, re-snapshot. Row counts and fixed-query results MUST match.
2. **Behavior equivalence.** Snapshot `librarian-recent` output, enrichment annotations,
   and per-ISO-week stateful-use counts before rebuild; re-run after rebuild. All
   session-record-derived behavior MUST be identical.
3. **Source-of-truth audit (adversarial).** Confirm stateful-use events and all
   session-derived state reconstruct from durable files alone — DB-only state that is lost
   on rebuild fails. Also probes corrupt/truncated-DB recovery and in-memory-only cache
   dependence.

## Threshold and cull semantics

Threshold **1.0, no tolerance.** Any post-rebuild divergence, or any load-bearing state
that exists only in the DB or in-memory, sets `invariant-failure: true` → hard cull.

## Failure-rationale requirement

Each failed task records: task id, INV-4, the diverging snapshot (counts / query results /
recent / enrichment / weekly-count), and the state that failed to reconstruct from files.
Written to `evals-failures/{variant-id}-invariant-rebuildable.md`.

## Open assumptions

- The durable files (`_librarian/` session records + the instrumentation log) are the
  source of truth; the DB is a cache. If the variant stores the stateful-use log only in
  SQLite, that is an INV-4 failure — the log must be reconstructible from durable files.
- Runner harness is built with the gen-1 implementation.
