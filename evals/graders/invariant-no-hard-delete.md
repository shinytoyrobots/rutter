---
name: invariant-no-hard-delete
version: "1.0.0"
status: ready
dimension: invariant
invariant: INV-3
grader-type: deterministic   # static destructive-op scan + record-preservation runtime check
threshold: 1.0               # hard-cull
datasets: [no-delete-real-v1, adversarial-delete-v1]
judge-model: none
---

# Invariant grader — INV-3: No hard-delete of memory-of-use

Verifies constitution prohibition-3 / INV-3: **session records (and all memory-of-use) are
appended, archived, or invalidated — never hard-deleted.**

## Method (deterministic)

1. **Destructive-op static scan.** Grep/AST-scan `src/` for destructive operations
   targeting `_librarian/` memory-of-use records: `unlink`, `rm`, `rmdir`, `truncate`,
   `open(..., 'w')` on an existing record, or `DELETE FROM` on session-derived tables.
   (Deletion of the disposable `data/librarian.db` cache is NOT a violation — that is
   INV-4 territory; only memory-of-use record destruction fails here.)
2. **Record-preservation runtime check.** For every update/supersede/invalidate/prune path
   the variant exposes, confirm the original record bytes remain recoverable afterward
   (tombstone/superseding marker or archive), never destroyed in place.
3. Adversarial cases probe entry updates, same-day re-capture, and maintenance/prune paths.

## Threshold and cull semantics

Threshold **1.0, no tolerance.** Any hard-delete/overwrite/truncate of a memory-of-use
record sets `invariant-failure: true` → hard cull.

## Failure-rationale requirement

Each failed task records: task id, INV-3, the destructive call site or the operation that
lost the original bytes, and the before/after state of the affected record. Written to
`evals-failures/{variant-id}-invariant-no-hard-delete.md`.

## Open assumptions

- The boundary between "disposable cache" (`data/`) and "memory-of-use" (`_librarian/`) is
  load-bearing here; the grader only guards `_librarian/` records.
- Runner harness is built with the gen-1 implementation.
