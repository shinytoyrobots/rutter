# Ship Record — ship-2026-08-13-0001

**Date**: 2026-08-13T08:55:00Z
**Effort**: decision-graph (Phase A — position capture)
**Variant**: gen-4/population/var-1-graft
**Ship SHA**: `45b0ec9` on `flow/gen-4/var-1-graft` (graft of gen-3/population/var-2-maintainability
@ `fa93acf`, itself built on `main` @ `631640e`, which already carries the merged
Phase 0 shipped code from `ship-2026-08-05-0001`)
**Constraint bias**: graft (evidence-driven refinement — not a wide-probe bias)
**Spec version**: v4.0.0 · suite 0.10.0 · constitution v5.0.0
**Ship kind**: GATED — two disclosed spec-ratification items (SG-9, SG-11), watches armed
**HITL approval**: operator, 2026-08-13 — ship-gate confirmation, "promote as gated ship" chosen
over "resolve the two spec items first"

## Grounds for ship

This variant is the only lineage this effort has produced that clears the correctness
threshold and carries no known code defect. Concretely, versus its two gen-3
predecessors (var-1-convention, var-2-maintainability — neither dominated the other,
neither shipped):

- It is the only implementation that both (a) reports rather than silently rejects a
  topic key containing whitespace (SR-053) and (b) emits the required stderr
  diagnostic for an empty/whitespace-only stance (SR-057). Each gen-3 variant had
  exactly one of these two defects; this variant has neither.
- It avoids a measured, silent cross-stream data loss that gen-3/var-1-convention's
  shared-sentinel-tag encoding exhibits: a turn containing both a session summary and
  a position directive drops one of the two silently (COR-R-039). This variant's
  distinct wire tag keeps the two extractions structurally disjoint, so SR-055's
  "session capture stays byte-for-byte unchanged" guarantee holds by construction,
  not by the accident of directive ordering.
- It marks its own wire-format encoding as provisional (a `-provisional` suffix on the
  position-event schema identifier) rather than presenting an unsettled design choice
  as finished — the specific mitigation chavruta's stability-bias review required
  before this feature could be taught to clients at all (dissent-2026-08-13-0004, M1).
- Correctness clears its bar for the first time in this phase (0.987 pooled; the two
  gen-3 variants scored 0.948 and 0.935). All six invariants pass, verified by direct
  process-level driving rather than static inheritance, at both the cull's
  quick+adversarial pass and this ship gate's own deep pass.

What it does NOT resolve, and is shipping with disclosed rather than fixed: two
genuine spec-ratification questions (below), neither a defect in this code.

## Ship gate — all nine items

1. **Named qualitative grounds** — above.
2. **Invariants pass** — all six, confirmed independently at cull (quick+adversarial,
   `invariant-result.yaml`) and again at this gate's deep pass (`eval-result-deep.yaml`).
   INV4-A-002 (rebuild-over-corruption) fails as it does for every variant in every
   generation of this effort, including the already-shipped `var-3-reversibility@993a89d`
   — a pre-existing defect in `src/db.ts`/`indexer.ts`/`reindex.ts` (zero-line diff
   against this variant), not attributable here, tracked as its own item (see watch W-6
   for the analogous pre-existing-defect pattern; INV4-A-002 itself is carried in
   `checkpoint.next`, not re-listed as a new watch since it changes nothing this ship
   touches).
3. **No blocking dissents** — `dissent-2026-08-05-0001`/`0002` (Phase 0 scope) don't
   apply to Phase A (confirmed by direct grep, not assumed — see dissents-active.yaml's
   `last-dissent-check`). `dissent-2026-08-13-0003`/`0004` (this checkpoint's own) are
   both explicitly non-blocking by their own text: "Do not hold the ship" / "this ship
   is gated regardless."
4. **Chavruta has run since the last cull** — yes, at gen-3's cull close
   (2026-08-13T06:55), producing the exact resolution (graft var-2 + port var-1's
   diagnostic + fix the shared defect + mark provisional) this variant implements.
   Nothing in gen-4's own cull surfaced new architectural disagreement requiring a
   fresh pass — the two new suite gaps (SG-9, SG-11) are spec-ratification questions
   chavruta's own dissents already anticipated (0003's item 3, 0004's whole premise),
   not new forks.
5. **One deep eval pass** — run at this gate (`eval-result-deep.yaml`), the first time
   this effort has spent its reserved `deep` depth tier. Confirmed the picture doesn't
   change: no new blocker, two scores corrected for accuracy (maintainability 0.976 →
   0.917 measured; documentation 0.97 → 0.90-1.00, an unstable range not a fixed
   number — both still clear their thresholds).
6. **Decision-ledger audit complete** — 10 entries audited at cull (6 carried forward
   + 4 graft-local), all suite-gap findings routed to `checkpoint.next`/`/flow-eval`,
   the two ship-gating ones (SG-9, SG-11) explicitly disclosed below rather than
   silently accepted.
7. **A FIRED revert probe** — computed and applied in a scratch worktree
   (`/tmp/revert-probe-gen4`, disposed after use): promoted the variant's 15 files onto
   `main`@`631640e`, confirmed 165/165 tests + tsc clean on the promoted tree, then
   applied the exact reverse diff and confirmed `git diff --stat` against the original
   `main` tip was empty and the test suite returned to its pre-promotion 116/116 count.
   Fired clean.
8. **Pre-registered post-ship watches** — `post-ship-eval/watches.yaml`, 7 watches (2
   for the disclosed spec items, 2 for this checkpoint's dissents, 1 carried spec-defect
   watch, 1 for the incidentally-found pre-existing production defect, 1 anomaly
   default).
9. **HITL approval** — operator, this exchange, choosing gated-ship-now over
   resolve-spec-first.

## Scores at ship (deep pass, `eval-result-deep.yaml` — cite this over the cull's
quick+adversarial pass where they differ; both files are on disk)

