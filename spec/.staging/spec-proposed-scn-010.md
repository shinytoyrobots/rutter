# PROPOSED — SCN-010 / SR-047..SR-056 (spec v3.11.0 → v3.12.0, minor)

**Status:** staged draft, NOT ratified, NOT written to `spec/spec.md`.
**Effort:** decision-graph, Phase A (position capture — the write path for
capability #3). Source design: `docs/decision-graph.md`; source plan:
`docs/decision-graph-plan.md` §Phase A. Gates for Phases A–C entering scope
(constitution escalation trigger 5) cleared 2026-08-12: gate verdict PASS
(`docs/gate-verdict-2026-08.md`) + wish-log demand entries dated 2026-08-11 and
2026-08-12.
**Author:** flow-spec-writer, 2026-08-12.

---

## 1. New scenario (insert after SCN-009 in Behavioral scenarios)

### SCN-010: A formed stance is captured as a position event, exactly once per distinct directive *(v3.12.0, effort decision-graph, Phase A)*
**Given** a Claude Code session in which the client formed, changed, reaffirmed, or
retired a stance on a topic — expected ≪ 1 per session, against ~19.3 outcome
entries per day — with the librarian registered and the Stop hook installed
**When** the client emits a position directive on the same sentinel channel session
directives use, `POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance>`,
and the capture hook lifts it
**Then** the capture path shall route the directive by kind and append exactly one
position event per distinct directive to a separate positions stream
`_librarian/positions/<YYYY-MM>.md` (schema `position-event@1`), storing the stance
byte-verbatim with workspace provenance and versioned refs — while
`session-record@1` and all existing session capture behavior remain byte-for-byte
unchanged.

**Acceptance criteria:**
- **Grammar and kind routing.** A directive of the form
  `POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance>` is routed by
  `capture-cli` to the position write path; a session-summary directive on the same
  sentinel channel routes to session capture exactly as before. Kind is the only
  router — no content heuristics, no model (INV-6 / constitution prohibition 1,
  cited not restated). (The sentinel wrapping is the session directive's existing
  channel; this spec fixes the grammar and the routing, not the wrapper bytes.)
- **Separate stream.** The event is appended to `_librarian/positions/<YYYY-MM>.md`
  — append-only, schema `position-event@1`, mdbase-compatible frontmatter
  (constitution preference 2) — never to a session record. Writes stay under
  `_librarian/` (INV-2 / constitution prohibition 5).
- **Event shape.** Each event carries an event id, the directive kind, the topic
  key, the stance byte-verbatim, a timestamp, workspace provenance (SR-015's
  derivation, SR-016's never-blocks rule), and any named refs by versioned identity
  hashed as-read exactly as session refs are (SR-003 pattern) — so Phase B's fold
  and the note-identity pass (SCN-008/SCN-009) can resolve them later without
  retrofit.
- **Idempotence.** A repeat capture of an unchanged position directive (same
  session id, kind, topic key, stance, and referenced-path set — referenced-note
  content hashes inert, per SR-024's rule) appends nothing and leaves the positions
  file byte-identical, regardless of how many Stop events fire (SCN-001/SR-013
  pattern). A `reaffirm` differs by kind or by session and is a distinct directive
  that appends normally — idempotence guards hook re-firing, never the lifecycle.
- **Retire is an event.** A `retire` directive appends a new position event; no
  earlier event is modified, removed, or compacted (INV-3 / constitution
  prohibition 3). The stream is never rewritten, reordered, or compacted.
- **Supersession is deterministic fold order.** For events sharing a topic key,
  supersession is implicit in the stream's append order — a deterministic fold
  computable by code alone, no model judgment (INV-6 / constitution prohibition 1)
  — with an explicit `revises: <event-id>` field, where supplied, stored verbatim
  on the event for precision. Phase A guarantees the data supports the fold; the
  fold's read surface is Phase B and is deliberately NOT specced here.
- **Topic keys are reported, never enforced.** Topic keys are free-form kebab-case,
  client-chosen, grouped only at read time; a key departing from the convention is
  reported as a stderr diagnostic and stored byte-verbatim — never rejected,
  rewritten, or normalized (constitution preference 3's quiet-when-unprompted
  spirit; the SR-034 report-don't-enforce pattern on a new field).
- **Stance budget is reported, never enforced.** The stance line carries the style
  contract's 40/60 word budget; an over-budget stance is reported on stderr and
  stored byte-verbatim with no annotation on the record (SR-034 shape; refines
  SR-023 / INV-6 — never rewrite, truncate, or reject on style or length grounds).
- **Session capture untouched.** `session-record@1`, every existing session
  record's bytes, and SCN-001/SCN-002 observable behavior are byte-for-byte
  unchanged by the presence or absence of position capture — positions are a wholly
  separate write path, and a session-record byte-compare before/after a position
  capture is a required test.
- **Instruction budget.** The `SERVER_INSTRUCTIONS` addition teaching the directive
  (its emission trigger — only when a stance was formed, changed, reaffirmed, or
  retired — and its literal grammar, per SR-026's rule) adds at most 350 characters
  to the OBS-1 baseline (2,093 chars); SR-027's single-source rule applies
  unchanged, so the README quoted block regenerates and the instruction-anchor
  tests move deliberately, not accidentally.

**Derived requirements:** SR-047, SR-048, SR-049, SR-050, SR-051, SR-052, SR-053,
SR-054, SR-055, SR-056

---

## 2. New requirements (insert after SR-046 in Functional (scenario-derived))

- **SR-047** — When a capture invocation carries a directive of the form
  `POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance>` on the capture
  sentinel channel, `capture-cli` shall route it by directive kind to the position
  write path and append exactly one position event per distinct directive, leaving
  session-summary routing unchanged. *(event-driven)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); routing is by kind alone — no content heuristics, no model (INV-6 / constitution prohibition 1); mapping-pending: true`
- **SR-048** — Position events shall be persisted in
  `_librarian/positions/<YYYY-MM>.md` as an append-only markdown stream under
  schema `position-event@1` with mdbase-compatible frontmatter, each event carrying
  an event id, the directive kind, the topic key, the stance byte-verbatim, a
  timestamp, workspace provenance per SR-015/SR-016 (derived automatically, never
  blocking a capture), and any named refs by versioned identity hashed as-read per
  SR-003. *(ubiquitous)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); frontmatter per constitution preference 2; writes confined to _librarian/ per INV-2 / constitution prohibition 5 (cited, not restated); parallels SR-039 (note-identity ledger) and SR-100 (session-record schema); mapping-pending: true`
- **SR-049** — If a position capture invocation carries a session id and directive
  content identical (after inert-line normalization) to a position event already
  recorded for that session — kind, topic key, stance, and referenced note paths
  unchanged, referenced-note content hashes inert per SR-024's rule — then the
  system shall append nothing and leave the positions stream byte-identical.
  *(unwanted-behavior)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); SR-013's idempotence pattern applied to the positions stream; a reaffirm differs by kind or session and is a distinct directive; mapping-pending: true`
- **SR-050** — When a `retire` directive is captured, the system shall append a new
  position event attributed to it and shall never modify, remove, reorder, or
  compact any earlier event in the positions stream. *(event-driven)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); enforces INV-3 / constitution prohibition 3 — retirement is an event, not a deletion; mapping-pending: true`
- **SR-051** — Supersession among position events sharing a topic key shall be
  implicit in the stream's deterministic fold order (append order, stable event
  ids), computable by code alone with no model judgment and no load-bearing state
  beyond the events themselves. *(ubiquitous)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); INV-6 / constitution prohibition 1; rebuildable per INV-4; the fold's READ surface (trajectory/recall) is Phase B and deliberately not specced here; mapping-pending: true`
- **SR-052** — Where a position directive supplies an explicit `revises: <event-id>`
  field, the system shall store it verbatim on the resulting event.
  *(optional-feature)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); precision override for SR-051's implicit order; stored verbatim at write time — interpretation belongs to Phase B's fold; mapping-pending: true`
- **SR-053** — If a position directive's topic key departs from free-form
  kebab-case, then the capture path shall report a diagnostic on stderr and store
  the key byte-verbatim — never rejecting, rewriting, or normalizing it; topic keys
  are client-chosen and grouped only at read time. *(unwanted-behavior)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); report-don't-enforce (SR-034 pattern; constitution preference 3); diagnostics to stderr per INV-5 / constitution prohibition 4; mapping-pending: true`
- **SR-054** — If a captured stance line exceeds the style contract's stated word
  budget (target 40, ceiling 60 — the same numbers SR-021 states), then the capture
  path shall report the word count and the budget on stderr and store the stance
  byte-verbatim with no annotation on the record; length shall never be grounds for
  rewriting, truncating, or rejecting a position directive. *(unwanted-behavior)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); SR-034 applied to the stance line; refines SR-023 / INV-6; the ceiling stays inside the SR-101 oversized-input bound; mapping-pending: true`
- **SR-055** — The position write path shall write only to `_librarian/positions/`;
  the `session-record@1` schema, every existing session record's bytes, and the
  observable behavior of SCN-001 and SCN-002 shall be byte-for-byte unchanged
  before and after any position capture. *(ubiquitous)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); the separate-stream decision (plan HITL point 1) exists to make this provable — session schema, dedupe identity, and read-time grouping untouched; mapping-pending: true`
