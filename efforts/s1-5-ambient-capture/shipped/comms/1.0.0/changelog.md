# Spec v1.0.0 — s1-5-ambient-capture (2026-07-25)

*Initial spec authoring; no code shipped yet. Single-audience changelog (personal
project — sales/support/marketing tiers deliberately omitted.)*

## What was decided

S1.5 — **ambient memory-of-use capture** — now has an executable spec (v1.0.0) and a
project constitution. This is the first stateful slice of the Librarian and its real
desirability gate.

**Specified behaviors (4 scenarios):**
- One curated summary line per Claude Code session, captured ambiently at session end
  into `_librarian/sessions/<date>.md`, referencing store notes by versioned identity.
- `librarian-recent` — "what was I working on lately?", reverse-chronological with
  provenance.
- Quiet prior-engagement enrichment on `librarian-search` (never re-ranks, never nags).
- Instrumentation making the ≥3×/week-for-2-weeks desirability gate measurable.

**Hard rules (6 invariants @ 1.0):** local-first/no egress · store immutability ·
no hard-delete of memory-of-use · SQLite rebuildability · stdout purity · no LLM in
the server.

**Constitution highlight (added at HITL):** every shipped stage must include a user
"how-to" documentation pass (SR-103 / prohibition 7).

## Blocking next step

Everything is `mapping-pending` — run `/flow-eval` to author the correctness dataset
(one task per acceptance criterion), non-functional graders, and the six invariant
grader pairs before `flow-generate` may run.
