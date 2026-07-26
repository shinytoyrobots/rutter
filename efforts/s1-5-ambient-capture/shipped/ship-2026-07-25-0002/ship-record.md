# Ship Record — ship-2026-07-25-0002

**Date**: 2026-07-25 · **Effort**: s1-5-ambient-capture
**Variant**: gen-2/population/var-1 (`77d7598`) · **Bias**: security (hotfix dispatch)
**Spec version**: v3.0.0 · suite 0.3.0 · **Ship kind**: **FULL** (convergence 0.92 ≥ 0.85)
**HITL approval**: Robin, 2026-07-25 (converge recommendation → user-invoked flow-ship)
**Promotion**: merge `77d7598` → `hotfix/capture-idempotence` = **`cb7cfee`** (spec v3.0.0
@ a31f8e5 + fix as one PR unit). Verified post-merge: build clean · tsc clean · **49/49
tests**. Chavruta skipped per hotfix dispatch rule (adversarial-depth eval as
compensating control — see gen-2/convergence-decision.md).

## What ships
Idempotent capture per distinct directive (SR-013/SR-014, revised SR-001): unchanged
directive re-fired by per-turn Stop events → byte-identical no-op; changed directive →
revision appended, earlier entries preserved. Dedupe key = session_id + normalized
content; cross-UTC-midnight safe; fail-closed on corrupt neighbors; no lock (stale-lock
wedge deliberately avoided; residual concurrent-first-fire race documented, cannot
produce duplicates).

## Scores at ship (adversarial depth)
correctness 1.00 (27/27) · performance 1.00 (capture scan 9ms p95 @ 366 files) ·
maintainability 0.98 · documentation 0.95 · security 1.00 (13/13 synthesis probes) ·
cost 0.15 (trade-off axis) · INV 6/6 (INV-3 proven by byte-compare)

## Live confirmation at ship time
The bug's real-world trace: 7 entries (1 genuine + 6 per-turn duplicates) had
accumulated in `_librarian/sessions/2026-07-26.md` in the hours the un-fixed hook ran.
Duplicates removed at ship (parser-verified rewrite; `librarian-recent` reads 1 entry).
The rebuilt dist/ takes effect from the next Stop firing — no restart needed for capture.

## Active dissents at ship
dissent-0001 (velocity, ship-var-1) and dissent-0002 (stability, record-format) —
both ACTIVE, conditions armed; neither tripped by this ship (3-file diff; no format
change; no mdbase/migration spec wording).

## Rollback
`git revert -m 1 cb7cfee` on the branch (or revert the main merge commit post-PR),
`npm run build`. Session records are never deleted on rollback (INV-3).

## Rollout
Ring-0 (dogfood, this Mac) — effective immediately via rebuilt dist/. No further
rings (single-user tool). Desirability gate unaffected: clock 2026-07-25 → ~2026-08-08.
