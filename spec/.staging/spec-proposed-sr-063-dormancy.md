# Proposed amendment — SCN-011, SR-063 (dormancy vs. retirement)

**Classification:** Major (existing SR-063 text and existing SCN-011 acceptance
criterion modified). Version: 12.0.0 → 13.0.0.

**Source:** Divergence 4, Phase B re-probe (`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`).
All 3 readers independently noted that the Dormant criterion (SR-063, unchanged
since v7.0.0) computes staleness generically from "not reaffirmed or referenced
within a window," with no stated exemption for retired topics — and a retired
topic trivially satisfies "not reaffirmed within any window" (nothing gets
reaffirmed after retirement, by definition), so a naive implementation would
double-label a topic as both "retired" and "dormant." This fork was only posable
after SR-060 (v8.0.0) pinned down what the retired stub actually renders.

**Resolution and reasoning (checked against already-ratified spec text, not
re-derived from panel readings alone — the pattern used for every amendment this
round):** this project's own glossary already frames these two concepts as
distinct, and has since the scenario was first drafted (v7.0.0):

> **Live position / dormant** — ... "dormant" is a read-time display attribute
> only ... **Distinct from "retired," which is an explicit `retire` event, not an
> absence of recent activity.**

The glossary's own words — "distinct from," "an explicit event," "not an absence
of activity" — already draw the line this divergence asks about: dormancy exists
to flag *unexplained* inactivity, while retirement is an *explained*, deliberate
closure. Applying dormancy computation to a retired topic would blur a
distinction the spec already committed to. **Retired topics are exempt from
dormancy computation** — the dormancy check simply does not run for a topic whose
live view is a retired stub.

---

## SCN-011 — amended acceptance criterion

**Before:**
> **Dormant is computed, never stored.** No new stored field represents "dormant,"
> "stale," or any decay score. A convenience display attribute may be computed at
> read time from an event's timestamps (e.g., not reaffirmed or referenced within a
> window), and changing that computation later requires no schema migration,
> because nothing about it is persisted.

**After:**
> **Dormant is computed, never stored, and never applies to a retired topic.** No
> new stored field represents "dormant," "stale," or any decay score. A
> convenience display attribute may be computed at read time from an event's
> timestamps (e.g., not reaffirmed or referenced within a window), and changing
> that computation later requires no schema migration, because nothing about it
> is persisted. A topic whose live view is a retired stub is never additionally
> labeled dormant — retirement is an explicit, deliberate closure (an event),
> while dormancy exists to flag unexplained inactivity (an absence of events); the
> glossary already treats these as distinct, and a retired topic trivially
> satisfies any inactivity window, so an unguarded computation would double-label
> it. *(v13.0.0 — pins that dormancy computation is skipped for retired topics;
> panel-2026-08-13-phase-b-reprobe.md's Divergence 4.)*

## SR-063 — amended

**Before:**
> **SR-063** — No stored field or value shall represent a position's dormancy,
> staleness, or decay; any such indicator shown by `librarian-positions` shall be
> computed at read time from timestamps already present on the position's events.
> *(unwanted-behavior)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); "reversible and honest, no decay scores" per the plan's own status-lifecycle framing -- changing the computation later needs no schema migration, since nothing about it is persisted; mapping-pending: true`

**After:**
> **SR-063** — No stored field or value shall represent a position's dormancy,
> staleness, or decay; any such indicator shown by `librarian-positions` shall be
> computed at read time from timestamps already present on the position's events.
> If a topic's most recent event is a `retire`, the dormancy computation shall not
> run for that topic and no dormant indicator shall be shown alongside its retired
> stub — retirement already explains the topic's inactivity as a deliberate
> closure, distinct from dormancy's unexplained-inactivity signal (the glossary's
> own "distinct from" framing for "retired" vs. "dormant"). *(unwanted-behavior)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); amended v13.0.0 (panel-2026-08-13-phase-b-reprobe.md, Divergence 4: exempts retired topics from dormancy computation — a retired topic trivially satisfies any inactivity window, so an unguarded computation would double-label it; the glossary's own "Live position / dormant" entry already frames "retired" and "dormant" as distinct concepts, this just makes the computation honor that); "reversible and honest, no decay scores" per the plan's own status-lifecycle framing -- changing the computation later needs no schema migration, since nothing about it is persisted; mapping-pending: true`

## Traceability row — cosmetic update

`SR-063` gains an `*(amended v13.0.0)*` tag in the SCN-011 traceability row.

## What does NOT change

- No new SR. No field, table, or schema change — dormancy was already computed,
  never stored; this only adds a guard clause to when the computation runs.
- SR-058 (v9.0.0), SR-059 (v11.0.0), SR-060 (v8.0.0), SR-061 (v10.0.0), SR-062
  (v12.0.0), SR-064, SR-065 — untouched.
- No dissent reactivation expected: relevant conditions in
  `efforts/decision-graph/dissents-active.yaml` key on code landing, not spec
  text — spec-only change, no Phase B code exists yet.

## Panel status after this amendment

Divergence 4 of `panel-2026-08-13-phase-b-reprobe.md` closed — all four routed
divergences from that re-probe are now resolved (Divergence 1 remains: SR-061's
not-found response shape). Still open: the re-probe's single-reader match-scope
flag, and the first panel's gap 2 (versioned-note-identity match precision) and
gap 3 (SR-064's field scope).
