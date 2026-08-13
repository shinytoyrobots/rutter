# Decision graph — implementation plan

**Written:** 2026-08-04
**Status:** plan, not ratified and not started. `spec/spec.md` remains the executable
source of truth. Companion to `docs/decision-graph.md` (the design); this file says how
and in what order.
**Scope:** capability #3 (past opinion surfaced with its revision history — "you thought
this before, here's why, you changed your mind here") and capability #5 (a decision graph
distinct from the knowledge graph, cross-referencing both ways, with an accumulation
story that survives five years of use).

---

## Sequencing constraints (read first)

1. ~~The gate verdict (~2026-08-09) comes first.~~ **Cleared 2026-08-12.** Gate
   verdict: PASS (`docs/gate-verdict-2026-08.md`). The draft wish-log entry sketched
   below was never actually logged — real evidence landed independently instead, on
   2026-08-11/12: a cross-month consistency check done by hand (the Kellie letter),
   generalized same-day to the trajectory primitive Phase B below already returns,
   plus recurring mid-session belief drift. See `docs/roadmap.md` Phase 3 for the
   naming decision. Kept below as the historical record of what this plan originally
   expected to need:
   > 2026-08-04 — I want past positions surfaced with their revision history ("you
   > concluded X, revised it here, based on these notes"), and a decision layer separate
   > from the knowledge graph that doesn't drown after a year of accumulation.
2. **Phase 0 (note identity) is exempt from the gate** and should run now: it is a data-
   integrity fix, not a pillar, and every event written before it lands carries the
   weaker identity. Measured cost of waiting: ~2% of referenced paths already dead in
   10 days.
3. Everything follows the flow pipeline as before: flow-spec → HITL ratification → gen →
   cull → ship. Phase 0 fits the single-variant hotfix pipeline (precedent:
   ship-2026-07-25-0002). Phases A+B are one effort with real variants.

---

## Architecture invariants this plan must not break

- **No model in the server.** All judgment (what is a position, when it revises) happens
  client-side at authoring time. Server-side projection is deterministic code only.
- **Events are append-only, byte-verbatim, never rewritten** (INV-6, SR-023). Positions
  are a *projection* over events — rebuildable, disposable, same rule as SQLite.
- **The README's quoted contract block is regenerated programmatically** from
  `SERVER_INSTRUCTIONS` (SR-027, COR-R-030) — never hand-edited.
- Three tests anchor literal instruction phrases (`adoption.test.ts` ×2,
  `clarity.test.ts`). Contract changes move those anchors deliberately.
- Vault is git-hands-off; server writes only under `_librarian/`.

---

## Phase 0 — Durable note identity (prerequisite; can start now)

**Problem:** refs key on `path` + `sha256`. Hash is a version, not an identity; path is
the de facto identity and Obsidian renames freely. Supersession chains and drift
detection both dangle when a path dies.

**Mechanism (no vault writes, all state in sidecar):**
- At reindex, for every recorded ref whose path no longer exists: if some current note's
  content hash equals the ref's last-recorded hash → **pure rename, bind
  deterministically** and append the binding to `_librarian/note-identity.md`
  (schema `note-identity@1`, mdbase-compatible, append-only: identity id → path/hash
  history, each binding attributed `detected: exact-hash` with timestamp).
- If no exact match (rename + edit) or multiple matches (duplicate content) → **surface,
  never auto-bind** ("weighs openly… never silently"). `librarian-recent` and enrichment
  render the ref as *unresolved, candidates: …*; a human-confirmed binding is appended
  with `detected: confirmed`.
- SQLite gains `note_identity` / `note_paths` projection tables, rebuilt from vault +
  sidecar as always.

**Spec:** new SCN (ref survives rename) + ~2 SR; minor version bump.
**Tests:** pure rename binds; rename+edit flags, does not bind; duplicate-content
collision refuses; identity file append-only; full-rebuild determinism.
**Exit:** the two currently-dead refs either bind or render as flagged-unresolved;
re-running reindex twice yields identical projections.

---

## Phase A — Position capture (the write path for #3)

**Mechanism:** extend the capture contract with an *optional* position directive,
emitted by the client only when a stance was formed, changed, reaffirmed, or retired —
expected ≪ 1 per session, vs 19.3 entries/day for outcomes:

```
POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance, one line, 40/60 budget>
```

- Same sentinel channel, same hook; `capture-cli` routes by directive kind. Refs named
  by path, hashed by the capture path exactly as session refs are today.
- **Storage: a separate stream** — `_librarian/positions/YYYY-MM.md`, schema
  `position-event@1`, append-only, byte-verbatim, workspace provenance attached.
  (Recommended over extending `session-record@1`: leaves the session schema, dedupe
  identity, and read-time grouping untouched; gives mdbase a clean typed collection.
  Alternative noted for flow-spec: additive field on session entries.)
- Supersession is **implicit by topic-key fold order** (deterministic), with an optional
  explicit `revises: <event-id>` for precision. Topic keys are free-form kebab-case,
  client-chosen, grouped at read time — report, don't enforce, like the word budget.
- Word budget applies to the stance line (report on stderr, store verbatim — SR-034
  pattern).

**Spec:** new SCN (position captured once per distinct directive — reuse SCN-001's
idempotence pattern) + SRs for grammar, storage, budget; contract text change triggers
README-block regeneration and deliberate anchor moves. Watch OBS-1: instruction addition
budgeted ≤ ~350 chars.
**Tests:** idempotence, verbatim storage, budget-report-not-enforce, contract
byte-compare, session records byte-identical before/after (positions must not touch
them).
**Exit:** a real position directive lands from a live session; session capture
unaffected.

---

## Phase B — Position recall with supersession (the read path for #3)

**Mechanism:**
- Reindex folds position events by topic key into projection tables:
  `position_events`, `position_refs` (identity-resolved via Phase 0), and `positions`
  (topic → live event, status, formed/revised timestamps). Deterministic: full rebuild
  and incremental must agree byte-for-byte.
- New read-only tool **`librarian-positions`**: query by topic, free text (FTS over
  stances), or note. Returns the live stance plus the full supersession chain —
  verbatim quotes, dates, session ids, and the refs each stance was based on. Default
  view: live positions only; history on request. This is #3 verbatim: *what you
  concluded, when, from what, and where you changed your mind.*
- Read-time guidance (server instructions): render chains in plain language and
  **attribute the source** — "from your position record, formed Jul 28, revised Aug 2" —
  never blended into the client's own recall.
- **Instrumentation:** log reads as a new kind (`position-recall`) **excluded from the
  gate arithmetic** until the gate design itself is revisited — the current metric's
  honesty problem must not be compounded.

**Status lifecycle:** stored status changes only via events (assert/revise/reaffirm/
retire) — every state attributable to a moment. "Dormant" is a *computed display
attribute* at read time (e.g., not reaffirmed or referenced in 90 days), never stored —
reversible and honest, no decay scores. Retire = Pinakes: the position drops to a stub
in listings; its events remain forever.

**Tests:** fold determinism (property test), chain ordering, retire semantics,
gate-metric isolation.
**Exit:** "what do I think about X and how did that change?" answered end-to-end in a
live session, attributed, with the chain.

---

## Phase C — Drift visibility and threads (the #5 payoff)

**Mechanism:**
- At reindex, for every live position: compare each based-on ref's recorded hash against
  the current hash of the identity-resolved note. Mismatch → `drifted`, carrying both
  versions and dates. Rendered in `librarian-positions` and as an enrichment signal on
  search/get-note: *"you hold a position based on this note; the note has changed twice
  since."* This is the uncontested differentiator (opportunity-scan finding) and uses
  only data already recorded.
- Reaffirm-after-drift re-bases the position on current hashes (a new event; the old
  basis stays in the chain).
- **Threads = topic-key prefix grouping at read time only** (`role-search/*`). No
  clustering, no stored thread objects. Revisit only if prefixes prove insufficient in
  use.
- Knowledge→decision direction lands here too: `librarian-get-note` enrichment answers
  "what have I concluded from this note?"

**Tests:** drift detected on hash change, cleared on reaffirm; enrichment signal counted
once per call (SR-011 pattern); prefix grouping.
**Exit:** a real drifted position surfaces unprompted in a live session.

---

## Phase D — Backfill (optional, human-triggered)

193 events predate positions. Retrofit is a **client-run session**: read old records,
author position events marked `backfill: true`, attributed to that session — judgment at
authoring time, records untouched. Run only if, after two weeks of live positions, the
history's absence is felt. Not scoped further here.

---

## HITL decision points (flow-spec ratification)

1. Separate positions stream vs. extending `session-record@1` — **recommend separate**.
2. Free-form topic keys + read-time grouping vs. controlled vocabulary — **recommend
   free-form**.
3. `position-recall` excluded from gate arithmetic — **recommend excluded** until the
   gate redesign.
4. Wish-log entry (§Sequencing) — Robin writes or approves.
5. Backfill: defer decision to +2 weeks after Phase B ships.

## Non-goals

- Server-side topic inference, stance extraction, or any NLP — the client authors,
  the server folds.
- Auto-supersession across different topic keys.
- Mutating or annotating historical session records.
- Team/shared positions — per-person memory-of-use only.

## Risks

- **Instruction bloat** (OBS-1: 2093 chars pre-change). Budget the contract addition;
  detail lives in README, not instructions.
- **Topic-key sprawl.** Accepted: read-time grouping + report-don't-enforce; revisit
  with evidence, not upfront vocabulary design.
- **Position spam** (client over-asserting). Contract guidance ("only when a stance
  formed or changed") + observed rate as the check; expect single digits per week.
- **Gate contamination.** Mitigated by metric isolation (HITL #3).

## Rough sizing

Phase 0 ~half a day (hotfix pipeline). Phases A+B one effort, ~2 days through the full
flow pipeline. Phase C ~1 day. Post-verdict start for A–C keeps the ~08-09 gate clean.
