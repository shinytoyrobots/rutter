# spec v5.0.0 — 2026-08-13

**Effort:** decision-graph (ship-close correction, not a new build round)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**SR-056 amended.** Its cited instruction-budget baseline was stale:

| | Before (v4.0.0) | After (v5.0.0) |
|---|---|---|
| Baseline | 2,093 chars (OBS-1, ship-2026-07-27-0004) | 3,030 chars (live `dist/stdio.js` initialize handshake, measured against `main` @ `631640e`) |
| Delta budget | ≤350 chars over baseline | ≤350 chars over baseline (**unchanged**) |
| Literal ceiling | 2,443 chars | 3,380 chars |

The old baseline was measured at ship-2026-07-27-0004 and never re-baselined as later ships (workspace provenance SR-015..020, note identity, the rutter rename, user-label templating) grew the real `SERVER_INSTRUCTIONS` string. By the time SR-056 was authored (v3.12.0) and Phase A shipped (v4.0.0), the true pre-change baseline was already ~3,030 chars — independently confirmed by both the gen-3 and gen-4 evaluators via live spawn + real JSON-RPC handshake, and reconfirmed here against the exact pre-change commit. Read literally, SR-056's old ceiling (2,443 chars) was already 587 characters below the real baseline alone — unsatisfiable by any implementation, including the one that actually shipped (which added 279–281 characters, comfortably inside the intended 350-char budget once measured against the real baseline).

**SCN-010's "Instruction budget" acceptance-criteria bullet** (which restated the same 2,093 figure) corrected in the same pass, for internal consistency.

**Traceability table** updated: SCN-010 now shows `amended v4.0.0, v5.0.0`; SR-056 now shows `amended v5.0.0`.

## What did NOT change

- The 350-character delta budget itself — only the reference point it's measured against.
- SR-056's intent (guard `SERVER_INSTRUCTIONS` against bloat, per SR-020/SR-026 ubiquity).
- Any other SCN-010 acceptance criterion, any other SR, any code.
- `evals/harness.yaml` mapping status — SR-056 was already `mapping-pending: true` and stays so (owned by `/flow-eval`).

## Dissent check

This edit touches SCN-010 acceptance-criteria text, one of the literal reactivation triggers `dissent-2026-08-13-0003` watches. Re-checked 2026-08-13: that dissent concerns which sentinel tag encodes a position directive (shared vs. distinct channel) — an unrelated question to this baseline-accounting correction. `dissent-2026-08-13-0003` and `-0004` both remain `active`, non-blocking, `reactivation-count: 0`. Noted, not reactivated.

## Not addressed this round

- `SG-9` (unrecognized-directive-kind diagnostic gap) — separately tracked, not urgent.
- `evals/datasets/correctness-real-v1.jsonl`'s `COR-R-050` task still cites the stale 2,093 figure in its `setup`/`expected`/`pass` fields — owed to `/flow-eval`, not fixed here. The grader will keep testing the wrong number until that update lands.

## Panel

Not run. This is a factual/measurement correction with no interpretive ambiguity or behavioral change — not the kind of divergence `/flow-panel` exists to catch. Recommend skipping; re-open if disagreed with.

## Artifacts

- Proposed draft: `spec/.staging/spec-proposed-sr-056-baseline.md`
- This record: `spec/history/spec-v5.0.0-2026-08-13.md`
