# spec v13.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SR-063 and the SCN-011 "Dormant is computed, never stored" acceptance
criterion** — closes Divergence 4 from the Phase B re-probe
(`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`). All 3 readers independently
noted that SR-063's dormancy computation ("not reaffirmed or referenced within a
window") has no stated exemption for retired topics, and a retired topic
trivially satisfies "not reaffirmed within any window" (nothing gets reaffirmed
after retirement, by definition) — so a naive implementation would double-label a
topic as both "retired" and "dormant." This fork was only posable after SR-060
(v8.0.0) pinned down what the retired stub actually renders.

### Resolution

Checked against already-ratified spec text rather than re-derived from panel
readings alone (the pattern used for every amendment this round). The glossary's
own "Live position / dormant" entry (written at v7.0.0, before either panel found
this ambiguity) already frames the two concepts as distinct:

> "dormant" is a read-time display attribute only ... **Distinct from "retired,"
> which is an explicit `retire` event, not an absence of recent activity.**

Dormancy exists to flag *unexplained* inactivity; retirement is an *explained*,
deliberate closure. **Retired topics are exempt from dormancy computation** — the
check simply does not run for a topic whose live view is a retired stub.

### Amended text

- **SCN-011**, "Dormant is computed, never stored" acceptance criterion: retitled
  to "...and never applies to a retired topic," with the exemption stated
  explicitly and the reasoning (retirement = explained closure; dormancy =
  unexplained inactivity) cited from the existing glossary entry.
- **SR-063**: same content pinned in the EARS requirement; traceability row gains
  an `*(amended v13.0.0)*` tag.

### What did not change

No new SR. No field, table, or schema change — dormancy was already computed,
never stored; this only adds a guard clause to when the computation runs.
SR-058 (v9.0.0), SR-059 (v11.0.0), SR-060 (v8.0.0), SR-061 (v10.0.0), SR-062
(v12.0.0), SR-064, SR-065 untouched.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. Relevant conditions key on
code landing, not spec text — spec-only change, no Phase B code exists yet. None
fire. dissents-reactivated stays 0.

### Panel status after this amendment

All four routed divergences from `panel-2026-08-13-phase-b-reprobe.md` are now
closed: Divergence 1 (SR-061 not-found shape, still open — not yet amended),
Divergence 2 (SR-058/059 tension, v11.0.0), Divergence 3 (SR-060/attribution,
v12.0.0), Divergence 4 (this version). Correction: Divergence 1 remains the one
open item from that re-probe. Also still open: the re-probe's single-reader
match-scope flag, and the first panel's gap 2 (versioned-note-identity match
precision) and gap 3 (SR-064's field scope).

### Panel

Not re-run. This amendment applies an already-ratified glossary distinction
("retired" vs. "dormant" as distinct concepts) to a question it already
answered — not new interpretive surface.
