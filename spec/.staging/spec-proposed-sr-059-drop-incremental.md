# Proposed amendment — SCN-011, SR-059 (drop the incremental-update clause)

**Classification:** Major (existing SR-059 text and existing SCN-011 acceptance
criterion modified). Version: 10.0.0 → 11.0.0.

**Source:** `/flow-panel` re-probe (spec/.staging/panel-2026-08-13-phase-b-reprobe.md),
Divergence 2 — rated the sharpest of the four findings by all three readers.
SR-058 (amended v9.0.0) commits every reindex to a full re-read of every
`_librarian/positions/<YYYY-MM>.md` file, and forbids any code path outside
reindex — including SCN-010's write path — from invoking the fold. SR-059
(unchanged since v7.0.0) requires "a full rebuild ... and an incremental update
after one new event" to "agree byte-for-byte" — language that presumes a second,
incremental-fold code path exists and runs for real. All 3 readers independently
flagged the same risk: if SR-058 is read plainly (a full re-parse every reindex
cycle, no other trigger anywhere), there is no live incremental path left for
SR-059's "agree byte-for-byte" language to test against — it degrades into a
comparison of an algorithm with itself, not a real cross-check of two genuinely
different code paths.

**Resolution and reasoning (checked against existing project convention, not
re-derived from panel readings alone — the pattern used for every amendment this
round):** this project already has one other precedent for exactly this class of
guarantee — the note-identity ledger's projection tables (SCN-008). Its own pair
of requirements is instructive:

- **SR-040**: "When a reindex runs, the system shall **rebuild** the SQLite
  identity projection tables from the vault plus the `_librarian/` sidecar
  alone..."
- **SR-041**: "If a reindex is run **twice** with no change ... the two runs
  shall yield **identical** identity projections."

Neither SR mentions an incremental path at all. SCN-008 has never had one — its
determinism guarantee is exactly "rebuild twice from the same input, get the same
output," which is what a pure function running twice on the same argument already
gives for free, and it's the only guarantee `INV-4` (rebuildability) actually
requires. There is no established need in this codebase for an incremental-fold
code path to exist, and SR-058's own amendment already committed the position
fold to full-reparse-every-time — consistent with SCN-008's pattern, not with an
incremental one. Building a real incremental-delta algorithm just to give
SR-059's clause something to test against would add a second code path, a second
determinism proof, and real implementation cost this project has never needed for
its one existing analogous feature — the opposite direction from constitution
preference 5 ("cheapest useful slice behind a kill gate").

**Adopted resolution:** drop the "incremental update after one new event" clause.
Restate SR-059 (and its SCN-011 acceptance criterion) as pure rebuild-determinism
— running a full rebuild twice against an unchanged event stream produces
byte-for-byte identical projection tables — mirroring SR-041 exactly. This closes
the SR-058/SR-059 tension by removing the untested claim rather than inventing
new machinery to satisfy it.

---

## SCN-011 — amended acceptance criterion

**Before:**
> **Deterministic fold, rebuildable.** Folding is a pure function of the event
> stream (topic key, append order, event id, optional `revises`) — a full rebuild
> of the projection tables and an incremental update after one new event agree
> byte-for-byte. No model judgment (INV-6, cited not restated); no load-bearing
> state that isn't rebuildable from `_librarian/` (INV-4, cited not restated).

**After:**
> **Deterministic fold, rebuildable.** Folding is a pure function of the event
> stream (topic key, append order, event id, optional `revises`) — running a full
> rebuild twice against an unchanged event stream produces byte-for-byte identical
> projection tables, the same rebuild-determinism guarantee SR-041 already gives
> the note-identity ledger's projections (SCN-008). No model judgment (INV-6,
> cited not restated); no load-bearing state that isn't rebuildable from
> `_librarian/` (INV-4, cited not restated). *(v11.0.0 — the fold has no separate
> incremental code path: SR-058 already commits every reindex to a full re-read
> of every positions file, so there is no second, incremental algorithm for a
> full-vs-incremental byte-for-byte comparison to test against; this criterion is
> restated to test what the design actually builds, mirroring this project's only
> other read-surface projection, which has never had an incremental path either.)*

## SR-059 — amended

**Before:**
> **SR-059** — The position fold shall be a pure, deterministic function of the
> event stream (topic key, append order, stable event ids, optional `revises`); a
> full rebuild of the projection tables and an incremental update after one new
> event shall agree byte-for-byte, with no model judgment and no load-bearing
> state that is not rebuildable from `_librarian/`. *(ubiquitous)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); INV-4 / INV-6, cited not restated; parallels SR-051's write-side determinism guarantee, now exercised by an actual reader; mapping-pending: true`

**After:**
> **SR-059** — The position fold shall be a pure, deterministic function of the
> event stream (topic key, append order, stable event ids, optional `revises`),
> with no model judgment and no load-bearing state that is not rebuildable from
> `_librarian/`; running a full rebuild twice against an unchanged event stream
> shall produce byte-for-byte identical projection tables. *(ubiquitous)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); amended v11.0.0 (panel-2026-08-13-phase-b-reprobe.md, Divergence 2: drops the "incremental update after one new event" clause — SR-058 already commits every reindex to a full re-read of every positions file, so no separate incremental-fold code path exists for that clause to test against; restated as rebuild-determinism only, mirroring SR-041's identical guarantee for the note-identity ledger's projections (SCN-008), this project's only other precedent for this kind of read-surface projection); INV-4 / INV-6, cited not restated; parallels SR-051's write-side determinism guarantee; mapping-pending: true`

## Traceability row — cosmetic update

`SR-059` gains an `*(amended v11.0.0)*` tag in the SCN-011 traceability row.

## What does NOT change

- No new SR. No field or table renamed. SR-058 itself is untouched — its
  full-reparse-every-reindex framing is exactly what motivated this fix, not
  something this amendment revisits.
- SR-060 (amended v8.0.0), SR-061 (amended v10.0.0), SR-062..065 — untouched.
- INV-4's rebuildability requirement is fully satisfied either way; this
  amendment only removes an *additional*, unimplemented-anywhere-else claim
  layered on top of it.
- No dissent reactivation expected: `efforts/decision-graph/dissents-active.yaml`'s
  relevant conditions all key on code landing, not spec text. Spec-only change,
  no Phase B code exists yet.

## Panel status after this amendment

Divergence 2 of `panel-2026-08-13-phase-b-reprobe.md` closed. Divergences 1
(SR-061 not-found shape), 3 (SR-060 vs. Attribution), and 4 (SR-060 vs. Dormant)
remain open, each its own future amendment. The single-reader flag (free-text/
note-identity match scope) also remains open, recommended to fold into a future
SR-061 pass alongside Divergence 1.
