# spec v12.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SR-062 and the SCN-011 "Attribution, never blending" acceptance
criterion** — closes two findings folded into one pass, since they're the same
underlying design question:

- **Divergence 3, Phase B re-probe** (`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`):
  all 3 readers independently found that SR-060's amendment (retired stub carries
  the retire event's own timestamp) newly exposes a question Attribution never
  answered — does a `retire` event's timestamp count as "the most recent revision
  date," or is retirement a separate, unaddressed provenance dimension?
- **Gap 1, first Phase B panel** (`spec/.staging/panel-2026-08-13-phase-b.md`):
  1 of 3 readers flagged that "most recent revision date" never states whether it
  advances on `reaffirm` (re-endorsement, no content change) or only on `revise`
  (an actual content change) — logged as underspecified, not routed at the time.

### Resolution

Checked against already-ratified spec text rather than re-derived from panel
readings alone (the pattern used for every amendment this round). This project's
own glossary already draws exactly this line, and has since v3.12.0 (Phase A) —
well before either panel found the ambiguity:

> **Position** — ... formed (`assert`), **changed (`revise`)**, **re-endorsed
> (`reaffirm`)**, or **withdrawn from listings (`retire`)**.

Four distinct verbs, four distinct meanings, already written down. Only `revise`
is glossed as a *change*. **"Most recent revision date" now advances only on
`revise` events** — a `reaffirm` re-endorses without changing anything, so it
doesn't advance it. **A retirement gets its own, separately labeled date, never
folded into "revision"** — retiring withdraws a topic; presenting it as a
"revision" would misrepresent what happened, exactly the blending SCN-011's own
Given/When/Then exists to forbid.

### Amended text

- **SCN-011**, "Attribution, never blending" acceptance criterion: now states the
  formed date is the original `assert` event's timestamp; the revision date
  (present only when a `revise` event exists) is the latest `revise` event's
  timestamp specifically, not advanced by `reaffirm`; and a retired topic
  additionally states its own retirement date, labeled explicitly as a
  retirement.
- **SR-062**: same content pinned in the EARS requirement; traceability row gains
  an `*(amended v12.0.0)*` tag.

### What did not change

No new SR. No field, table, or schema change — the fold already carries every
event's own timestamp; this only states which ones surface under which label in
the read-time rendering guidance. SR-058 (v9.0.0), SR-059 (v11.0.0), SR-060
(v8.0.0), SR-061 (v10.0.0), SR-063..065 untouched. Divergence 4 (SR-063/Dormant —
should a retired topic ever also compute as dormant) is a separate, closely
related question left for its own amendment.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. Relevant conditions key on
code landing, not spec text — spec-only change, no Phase B code exists yet. None
fire. dissents-reactivated stays 0.

### Not addressed this round (still open)

Divergence 4 (Dormant vs. retired topics) and Divergence 1 (SR-061's not-found
response shape) from the re-probe; the re-probe's single-reader match-scope flag;
and the first panel's gap 2 (versioned-note-identity match precision) and gap 3
(SR-064's field scope) — each its own future amendment.

### Panel

Not re-run. This amendment applies an already-ratified glossary distinction
(v3.12.0's four position-lifecycle verbs) to a question the distinction already
answered — not new interpretive surface.
