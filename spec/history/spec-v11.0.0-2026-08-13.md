# spec v11.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SR-059 and the SCN-011 "Deterministic fold, rebuildable" acceptance
criterion** — closes Divergence 2 from the Phase B re-probe
(`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`), rated the sharpest of that
round's four findings by all three readers. SR-058 (amended v9.0.0) commits every
reindex to a full re-read of every `_librarian/positions/<YYYY-MM>.md` file and
forbids any code path outside reindex from invoking the fold. SR-059 (unchanged
since v7.0.0) required "a full rebuild ... and an incremental update after one new
event" to "agree byte-for-byte" — language presuming a second, incremental-fold
code path runs for real. All three readers independently flagged that SR-058's
plain reading leaves no such path to test against: SR-059's clause risked
degrading into a comparison of one algorithm with itself.

### Resolution

Checked against existing project convention rather than re-derived from panel
readings alone (the pattern used for every amendment this round). This project's
only other precedent for this class of guarantee — the note-identity ledger's
projections (SCN-008) — never had an incremental path at all:

- **SR-040**: "When a reindex runs, the system shall **rebuild** the SQLite
  identity projection tables..."
- **SR-041**: "If a reindex is run **twice** with no change ... the two runs
  shall yield **identical** identity projections."

That pair's determinism guarantee is exactly "rebuild twice from the same input,
get the same output" — everything `INV-4` (rebuildability) actually requires, and
what a pure function already gives for free on repeated calls with the same
argument. Building a real incremental-delta algorithm just to give SR-059's
clause something live to test against would add a second code path and a second
determinism proof this project has never needed for its one existing analogous
feature — the wrong direction against constitution preference 5 ("cheapest
useful slice behind a kill gate"). **The "incremental update" clause is dropped.**
SR-059 is restated as pure rebuild-determinism, mirroring SR-041 exactly.

### Amended text

- **SCN-011**, "Deterministic fold, rebuildable" acceptance criterion: now states
  that running a full rebuild twice against an unchanged event stream produces
  byte-for-byte identical projection tables — no incremental-vs-full comparison.
- **SR-059**: same content pinned in the EARS requirement, citing SR-041 by name
  as the precedent; traceability row gains an `*(amended v11.0.0)*` tag.

### What did not change

No new SR. No field or table renamed. SR-058 itself is untouched — its
full-reparse-every-reindex framing is what motivated this fix, not something this
amendment revisits. SR-060 (amended v8.0.0), SR-061 (amended v10.0.0), SR-062..065
untouched.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. Relevant conditions all key
on code landing, not spec text — this is a spec-only change, no code exists yet
for Phase B. None fire. dissents-reactivated stays 0.

### Not addressed this round (still open, from the re-probe)

Divergence 1 (SR-061's not-found response shape), Divergence 3 (SR-060 vs. the
Attribution criterion's revision-date semantics for a retired topic), and
Divergence 4 (SR-060 vs. Dormant — should a retired topic ever also compute as
dormant) remain open, each its own future `/flow-spec amend`. Also still open:
the re-probe's single-reader flag (whether free-text/note-identity search scopes
to a topic's live event only or its full chain), recommended to fold into a
future SR-061 pass alongside Divergence 1.

### Panel

Not re-run. This amendment removes an unimplemented, untested claim rather than
opening new interpretive surface — it makes the spec match what SR-058 already
committed to, using an already-established in-project precedent (SR-040/041) as
the template.
