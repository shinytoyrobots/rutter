# Ship Record — ship-2026-08-13-0002

**Date**: 2026-08-13T23:00:00Z
**Effort**: decision-graph (Phase B — position recall)
**Variant**: gen-5/population/var-2-maintainability
**Ship SHA**: `fb4b1c9` on `flow/gen-5/var-2-maintainability`, merged `--no-ff` to `ship/decision-graph-phase-b` @ `c7286ba` (base `main` @ `c1065c4`, which carries spec v14.0.0 + suite 0.11.0)
**Constraint bias**: maintainability (gen-5 wide-probe)
**Spec version**: v14.0.0 · suite 0.11.0 · constitution v5.0.0
**Ship kind**: GATED — one pre-existing (not variant-attributable) cross-boundary shortfall, one broken cost instrument, one self-found maintainability sub-check regression, all disclosed and watched
**HITL approval**: operator, this session — chose `var-2-maintainability` over `var-1-convention` at the cull-close width/variant decision, informed by chavruta's dissent-2026-08-13-0005

## Grounds for ship

Versus its sibling survivor (`var-1-convention` — also on the first Pareto front, mutually non-dominated at cull):

- **The only variant with full spec-proximity.** Every one of SCN-011's ten acceptance criteria and every one of SR-058 through SR-065 maps to a passing task (spec-proximity 1.00 at cull; confirmed unchanged at this gate's deep pass). `var-1` also implements all eight requirements functionally, but scored lower on documentation (below).
- **The only variant that clears constitution prohibition 7 ("no stage ships without a docs pass") outright.** All four user-facing surfaces — `README.md`, `docs/overview.md`, `docs/getting-started.md`, `docs/memory-of-use.md` — document `librarian-positions`, the reindex staleness window, and the new instrumentation log. `var-1`'s `README.md` still contained a now-false claim ("Phase B recall is not built yet") plus three undocumented surfaces — a real gap that would have to close before `var-1` could ship in *any* form, gated or clean, per this constitution's own prohibition.
- **Ships with a chavruta-mandated pinning test (M1) now in place, not merely a claim.** dissent-2026-08-13-0005 (this generation's chavruta review) found this variant's render-time sanitization posture — funnel every client-authored field through `toInertLine()` unconditionally, rather than a per-field allowlist — genuinely defensible but untested on its most concrete vector: a vault note whose *filename* carries a raw control byte, cited by an ordinary `[[wikilink]]`, reaching a terminal through a ref path. That test is now in the shipped commit (`fb4b1c9`) and this gate's deep pass mutation-tested it directly: removing `inert()` from the ref path drops exactly one test (the new one) from 189 to 188 — it is not a decorative assertion.

**Stated honestly, not spun**: chavruta's own technical read *slightly favored the alternative variant's narrower design* on this specific fork — `var-1` reuses the project's pre-existing, already-shipped ref-rendering function (`formatRefLine`, used by `librarian-recent` since v3.9.0), which means a renamed or unresolvable cited note still gets its "this was renamed" / "this can't be found" annotation. `var-2` wrote a second, dedicated ref renderer to get its unconditional-sanitization property, and that renderer does not call `resolveRef` — a cited note that has since been renamed renders under its stale path with no annotation, and an unresolvable citation renders as if it resolved fine. This is a real, disclosed gap (not a defect chavruta found and hid), explicitly *not* held against shipping either variant ("do not hold the ship for either" — chavruta's own words), and routed to `/flow-spec`/`/flow-eval` as a follow-up (M3, below) rather than fixed in this ship.

## Ship gate — all nine items

1. **Named qualitative grounds** — above.
2. **Invariants pass** — 6/6, confirmed independently three times: at cull (quick+adversarial), at this gate's deep pass against the final shipped commit `fb4b1c9` (`git diff 9ce5ff9..fb4b1c9 -- src/` is empty — the pinning-test commit touches no invariant-relevant code), and now a fourth time on the actual merged working tree (`ship/decision-graph-phase-b` @ `c7286ba`, 189/189, typecheck clean). The deep-pass evaluator also caught and corrected its own tooling gap mid-run: a raw NUL byte in `src/identity.ts` (pre-existing, unrelated to this ship) was silently skipped by a `grep -I` invariant scan; re-run with `grep -a`, all six invariants still hold.
3. **No blocking dissents.** `dissent-2026-08-05-0001`/`0002` (Phase 0 scope) don't apply. `dissent-2026-08-13-0003` (resolved, spec v6.0.0) and `-0004` (mitigated, Phase A) are Phase A scope, unaffected. `dissent-2026-08-13-0005` (this generation's own) is explicitly non-blocking by chavruta's own text — its two mandatory conditions are satisfied by this ship: **M1** (pinning test) is in the shipped commit and mutation-verified; **M2** (a named disclosure) is this section plus the SRs-covered section below, stating plainly that a control character in a vault filename reaches the terminal on both `librarian-positions` and the pre-existing `librarian-recent` (not new to this ship — a pre-existing exposure Phase B did not introduce and did not fully close either). **M3** (routing) is recorded in the watches below and in `flow-state.yaml`'s `checkpoint.next`.
4. **Chavruta has run since the last cull** — yes, at gen-5's cull close (2026-08-13T21:55), producing dissent-2026-08-13-0005 and its M1/M2/M3 conditions, which this ship implements.
5. **One deep eval pass** — run at this gate (`eval-result-deep.yaml`), against the final shipped commit `fb4b1c9`. Confirmed the cull's picture holds: no new blocker. Maintainability's score moved (0.740 → 0.831) on a *grader-formula reading question* (does the complexity penalty sum or take the max across offending functions?), not a code change — the deep pass also found the cull's offender list was itself partly wrong (`identity-confirm-cli.ts#usage` mis-scored as complexity 12; it's actually 1), which doesn't change the number but confirms this variant's own code *retired* a complexity offender rather than adding one. Its one real, attributable maintainability cost remains what the cull found: one `server.ts` fan-out edge, from the module split this variant's own bias motivated.
6. **Decision-ledger audit complete** — 11 entries audited at cull, all suite-gap findings (SG-13 through SG-25, plus F-1) routed to `/flow-eval`/`/flow-spec` backlog via `checkpoint.next`, explicitly accepted with rationale rather than silently dropped. The deep pass added four more findings (F-5 through F-8, below), all pre-existing and non-blocking, also routed.
7. **A FIRED revert probe** — computed and applied in a scratch worktree (`/tmp/revert-probe-gen5`, disposed after use): applied var-2's full diff (`c1065c4..fb4b1c9`, 1,795-line patch) onto a fresh detached checkout of `main`@`c1065c4`, confirmed `npm install && npm run typecheck && npm test` clean at 189/189, then applied the exact reverse diff and confirmed `git diff --stat` against the original `c1065c4` tip was **empty** and the test suite returned to its pre-promotion **165/165**. Fired clean, both directions independently verified.
8. **Pre-registered post-ship watches** — `post-ship-eval/watches.yaml`, 9 watches (dissent-2026-08-13-0005's 7 reactivation conditions, one for `dissent-2026-08-05-0001`'s third-read-surface condition which fires **immediately** on this merge, one anomaly default).
9. **HITL approval** — operator, this session: chose `var-2-maintainability` at the cull-close decision point, informed by (not before) chavruta's finding.

