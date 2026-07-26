# Ship Record — ship-2026-07-25-0001

**Date**: 2026-07-25
**Effort**: s1-5-ambient-capture
**Variant**: gen-1/population/var-3 (`2442f6bb`, branch worktree-agent-afc54580fdc3f41a1)
**Constraint bias**: maintainability
**Spec version**: v2.0.1 · suite 0.2.0
**Ship kind**: **metastable** (formula convergence 0.584 — gen-1 structural stability cap;
alternative criteria met: variant stability 1.0, reversibility high, HITL approval)
**HITL approval**: Robin, 2026-07-25 (at /flow-converge gate)
**Promotion**: merge `2442f6bb` → `s1.5-spec` = **`dd58d14`** (one .gitignore union conflict,
resolved). Verified in main tree post-merge: build PASS · tsc PASS · **46/46 tests** ·
real-vault reindex 2,306 notes / 1,063ms. LOCAL ONLY — not pushed.

## Pareto-front scores at ship (var-3)

| Dimension | Score | Threshold |
|-----------|-------|-----------|
| correctness | 1.00 | 0.95 ✓ |
| performance | 1.00 | 0.80 ✓ |
| maintainability | 0.99 | 0.70 ✓ |
| documentation | 1.00 | 0.90 ✓ |
| security | 1.00 | 1.00 ✓ |
| cost | 0.00 | 0.50 ✗ (miscalibrated budget — eval-suite finding #1, pending flow-eval) |

Invariants: 6/6 pass (hard-cull gates). Weighted scalar 0.899.

## SRs covered

SR-001…012, SR-100…103: **all passing. Zero deferred** — metastable refers only to
unproven generational stability, not partial implementation.

## Active dissents at ship (armed in post-ship monitoring)

- **dissent-2026-07-25-0001** (velocity: ship-var-1-instead) — reactivates on negative
  gate verdict 2026-08-08 / cost recalibration flipping scalar rank / any single-behavior
  change touching ≥8 src files.
- **dissent-2026-07-25-0002** (stability: `session-record@1` format commitment under
  INV-3) — reactivates per its registry conditions (H2 mdbase schema divergence signals).

## Known watch items (non-blocking)

- Enrichment rebuilds the reference index from disk per search — O(records); fine at
  ~1 record/day, revisit around ~1k records (chavruta correction to cull summary).
- UTC session-day: late-night local sessions land in next UTC day's file (var-3
  ambiguity flag; spec-silent).

## Rollout

Ring-0 (dogfood, this Mac) ships now — see rollout-plan.yaml. No further rings exist
for a single-user local tool; the 2-week desirability gate is the dwell condition.

## Rollback path

`git revert -m 1 dd58d14` on s1.5-spec (or `/flow-ship --rollback ship-2026-07-25-0001`),
then `npm run build`. Session records already captured in `<vault>/_librarian/` are
memory-of-use and are NOT deleted on rollback (INV-3). Feature flags: none (n/a).

## Comms

`comms/` — single-audience (personal project); sponsor/sales/marketing/support tiers
deliberately omitted, changelog + dogfood-start doc only (narrator step done inline).
