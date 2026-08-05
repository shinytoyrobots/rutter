# Ship Record — ship-2026-08-05-0001

**Date**: 2026-08-05T04:20:00Z
**Effort**: decision-graph (Phase 0 — durable note identity)
**Variant**: gen-2/population/var-3-reversibility
**Ship SHA**: `993a89d` on `flow/dg-gen2/var-3-reversibility` (= 71f41ff + pre-ship
mitigations M1+M2; lineage: main c5c8673 → gen-1 6684dff → gen-2 71f41ff → 993a89d)
**Constraint bias**: reversibility
**Spec version**: v3.10.1 · suite 0.7.0 · constitution v4.0.0
**Ship kind**: METASTABLE (convergence 0.846 < 0.85; stability 0.90, spec-proximity 0.96)
**HITL approval**: operator, 2026-08-05 — converge gate, "Ship with M1+M2" chosen
(micro-harden-over-arm precedent)

## What shipped

The note-identity subsystem: recorded refs survive vault renames via exact-hash
auto-binding (SR-036); ambiguity is surfaced, never guessed (SR-037, prohibition 8);
human confirmation via CLI only (SR-038/SR-044); append-only `note-identity@1` ledger
at `_librarian/note-identity.md` (SR-039); drop-and-rebuild projections (SR-040/041);
read-time resolution with stored bytes untouched (SR-042); unresolved refs rendered
with candidates on read surfaces (SR-043, incl. enrichment); strict (path, hash)
keying, direct rebinding, no chains (SR-045); confirmed bindings sticky with
conflicts surfaced (SR-046).

## Pre-ship mitigations applied (chavruta, re-verified)

- **M1** (`src/identity.ts` + test): `normalizeFieldOrder` coupled to
  `IdentityBindingSchema` by module-load assertion + loud refusal of unknown binding
  fields at the write choke point. Fail closed — dissent-0002's silent-field-drop
  hazard. Suite 112 → 113, tsc clean, in worktree AND post-promotion main tree.
- **M2** (README + docs/memory-of-use.md §6): documented that a zero-candidate
  unresolved ref (renamed AND edited) is visible on `librarian-recent` only;
  enrichment is candidate-anchored — dissent-0001's documentation resolution.

## Pareto-front scores at ship (var-3, suite 0.7.0)

| Dimension | Score | Threshold |
|-----------|-------|-----------|
| correctness | 1.00 | 0.95 ✓ (incl. COR-A-018/019/020 — this ship's reason to exist) |
| performance | 0.85 | 0.80 ✓ (LOW confidence; SR-104 report-only) |
| maintainability | 0.86 | 0.70 ✓ |
| documentation | 0.97 | 0.90 ✓ (gen-1 FAIL cured) |
| security | 1.00 | 1.00 ✓ |
| cost | 0.847 | 0.50 ✓ (normalized at 200k, constitution v4.0.0) |

## SRs covered / deferred

- SR-036..046: **passing** (the full Phase 0 scope).
- SR-104: implemented; **numeric bound deferred** — `mapping-pending: calibration`
  stands. Owed: instrument the NAMED span (dead-ref detection + exact-hash matching +
  projection rebuild) on THIS shipped code, then patch the bound (chavruta corrected
  the full-reindex-span shortcut; ~103ms identity-pass p50 at 2,300 notes is the
  current shared-corpus figure).
- SR-024..035: behavior shipped previously (s1-5); still guarded by repo tests only —
  suite backfill remains flow-eval backlog.

## Active dissents at ship (both from this checkpoint, both non-blocking)

- `dissent-2026-08-05-0001` — zero-candidate unresolved refs structurally invisible
  on enrichment (documented via M2; 4 reactivation conditions armed, incl. the
  zero-candidate-enrichment eval task whose PASS would resolve it).
- `dissent-2026-08-05-0002` — canonical-field-list drift hazard (mitigated via M1;
  5 conditions armed, incl. the re-derivability probe and first-confirmed-binding
  trigger — bindings stop being re-derivable at first edit-after-bind).

## Rollout

Single-user local MCP server — see `rollout-plan.yaml`. Ring 0 (dogfood on Robin's
live vault) is the only ring; it begins when the operator commits and restarts the
server. No feature-flag platform exists; the reversibility seam is the ledger file
plus the `identity_*` projection tables (drop-and-rebuild).

## Rollback path

Working tree is promoted but **uncommitted** (git gate: operator commits).
- Pre-commit rollback: `git restore --staged --worktree -- README.md package.json docs/memory-of-use.md src/ test/` (restores main @ c5c8673 state; `src/identity.ts`, `src/identity-confirm-cli.ts`, `test/identity.test.ts` become untracked-new — delete them).
- Post-commit rollback: `/flow-ship --rollback ship-2026-08-05-0001` (reverse-diff to c5c8673 for the promoted paths).
- Data rollback: delete `_librarian/note-identity.md` ONLY if no confirmed binding
  exists (after the first `detected: confirmed` entry the ledger holds the only copy
  — dissent-0002). Projections always rebuild from vault + sidecar.

## Watch condition (post-ship)

Any eval dimension regressing >0.10 from the scores above on a post-ship run, OR any
dissent reactivation condition firing (see `post-ship-eval/config.md`), OR the
identity pass visibly slowing daily reindex on the live vault (~2,300 notes).

## Comms

`comms/changelog.md` — single-audience (changelog + how-to), per operator preference;
the how-to is the shipped docs themselves (README §note-identity, memory-of-use §6).

---

## Addendum — fix1 (2026-08-05, pre-merge of PR #17)

Ring-0 day one surfaced a defect the whole pipeline missed: dead-ref detection
resolved paths against the markdown notes index, not the disk — 27 of 31 reported
dead refs were live non-note files mislabeled UNRESOLVED. Routed fix-now-same-PR
(HITL): spec v3.10.2 (patch, path resolution = confined disk existence, any file
type), suite 0.8.0 (COR-R-038 from the incident + COR-A-021 over-correction
holdout), fix @ dfa3811 (existsConfined fallback; candidates stay notes-only;
ledger/SR-046 untouched), independently re-scored ALL GREEN — correctness 1.00
stands, 116/116 tests. Live-vault proof: 31 → 4 dead-ref records (2 genuine
paths). Ship SHA for this record is superseded by the PR head (merge 4307ea5).
New suite debt from the fix's ledger audit: D-4 (edited-in-place ref, no task —
MEDIUM), D-5 (renamed non-note never rediscovered, no task — LOW-MEDIUM).
dissent-0001 remains reactivated: the live zero-candidate population is now 100%
genuine (the two kung-fu draft paths) — operator acknowledge/mitigate/resolve
pending.
