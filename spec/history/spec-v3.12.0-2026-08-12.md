---
version: "3.12.0"
parent: "3.11.0"
effort: decision-graph
date: 2026-08-12
change-type: minor   # additive only — new SCN/SR; no existing SCN/SR/INV/glossary text modified
change-summary: "Phase A of decision-graph: position capture, the write path for capability #3 (belief-lifecycle) — SCN-010, SR-047..056"
author: flow-spec-writer (invoked via /flow-spec)
hitl: "resolved 2026-08-12 — AskUserQuestion, approved as drafted (with two 'read surface' -> 'query path' rewording fixes to avoid a false dissent-0001 reactivation match)"
mapping-pending: true   # every new SR/SCN unmapped; TODO(flow-eval) — evals/ untouched, owned by flow-eval
---

# History — Spec v3.12.0 (decision-graph Phase A: position capture)

## Why

Phases A–C of `docs/decision-graph-plan.md` were explicitly out of scope at v3.8.0,
gated on constitution escalation trigger 5: the desirability-gate verdict, AND the
operator's wish-log entry recording real demand. Both cleared 2026-08-12:

- The gate verdict passed (`docs/gate-verdict-2026-08.md`) — both full post-restart
  weeks cleared the ≥3/week bar by a wide margin, and every logged call traced to a
  live human question, not standing-instruction-only use.
- Two wish-log entries (dated 2026-08-11 and 2026-08-12) recorded real, dated
  friction: a cross-month consistency check performed by hand (referencing decisions
  from September and November 2025), generalized same-day to the actual primitive
  needed — a topic's full trajectory of positions over a date range, not a
  two-point diff — plus recurring mid-session belief drift tracked today only by
  hand-built handoffs and session-ID cross-referencing. This supersedes the
  2026-08-04 draft wish-log entry noted in `docs/decision-graph-plan.md`'s sequencing
  constraints, which was never actually logged.

The design and build plan were authored 2026-08-04 (`docs/decision-graph.md`,
`docs/decision-graph-plan.md`) and correctly declined to build ahead of evidence.
This round formalizes Phase A only, per that plan.

## Diff summary

Spec (`spec/spec.md`, all additive; no existing SCN/SR/INV/glossary text modified):

- ~ frontmatter: version 3.11.0 → 3.12.0; last-amended 2026-08-12; mapping-pending
  false → true (SR-104's existing calibration exception plus ten new unmapped SRs)
- ~ "Effort: decision-graph" heading and lead paragraph updated to name Phase 0 as
  shipped and Phase A as now in scope, with Phases B–D remaining out
- ~ scope subsection split: "Phase 0 — scope" boundary bullet removing the
  now-satisfied Phases-A–C gate language; new "Phase A — scope" subsection added
  (in scope: position capture; out of scope: Phases B–D, any change to
  `session-record@1`/capture idempotence/instrumentation, and dispatch itself —
  escalation trigger 4 is a separate, not-yet-cleared gate)
- + SCN-010: a formed stance is captured as a position event, exactly once per
  distinct directive (new sentinel-channel directive, kind-routed by `capture-cli`,
  stored in a wholly separate append-only stream so `session-record@1` and all
  existing capture behavior stay byte-for-byte unchanged)
- + SR-047 grammar/kind routing; + SR-048 stream shape and event fields;
  + SR-049 idempotence (SR-013's pattern); + SR-050 retire-appends-never-deletes
  (INV-3); + SR-051 supersession as deterministic fold order, no model judgment
  (INV-6); + SR-052 optional explicit `revises:` field; + SR-053 free-form topic
  keys, reported not enforced; + SR-054 stance word budget, reported not enforced
  (SR-034 pattern); + SR-055 session non-interference as a required test;
  + SR-056 instruction-budget cap (≤350 chars over the OBS-1 baseline of 2,093)
- + Traceability: one SCN-010 row, all ten SRs listed, `mapping-pending: true`
- + Conformance tests: v3.12.0 mapping-pending paragraph appended, explicitly noting
  no interim coverage exists because Phase A has not yet been dispatched
- + Glossary: "Position", "Position event", "Positions stream (`position-event@1`)",
  "Topic key"

Constitution: **untouched.** No prohibition, preference, or escalation trigger
changed — the two gates in trigger 5 were satisfied externally (the verdict and the
wish log), not amended away, so the trigger's text stays as a permanent rule.
Escalation trigger 4 (light → standard weight-class review before dispatch) is
explicitly flagged in-spec as a separate gate this round does not clear.

## Deliberately NOT changed

- `session-record@1`, capture idempotence identity (SR-013/SR-018/SR-024), read-path
  grouping (SR-030..032), instrumentation (SCN-004) — SR-055 makes non-interference a
  required test, not just an intention.
- Any read path: no query, no trajectory/supersession-chain semantics, no drift
  detection. That is Phase B, a separate future spec round — Phase A only guarantees
  the stored events support it later (SR-048, SR-051).
- Backfill of the ~193 pre-position records (Phase D; deferred per the plan).
- `evals/` — owned by flow-eval; every new mapping is a TODO, not an edit.
- `efforts/decision-graph/dissents-active.yaml` — both existing dissents (0001, 0002)
  checked against this change; neither reactivates (see Effects).

## Effects

- `flow-generate` for decision-graph Phase A is BLOCKED on two independent gates:
  (1) `flow-eval` clearing `mapping-pending` for SCN-010/SR-047..056, and
  (2) constitution escalation trigger 4's light → standard weight-class promotion
  review, which this spec ratification does not satisfy.
- Dissent-monitor check run against both `efforts/decision-graph/dissents-active.yaml`
  entries: dissent-0001's only spec-change-typed reactivation condition greps
  `spec.md` for `'SR-043|read surface'` — the draft's first-pass wording would have
  added an accidental match ("the fold's read surface..."); reworded to "query path"
  before writing, so the match count is unchanged and the dissent does not
  reactivate. Dissent-0002's conditions all target `src/identity.ts` /
  `note-identity@1` / the ledger, none of which this round touches — confirmed by
  direct grep against the live repo and vault ledger, not by inference alone.
- `flow.yaml` and `efforts/decision-graph/flow-state.yaml` phase-log updated to
  record this round (see phase-log entry).
