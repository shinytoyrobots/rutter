---
version: "1.0.0"
parent: none
effort: s1-5-ambient-capture
date: 2026-07-25
change-type: minor   # initial authoring — all content additive, no prior spec modified
author: flow-spec-writer
hitl: approved       # 2026-07-25, approved with one modification (SR-103 / constitution prohibition 7: docs pass at every stage); mapping-pending accepted
mapping-pending: true
---

# History — Spec v1.0.0 (initial authoring)

## Change summary

Bootstrap authoring of the initial executable spec for effort **s1-5-ambient-capture**
(S1.5 — ambient memory-of-use capture), the first stateful slice of the Librarian and
the project's real desirability gate. No spec previously existed; this establishes the
v1.0.0 baseline: scenarios, derived + non-functional requirements, invariants,
constitution, and a mapping-pending eval harness.

Scope was held deliberately to the cheapest useful slice behind a kill gate: capture
one curated line per session, store it durably as memory-of-use, recall recent work,
quietly enrich search, and instrument the desirability gate. H2 (belief-lifecycle,
Marginalia, Pinakes, grading, embeddings, mdbase adoption) and H3 (full-transcript
ingestion) are explicitly out of scope and recorded as boundaries.

## Design decisions carried into the spec

- The Stop-hook mechanism is a genuine open spike (DESIGN §3, HANDOFF §8). The spec
  fixes the **observable contract** (one curated line appears in the day's session
  record after session end) and records the mechanism openness rather than fabricating
  it (SCN-001).
- Appraisal depth is open; for S1.5 appraisal is light (one curated line, not the raw
  transcript). Summary-*quality* grading is deferred to H2; S1.5 encodes only
  structural constraints. Recorded as glossary + SCN-001/SCN-004 notes.
- "Unprompted" classification for the desirability gate is not automatable; SCN-004
  instruments all stateful invocations with timestamps and defers prompted/unprompted
  classification to manual wish-log review.
- Six hard constraints from HANDOFF §4 / DESIGN were promoted to invariants (threshold
  1.0), because they must hold across every implementation and every future phase, not
  just this slice.

## Diff summary (all additive vs. empty baseline)

**Scenarios added:** SCN-001, SCN-002, SCN-003, SCN-004

**Requirements added (functional, scenario-derived):**
- SR-001, SR-002, SR-003, SR-004 (← SCN-001)
- SR-005, SR-006, SR-007 (← SCN-002)
- SR-008, SR-009, SR-010 (← SCN-003)
- SR-011, SR-012 (← SCN-004)

**Requirements added (non-functional, no parent):**
- SR-100 (mdbase-compatible frontmatter)
- SR-101 (untrusted-input handling)
- SR-102 (repo hygiene — no vault/session content in code repo)
- SR-103 (user how-to docs updated at every shipped stage — added at HITL approval)

**Invariants added:** INV-1 (local-first), INV-2 (store immutability), INV-3
(no hard-delete), INV-4 (rebuildability), INV-5 (stdout purity), INV-6 (no LLM in
server) — each threshold 1.0, dedicated grader + real/adversarial dataset pair.

**Constitution:** initial — 7 prohibitions, 5 preferences, 3 escalation triggers.

**Glossary added:** store, memory-of-use, session record, versioned ref, ambient
capture, appraisal, stateful behavior.

## Outstanding

- `mapping-pending: true` throughout. No `evals/` datasets or graders exist yet.
  flow-eval must create the correctness dataset (one task per acceptance criterion),
  the non-functional datasets/graders, and the six INV grader + real/adversarial pairs
  before flow-generate proceeds. Mapping-pending explicitly acknowledged at HITL.
- HITL gate PASSED 2026-07-25: approved with one modification (docs-pass rule →
  SR-103 + constitution prohibition 7).
