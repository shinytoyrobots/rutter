# spec v7.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Adds SCN-011** ("A live position and its supersession chain are recalled for a topic") and its derived requirements **SR-058 through SR-065** — the read path for capability #3 (belief-lifecycle), per `docs/decision-graph-plan.md`'s Phase B design. Escalation trigger 5's gates (desirability-gate verdict + wish-log demand) were already cleared 2026-08-12 for Phases A–C, not just Phase A, so Phase B was free to enter spec scope.

### Mechanism (matches the 2026-08-04 plan, corrected where Phase A's actual implementation taught something the plan couldn't have known)

- **SR-058 — cross-month fold.** The fold reads every `_librarian/positions/<YYYY-MM>.md` file, not just the most recent, mirroring SR-049's already-corrected cross-month idempotence scope.
- **SR-059 — deterministic, rebuildable fold.** Pure function of the event stream; full rebuild and incremental update agree byte-for-byte (INV-4/INV-6, cited not restated).
- **SR-060 — retire is a terminal marker, not a stored deleted state.** Computed at read time; no event is ever removed to produce a "retired" display.
- **SR-061 — query modes.** `librarian-positions`: topic key (exact), free text (FTS over stances), or note (versioned identity). Live-only by default, full chain on request.
- **SR-062 — attribution, never blending.** `SERVER_INSTRUCTIONS` extension requiring explicit provenance on every recalled stance (the SCN-007 recall-clarity precedent, applied to positions). **This is the SR that trips constitution escalation trigger 4** (see below).
- **SR-063 — dormant is computed, never stored.** No decay score, no stored status field.
- **SR-064 — topic_key renders inert.** Closes Phase A's `SG-10` rendering gap now that a real read surface prints topic keys.
- **SR-065 — write-path non-interference.** Mirrors SR-055's guarantee for Phase A, extended to the fold and the new tool.

### Folded-in correction: SR-048's schema id

Found while drafting — since Phase B's fold reads exactly this schema, an uncorrected reference would have been the same spec-vs-code gap class this effort just spent two rounds (v5.0.0, v6.0.0) closing for the wire format. **Five normative references** corrected `position-event@1` → `position-event@1-provisional` (the actual shipped `src/positions.ts#SCHEMA_ID`, the dissent-2026-08-13-0004 M1 mitigation): SR-048 itself, SCN-010's Then-clause, SCN-010's "Separate stream" acceptance criterion, the Phase A scope summary, and the glossary's "Positions stream" entry. The v3.12.0 changelog entry describing what Phase A originally proposed is left untouched — historically accurate at the time it was written.

### New glossary entry

**Live position / dormant** — added, applying the exact lesson this session's wire-format work surfaced: "sentinel channel" went undefined for months and became a real, measured ambiguity. "Dormant" is exactly as load-bearing and exactly as easy to leave undefined, so it isn't.

### Scope sections

Added `### Effort: decision-graph (Phase B) — scope *(v7.0.0)*`, listing in-scope items (reindex fold, new tool, attribution guidance, dormant computation, retire-as-stub, instrumentation exclusion, inert topic-key rendering) and out-of-scope boundaries (Phase C's drift visibility/threads, Phase D's backfill, any write-path change, multi-user projection, dispatch). Phase A's own "out of scope" bullet trimmed from "Phases B–D" to "Phases C–D" since B now has its own section. The phase-overview blurb updated to say Phase B is in scope as of v7.0.0.

## What did NOT change

- No code. This drafts the spec only.
- SR-050, SR-051, SR-053, SR-054, SR-055, SR-056, SR-057 (Phase A) — untouched beyond the SR-048 schema-id fix.
- `evals/harness.yaml` — SCN-011/SR-058..065 enter `mapping-pending: true`, same as Phase A's SRs; owned by `/flow-eval`, not touched here.

## Escalation trigger 4 — NOT cleared by this round

Constitution escalation trigger 4 (a decision-graph SR touching the capture contract or server instructions requires a light → standard weight-class promotion review, HITL, before dispatch) applies again here: SR-062's attribution guidance extends `SERVER_INSTRUCTIONS`, exactly the surface the trigger names. This spec round satisfies trigger 5 (already cleared for Phases A–C, not re-litigated here); it does not clear trigger 4. That stays a separate, not-yet-cleared gate before any `/flow-generate` dispatch — exactly the same posture Phase A's own spec round (v3.12.0) flagged for itself, and precisely why it's worth restating rather than assuming it carries over silently.

## Dissent check

`dissent-2026-08-13-0004` (SERVER_INSTRUCTIONS teaching timing) remains active, unaffected — its conditions concern the position-capture (write-side) grammar being taught and the `PositionEventSchema`'s field stability, neither of which this round touches. `dissent-2026-08-13-0003` is already resolved (v6.0.0) and not re-evaluated (resolved is terminal).

## Panel

**Recommended, not skipped.** Unlike the v5.0.0/v6.0.0 rounds (which mostly codified already-known, already-implemented facts), SCN-011 is genuinely new scenario content with real interpretive surface — query-mode semantics, projection-table shape, exactly what "dormant" computation looks like in practice. This is precisely the kind of pre-implementation ambiguity `/flow-panel` exists to catch cheaply, before any generation is dispatched. Suggest running it before `/flow-generate`.

## Artifacts

- Proposed draft: `spec/.staging/spec-proposed-scn-011-phase-b.md`
- This record: `spec/history/spec-v7.0.0-2026-08-13.md`