## Scores at ship (deep pass, `eval-result-deep.yaml` — cite this over the cull's quick+adversarial pass where they differ; both files are on disk)

| Dimension | Score | Threshold | Note |
|-----------|-------|-----------|------|
| correctness | 0.989 (SCN-011 scope: 1.000, 18/18) | 0.95 ✓ | unchanged from cull — `src/` byte-identical between the cull's commit and the shipped one |
| performance | 1.00 | 0.80 ✓ | unchanged |
| maintainability | 0.831 (grader-formula-dependent; the sum reading reproduces the cull's 0.740) | 0.70 ✓ either reading | see gate item 5 — a grading-instrument ambiguity (routed, SG-17), not a code change |
| documentation | 1.00 (variant-attributable) / 0.85 (pooled, at judge depth) | 0.90 ✓ on the attributable cut | all four user-facing surfaces confirmed covering `librarian-positions` |
| security | 1.00 | 1.00 ✓ | re-earned against a synthesized 124-case adversarial matrix (7 fields × 14 payload classes) at deep depth — zero leaks under the suite's own definition; one new low-severity gap found (BiDi isolates U+2066–U+2069, U+061C — absent from `sanitize.ts` **and** the suite's own regex, affects every surface in the server, zero-line diff to fix) |
| cost | 0.00 (grader broken, not informative) | 0.50 ✗ (instrument, not signal) | 6th consecutive generation scoring 0.0 against the stale 150k placeholder |
| cross-boundary | 0.933 pooled / **1.000 variant-attributable** | 1.00 ✗ pooled | the pooled shortfall is F-1 (`identity_bindings` rebuild writes a wall-clock value, breaking SR-041's byte-identical guarantee) — pre-existing Phase A code, reproduced exactly at this gate, **only surfaces if a note has actually been renamed**; not attributable to this variant, which sidesteps this bug class by construction |

Reproducibility: 5 consecutive full-suite runs, **189/189 every time**, byte-identical pass/fail set (not just an equal count).

## SRs covered / deferred

**SR-058 through SR-065 (SCN-011, position recall): all implemented and passing.** Nothing deferred at the requirement level.

**Disclosed, watched, not code defects:**
- **The ref-path-from-a-hostile-filename exposure spans both `librarian-positions` and the pre-existing `librarian-recent`** (M2, above). This ship's own render path (`position-render.ts`) neutralizes it (pinned by the M1 test); `librarian-recent`'s `formatRefLine` does not, and fixing that is out of scope for Phase B (SR-065 forbids changing `librarian-recent`'s output). Routed to `/flow-spec` (SR-064/SR-101 scope) and `/flow-eval` (a real SEC-A task covering both surfaces at once) — watched (W-1, W-2).
- **F-1**: the note-identity projection is not byte-identical across rebuilds (pre-existing Phase A defect; only visible after a note rename). Not attributable to this ship; watched (W-4) since SCN-011 cites the broken guarantee (SR-041) as its own precedent.
- **F-7**: BiDi isolate characters (U+2066–U+2069, U+061C) pass `sanitize.ts`'s `toInertLine` unneutralized — affects every existing server surface, not new to this ship, zero-line fix. Watched (W-6).
- **The `server.ts` fan-out maintainability sub-check** — a real, self-found, self-disclosed cost of this variant's own module split. Watched (W-7) alongside the anomaly default.

**Not in this ship's scope at all**: Phase C (drift visibility, thread grouping), Phase D (optional backfill) — separate future rounds.

## Active dissents at ship time

- `dissent-2026-08-05-0001`/`0002` — Phase 0 scope, confirmed not to apply.
- `dissent-2026-08-13-0003` (resolved) / `-0004` (mitigated) — Phase A scope, implemented by the already-shipped `ship-2026-08-13-0001`, unaffected by this ship.
- `dissent-2026-08-13-0005` (active, non-blocking) — this ship implements its M1/M2/M3 conditions (above). **Its own citation names `dissent-2026-08-05-0001`'s condition 2 ("a third read surface lands") without amending it — and that condition fires the moment this merge lands**, since `librarian-positions` now appears in `src/server.ts`. This is expected, not a defect; `dissent-2026-08-05-0001` (Phase 0, enrichment zero-candidate class-invisibility) is unrelated in substance to Phase B and remains non-blocking, but the reactivation should be checked (not assumed) by the dissent monitor / next `flow-pulse` immediately after this merge — watched (W-3).

## Rollout

Single-user local MCP server — see `rollout-plan.yaml`. Ring-0 (Robin's live install) is the only ring; it begins when the operator commits/pushes/merges this branch and restarts the MCP server (`SERVER_INSTRUCTIONS` is read at server construction, so a fresh client connection is what actually teaches clients the new `librarian-positions` tool). No feature-flag platform exists; the reversibility seam is the disposable, fully-rebuildable SQLite projection this ship adds (INV-4) plus the fact that the position-capture write path (Phase A, already shipped) is verified byte-for-byte unchanged.

## Rollback path

- **Pre-merge rollback** (this branch, not yet merged to `main`): `git branch -D ship/decision-graph-phase-b` — nothing has touched `main`.
- **Post-merge rollback**: `/flow-ship --rollback ship-2026-08-13-0002` — the exact reverse diff (`fb4b1c9` → `c1065c4` on the promoted paths) was already computed and fired clean in the revert-probe step above, so this is a proven path, not an assumed one.
- **Data rollback**: the position-fold's SQLite tables are disposable and fully rebuildable (INV-4) — deleting `data/librarian.db` and re-running reindex regenerates them from `_librarian/positions/*.md`, which this ship never modifies (SR-065, verified). No data-rollback story is needed beyond "reindex."

## Comms

`comms/changelog.md` + `comms/internal-changelog.md` — default slim bundle (no wider audience tiers requested; this is a personal, single-user tool).

---

## Process notes (not ship-gating items, recorded for the effort's own history)

- This is the effort's **second** ship to actually spend the `deep` eval-depth tier and fire a real revert probe (both were first exercised for real at `ship-2026-08-13-0001`, Phase A) — both mechanisms are now proven twice, not once.
- **New this ship**: a chavruta-mandated pinning test (M1) was written and committed as a pre-ship gate condition, then independently mutation-tested by the deep-pass evaluator (not just read) before the gate closed. Recommend this become the standard verification bar for any future chavruta-mandated test, not just a presence check.
- **Also new this ship**: the deep-pass evaluator found and corrected its own tooling gap mid-run (a `grep -I` invariant scan silently skipping a NUL-containing file) rather than reporting a false-clean result. Worth noting in `/flow-eval`'s own backlog as a standing instruction for future invariant scans (`grep -a`, not `grep -I`, when scanning `src/` for destructive patterns).