| Dimension | Score | Threshold | Note |
|-----------|-------|-----------|------|
| correctness | 0.987 (76/77) | 0.95 ✓ | SCN-010-scope-only: 0.944 (17/18) — the one failing task is SG-9, a spec/suite conflict, not a code defect |
| performance | 1.00 | 0.80 ✓ | Every budgeted task clears by orders of magnitude; re-measured on a 2,300-note corpus at deep depth |
| maintainability | 0.917 (measured) | 0.70 ✓ | Corrects the cull's 0.976 estimate — cyclomatic complexity was actually measured this pass (max CC 12, `runPositionCapture`; nothing reaches the 15 hard-fail) rather than assumed |
| documentation | 0.90–1.00 (unstable range, cite as a range) | 0.90 ✓ (at the floor of its own range) | The grader's binary covered/partial/absent scale can't express the one genuinely partial clause (the `-provisional` marker's undocumented status); re-samples: [0.90, 0.90, 1.00, 0.90, 1.00] |
| security | 1.00 | 1.00 ✓ | Re-earned against the real datasets at deep depth, not just 11 improvised probes |
| cost | 0.00 (grader broken, not informative) | 0.50 ✗ (instrument, not signal) | `budget_total_tokens=150000` is a stale placeholder against a real 138,330-token graft — cheapest unit of work in the effort so far by the raw numbers |
| cross-boundary | 0.933 (0.933 on gen-3's own comparable denominator; flat, not a regression) | 1.00 ✗ | The one failing task (XB-A-004) is a pre-existing defect in unmodified `src/stdio.ts`, shared by `main` and the already-shipped code |

## SRs covered / deferred

- **SR-047 through SR-057 (SCN-010, position capture): all implemented and passing**,
  except the one task/spec conflict named below.
- **Deferred (disclosed, watched, not code gaps):**
  - **SG-11** — the position-event schema identifier carries a `-provisional` suffix
    not yet named in SR-048's ratified text. Deliberate (chavruta's M1), cheap to
    resolve either direction (no real event exists anywhere yet), watched (W-1).
  - **SG-9** — `COR-A-025` expects a stderr diagnostic for an unrecognized directive
    kind; no SR currently requires one. Either SR-047 gains that clause or the task is
    amended. Watched (W-2).
- **Not in this ship's scope at all**: any recall/read path over positions (Phase B),
  drift visibility (Phase C), backfill (Phase D). This ship is capture-only.

## Active dissents at ship time

- `dissent-2026-08-05-0001` / `0002` — Phase 0 scope, unaffected by this ship (confirmed
  not to apply, not merely assumed).
- `dissent-2026-08-13-0003` (velocity-raised, minority) — the wire-format channel
  choice. This ship's grounds implement its stability-favoring provisional resolution.
  Armed; watched (W-3).
- `dissent-2026-08-13-0004` (stability-raised, minority) — dark-vs-hot timing. This
  ship's grounds implement its provisional resolution (teach it, with the M1 marking
  mitigation). Armed; watched (W-4), including a manual drop-a-field probe recommended
  within the first ring-0 week rather than waiting for organic volume.

## Rollout

Single-user local MCP server — see `rollout-plan.yaml`. Ring-0 (Robin's live install)
is the only ring; it begins when the operator commits and restarts the server (a
fresh client connection is what actually teaches the new grammar, since
`SERVER_INSTRUCTIONS` is read at server construction). No feature-flag platform
exists; the reversibility seam is the wholly separate `_librarian/positions/` stream
plus the fact that zero pre-existing modules besides the six this graft touched have
any diff at all.

## Rollback path

Working tree is promoted but **uncommitted** (git gate: operator commits).

- **Pre-commit rollback**: `git restore --staged --worktree -- README.md docs/memory-of-use.md src/capture-cli.ts src/capture.ts src/config.ts src/refs.ts src/sanitize.ts src/server.ts test/setup.ts` (restores `main`@`631640e` state for the 9 modified files); then delete the 6 new files (`src/position-directive.ts`, `src/position.ts`, `src/positions.ts`, `test/position-cli.test.ts`, `test/position-directive.test.ts`, `test/position.test.ts`), which become untracked-new.
- **Post-commit rollback**: `/flow-ship --rollback ship-2026-08-13-0001` (reverse-diff to `631640e` for the promoted paths — this exact reverse diff was already computed and fired clean in the revert-probe step above, so this is a proven path, not an assumed one).
- **Data rollback**: delete `_librarian/positions/*.md` — safe unconditionally through ring-0's expected near-zero volume (SCN-010's own Given: "≪ 1 per session"); once real recall (Phase B) exists this would need its own data-rollback story, not written yet.

## Comms

`comms/changelog.md` + `comms/internal-changelog.md` — default slim bundle (no wider
audience tiers requested).

---

## Process note (not a ship-gating item, recorded for the effort's own history)

This ship is the first in the effort to actually spend the `deep` eval-depth tier
(gate item 5) and the first to actually fire a revert probe in a scratch worktree
rather than assume the rollback path (gate item 7) — both existed as gate
requirements from `flow-ship.md`'s design but had not previously been exercised for
real in this effort's prior ships. Both are now proven mechanisms, not just documented
ones.
