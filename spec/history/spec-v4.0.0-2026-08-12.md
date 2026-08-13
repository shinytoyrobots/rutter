---
version: "4.0.0"
parent: "3.12.0"
effort: decision-graph
date: 2026-08-12
change-type: major   # existing SCN-010 and SR-049 text modified (version-semantics table); both changes are narrow corrections to same-day, not-yet-dispatched text
change-summary: "flow-panel divergences on SCN-010/Phase A resolved: SR-049 identity tuple now includes revises; new SR-057 (empty stance = no directive)"
author: orchestrating session, following /flow-spec amend (panel-routed, HITL already given via AskUserQuestion at /flow-panel)
hitl: "resolved 2026-08-12 — AskUserQuestion at /flow-panel routed both divergences to AMEND (majority reading in each case); this round writes the exact wording"
mapping-pending: true   # SR-057 unmapped; SR-049's amendment doesn't change its (already-pending) mapping status
---

# History — Spec v4.0.0 (decision-graph Phase A: panel-amendment round)

## Why

`/flow-panel` ran 3 independent sonnet readers over SCN-010/SR-047..056 (spec
v3.12.0) before any code was dispatched against it — a pre-implementation probe, not
a post-hoc review. It located 2 genuine divergences (out of 10 SRs and 9 acceptance
criteria, the rest converged, including all three readers' independently-sketched
implementation architecture). Both were routed to the operator as a single
AskUserQuestion call with two questions, framed exactly as "amend" vs "accept as
recorded ambiguity." Both were resolved AMEND, matching the majority reading (2 of 3)
in each case. Full panel record: `spec/.staging/panel-2026-08-12.md`.

## Diff summary

- **~ SR-049 amended.** Was: identity tuple = "kind, topic key, stance, and
  referenced note paths" (silent on `revises`). Now: identity tuple explicitly
  includes `revises` (present-or-absent, and its value where present); a directive
  differing only in `revises` from an otherwise-identical prior one is NOT identical
  and appends as a new event. Rationale (2 of 3 panel readers): `revises` is
  client-authored directive content, not derived/volatile metadata like a timestamp
  — excluding it risked silently dropping a supersession correction the client
  explicitly typed, which is the exact failure mode HANDOFF §1's "weighs openly,
  attributably, reversibly — never silently" stance exists to prevent.
- **~ SCN-010 amended: +1 acceptance criterion ("Empty stance is no directive").** A
  directive whose stance is empty/whitespace-only after a well-formed `topic-key:`
  fails the grammar and is treated as no directive — same precedent as SCN-001's
  unfilled-`<template>` rule (SR-029) — reported on stderr, nothing appended.
  Rationale (2 of 3 panel readers): the fixed grammar requires a real stance segment;
  the third reader's "store the empty string, no minimum stated" reading was
  considered but not adopted, since it would leave a functionally useless record
  that carries no information a future reader could act on, for symmetry with how
  SCN-001 already treats a structurally-incomplete directive.
- **+ SR-057** (new, derived from SCN-010): formalizes the empty-stance rule above.
  Enters the Requirements section immediately after SR-056; added to SCN-010's
  derived-requirements list and the traceability row.
- **~ Traceability row for SCN-010** updated to note the v4.0.0 amendment and list
  SR-057.
- **~ Conformance tests v3.12.0 paragraph** updated to read "SR-047..057."
- Nothing else in `spec/spec.md` changed: SCN-010's Given/When/Then and its other 9
  acceptance criteria, SR-047/048/050..056, all glossary entries, and every SCN/SR
  outside this scope are byte-identical to v3.12.0.

## Deliberately NOT changed

- The 2 convergent-but-underspecified gaps the panel also surfaced (cross-month
  idempotence scope; ref-extraction syntax with no explicit grammar slot) — recorded
  in the panel file as candidates for a future patch, not amended here. Neither had a
  behavioral disagreement across readers, only textual silence.
- The 1 apparent divergence that dissolved on inspection (SR-054's 40-vs-60 trigger)
  — SR-034, the precedent SR-054 explicitly cites, already resolves this to "ceiling"
  — no amendment needed.
- `evals/harness.yaml` — SR-057 enters `mapping-pending: true` exactly like the rest
  of SCN-010's SRs; owned by flow-eval, untouched here.
- Constitution — untouched. Escalation trigger 4 (light → standard class-promotion
  review) remains separately un-cleared; this amendment changes nothing about
  readiness to dispatch.
- Code — none exists yet for this scope; nothing to regenerate.

## Effects

- `spec/.staging/panel-2026-08-12.md` updated to record both divergences as
  implemented (not just routed).
- `efforts/decision-graph/flow-state.yaml` phase-log appended; `checkpoint.redispatch`
  evidence reference moves from `spec-delta:v3.12.0` to `spec-delta:v4.0.0`.
- `flow-generate` for this scope remains blocked on the same two pre-existing gates
  (mapping-pending; escalation trigger 4) — this round did not clear either.