- **SR-056** — When the server-level instructions are extended to teach the
  position directive (its emission trigger — only when a stance was formed,
  changed, reaffirmed, or retired — and its literal grammar per SR-026's rule), the
  addition shall total at most 350 characters over the pre-change OBS-1 baseline of
  2,093 characters. *(event-driven)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); guards SR-020/SR-026 ubiquity against instruction bloat (OBS-1, ship-2026-07-27-0004); SR-027 propagation (README quoted block, anchor tests) applies unchanged; mapping-pending: true`

---

## 3. New Traceability row (append after the SR-104 row)

| SCN-010 *(v3.12.0)* | grammar+kind routing, separate append-only stream, event shape, idempotence, retire-appends, deterministic fold order, explicit revises, topic-key report-not-enforce, stance-budget report-not-enforce, session non-interference, instruction budget | SR-047, SR-048, SR-049, SR-050, SR-051, SR-052, SR-053, SR-054, SR-055, SR-056 | INV-2, INV-3, INV-5, INV-6 | mapping-pending: true — correctness-real-v1 + correctness-adv-v1 expected; TODO(flow-eval): tasks per plan §Phase A Tests (idempotence, verbatim storage, budget-report-not-enforce, contract byte-compare, session-record before/after byte-compare) | correctness |

---

## 4. New Glossary entries (insert after "Path resolution (identity pass)")

- **Position** — a stance Robin holds on a topic, authored client-side (the server
  infers nothing — INV-6): formed (`assert`), changed (`revise`), re-endorsed
  (`reaffirm`), or withdrawn from listings (`retire`). A position is a projection
  over its events — rebuildable and disposable, the same rule as SQLite — never a
  stored mutable object. *(v3.12.0)*
- **Position event** — one append-only entry in the positions stream: event id,
  directive kind, topic key, stance byte-verbatim, timestamp, workspace provenance,
  refs by versioned identity, and an optional `revises: <event-id>`. Every
  lifecycle state is attributable to a moment; a retirement is an event, not a
  deletion (INV-3 / constitution prohibition 3). *(v3.12.0)*
- **Positions stream (`position-event@1`)** — the monthly append-only sidecar
  `_librarian/positions/<YYYY-MM>.md` (mdbase-compatible frontmatter, constitution
  preference 2), deliberately separate from `session-record@1` so the session
  schema, dedupe identity, and read-time grouping stay untouched. Never rewritten,
  reordered, or compacted. *(v3.12.0)*
- **Topic key** — the free-form kebab-case key a client chooses to name a
  position's topic. Client-chosen, never server-enforced or normalized (departures
  are reported, not corrected — SR-053); grouping and fold order over a topic key
  are read-time concerns. *(v3.12.0)*

---

## 5. Version classification

**Minor: 3.11.0 → 3.12.0.** Additive only: +SCN-010, +SR-047..SR-056, +1
traceability row, +4 glossary entries. No existing SCN, SR, INV, or glossary entry
is modified or removed; the constitution is untouched (spec and constitution
version independently since v3.8.0/v3.0.0). Constitution preference 4 (additive
over restructure) is satisfied.

One accompanying prose touch the ratifying session should carry in the same bump:
the Scope section's decision-graph boundary ("Phases A–C … are OUT of scope
pending …") must be annotated as cleared — gates satisfied 2026-08-12, Phase A in
scope as of v3.12.0, **Phases B–D remain out of scope**. That is a dated
clarification of scope prose recording an external fact, not a semantic change to
any SCN/SR, so the classification stays minor.

All ten SR mappings and the SCN-010 dataset row enter `mapping-pending: true`
(`evals/` is owned by flow-eval; this draft names expected homes only). Per policy,
finalization requires an explicit mapping-pending acknowledgment from the
orchestrator or operator.

---

## 6. HITL decision points encoded (plan §HITL decision points)

1. **Separate positions stream vs. extending `session-record@1` — ADOPTED:
   separate.** Encoded in SR-048 (stream shape) and SR-055 (session records
   byte-for-byte untouched, the property the separate stream exists to make
   provable).
2. **Free-form topic keys + read-time grouping vs. controlled vocabulary —
   ADOPTED: free-form.** Encoded in SR-053 (report on stderr, store verbatim,
   never enforce or normalize) and the Topic key glossary entry.
3. **`position-recall` excluded from gate arithmetic** — Phase B's concern; nothing
   in this round adds a read path or touches gate instrumentation. Constitution
   prohibition 9 already covers any decision-graph read; no SR needed here.
4. **Wish-log entry recording demand — SATISFIED** (2026-08-11 and 2026-08-12
   entries; gate verdict PASS in `docs/gate-verdict-2026-08.md`). Both halves of
   constitution escalation trigger 5 are cleared, which is what permits this round
   at all. Note: the 2026-08-12 generalization (full trajectory over a date range,
   not a two-point diff) is deliberately NOT specced here — it is Phase B read-path
   scope; Phase A only guarantees the stored events support it (SR-048, SR-051).
5. **Backfill (Phase D) — DEFERRED**, per plan: revisit +2 weeks after Phase B
   ships. Nothing here retrofits or annotates the 193 pre-position records.

This amendment also lands under **constitution escalation trigger 1** (it touches
capture semantics), so its ratification HITL is mandatory, not courtesy.

---

**ESCALATION TRIGGER 4 — SEPARATE GATE, NOT SATISFIED BY THIS ROUND:** SR-047 and
SR-056 touch the capture contract and `SERVER_INSTRUCTIONS`, so constitution
escalation trigger 4 requires a light → standard weight-class promotion review
BEFORE this spec version is dispatched to `/flow-generate`. That review is separate
from, and in addition to, the HITL ratification of this spec amendment — approving
this draft does not clear it, and dispatch without it would violate the
constitution ("never silent").
