# Proposed amendment — SCN-011, SR-058 (fold materialization timing)

**Classification:** Major (existing SR-058 text modified, plus a new SCN-011
acceptance criterion). Version: 8.0.0 → 9.0.0.

**Source:** `/flow-panel` (spec/.staging/panel-2026-08-13-phase-b.md), Divergence 2.
SR-058 names "when a reindex runs" as the fold's trigger; SR-059 requires that a
full rebuild and "an incremental update after one new event" agree byte-for-byte,
without saying what *triggers* that incremental update. One reader (R3) wired the
incremental fold synchronously into SCN-010's write path (query-after-write is
instant); one reader (R1) kept it strictly reindex-triggered (a position is
invisible to `librarian-positions` until the next reindex); the third reader's own
sketch left the question open — it names an incremental-update function but never
states what calls it.

**Why this is more than a style choice:** Reading B (write-time hook) requires a
call from inside or immediately after SCN-010's write path into Phase B code —
exactly the kind of coupling SR-065's "byte-for-byte unchanged... write path"
guarantee exists to rule out being *accidentally* introduced. Reading A (reindex-
only) keeps Phase A and Phase B structurally decoupled — SR-065 holds because
Phase B code never runs anywhere near Phase A's write path, not because a hook was
carefully proven additive-only after the fact.

**Resolution and reasoning (checked against existing project convention, not
re-derived from panel readings alone):** this project already has exactly one
precedent for a read-surface projection built over an append-only `_librarian/`
stream: the note-identity ledger (SCN-008). Its own spec text is unambiguous —
*"SQLite gains identity tables rebuilt **at reindex** from vault + `_librarian/`
sidecar (INV-4)."* No feature in this spec currently wires a live, write-time hook
between a capture path and a read-side projection; reindex-triggered rebuild is the
established pattern for every other projection this project has, and SR-058's own
literal text ("when a reindex runs") already points the same way. Reading A is
adopted: **the fold's only trigger is reindex.** No code path outside reindex —
including SCN-010's capture path — invokes the fold or writes to its projection
tables.

**Consequence, made explicit rather than left implicit:** a position asserted,
revised, reaffirmed, or retired is **not visible to `librarian-positions` until the
next reindex runs.** This is a real, user-observable latency — Robin asserting a
position mid-session and immediately querying for it would not see it — so it goes
into SCN-011's acceptance criteria (observable behavior), not only into SR-058
(system-centric requirement), per this project's own scenarios-first ordering.

---

## SCN-011 — new acceptance criterion

Inserted immediately after the existing "Cross-month fold" bullet:

> **Materialization is reindex-triggered only.** The fold runs exclusively as part
> of reindex; `librarian-positions` reads only the already-materialized projection
> and never re-folds or reaches into the write path at query time. A position
> captured between two reindexes is not visible to `librarian-positions` until the
> next reindex runs — a disclosed, bounded staleness window, not a silent gap.
> This mirrors the note-identity ledger's identical reindex-only materialization
> (SCN-008) and keeps the fold structurally decoupled from SCN-010's write path, so
> SR-065's non-interference guarantee holds by construction rather than only by a
> written-after-the-fact test.

## SR-058 — amended

**Before:**
> **SR-058** — When a reindex runs, the position fold shall read every
> `_librarian/positions/<YYYY-MM>.md` file that exists, not only the most recently
> written one, before computing any topic's live position or chain. *(event-driven)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); mirrors SR-049's cross-month idempotence scope on the read side — a topic whose events straddle a month boundary must fold correctly regardless; mapping-pending: true`

**After:**
> **SR-058** — When a reindex runs, the position fold shall read every
> `_librarian/positions/<YYYY-MM>.md` file that exists, not only the most recently
> written one, before computing any topic's live position or chain. Reindex shall
> be the fold's only trigger: no code path outside reindex — including SCN-010's
> position-capture write path — shall invoke the fold or write to its projection
> tables, so `librarian-positions` always reads an already-materialized projection
> and a position captured between reindexes remains invisible to it until the next
> reindex runs. *(event-driven)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); amended v9.0.0 (panel-2026-08-13-phase-b.md, Divergence 2: pins materialization to reindex-only, ruling out a write-time hook into SCN-010's write path — matches this project's only existing precedent for a read-surface projection, SCN-008's note-identity ledger, and keeps SR-065's non-interference guarantee true by construction rather than by a hook that must be proven additive-only after the fact); mirrors SR-049's cross-month idempotence scope on the read side; mapping-pending: true`

## Traceability row — cosmetic update

`SR-058` gains an `*(amended v9.0.0)*` tag in the SCN-011 traceability row; the
acceptance-criteria summary column gains "reindex-only materialization" alongside
"cross-month fold."

## What does NOT change

- No new SR. No field, table, or schema change — this pins *when* the existing
  fold/projection design (SR-059) is invoked, not its shape.
- SR-059, SR-060 (already amended v8.0.0), SR-061..065 — untouched.
- No code exists yet for Phase B (dispatch remains blocked on escalation trigger
  4) — nothing to regenerate.
- No dissent reactivation expected: `efforts/decision-graph/dissents-active.yaml`'s
  relevant conditions (dissent-2026-08-05-0001 condition 2, dissent-2026-08-13-0004
  condition 1/4) all key on code landing (`src/server.ts`, `PositionEventSchema`),
  not spec text. This is a spec-only change.
