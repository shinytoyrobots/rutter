# Proposed amendment — SCN-011, SR-062 (attribution semantics for revision and retirement)

**Classification:** Major (existing SR-062 text and existing SCN-011 acceptance
criterion modified). Version: 11.0.0 → 12.0.0.

**Source:** two findings, folded into one pass since they're the same underlying
design question — "which event kinds count toward a position's stated
provenance?":

- Divergence 3, Phase B re-probe (`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`):
  all 3 readers independently found that SR-060's amendment (retired stub carries
  the retire event's own timestamp) newly exposes a question the Attribution
  criterion never answered — does a `retire` event's timestamp count as "the most
  recent revision date," or is retirement a separate, unaddressed provenance
  dimension?
- Gap 1, first Phase B panel (`spec/.staging/panel-2026-08-13-phase-b.md`): 1 of 3
  readers (R2) flagged that "most recent revision date" itself never states
  whether it advances on `reaffirm` (re-endorsement, no content change) or only
  on `revise` (an actual content change) — logged as a convergent-but-
  underspecified gap, not routed at the time.

Both questions are really one question: what does "revision" mean across the
four event kinds (`assert`/`revise`/`reaffirm`/`retire`)? Answering it once
closes both.

**Resolution and reasoning (checked against already-ratified spec text, not
re-derived from panel readings alone — the pattern used for every amendment this
round):** this project's own glossary already draws exactly this line, and has
since v3.12.0 (Phase A) — well before either panel found this ambiguity:

> **Position** — a stance Robin holds on a topic ... formed (`assert`), **changed
> (`revise`)**, **re-endorsed (`reaffirm`)**, or **withdrawn from listings
> (`retire`)**.

Four distinct verbs, four distinct meanings, already written down. Only `revise`
is glossed as a *change* — `reaffirm` explicitly re-endorses without changing, and
`retire` withdraws the topic from listings rather than altering its content. This
gives a precedent-consistent, textually-grounded answer to both open questions
without inventing new design:

- **"Most recent revision date" advances only on `revise` events.** A `reaffirm`
  re-endorses the current stance; it doesn't revise anything, so it shouldn't be
  labeled as one. (Closes the first panel's gap 1.)
- **A retirement gets its own, separately labeled date — never folded into
  "revision."** Retiring withdraws a topic; it isn't a content change either, and
  labeling it as a "revision" would misrepresent what happened to the person
  reading it back — exactly the kind of blending SCN-011's own Given/When/Then
  exists to forbid. (Closes Divergence 3.)

---

## SCN-011 — amended acceptance criterion

**Before:**
> **Attribution, never blending.** Every recalled stance is rendered with its
> provenance stated explicitly — at minimum the formed date and, if superseded, the
> most recent revision date — per read-time guidance taught in
> `SERVER_INSTRUCTIONS`. A client is told to present this as "from your position
> record," never to restate it as its own present-tense belief without that
> framing.

**After:**
> **Attribution, never blending.** Every recalled stance is rendered with its
> provenance stated explicitly: the formed date (the topic's original `assert`
> event's timestamp) and, where at least one `revise` event exists, the most
> recent revision date — the latest `revise` event's timestamp specifically. A
> `reaffirm` re-endorses the current stance without changing it (per the
> glossary's own "changed (`revise`)" vs. "re-endorsed (`reaffirm`)" distinction)
> and does not advance the revision date; its own most-recent-reaffirmed
> timestamp remains visible via the full chain but is not part of the default
> attribution line. Where the topic's most recent event is a `retire`, the stub
> additionally states the retirement's own date, labeled explicitly as a
> retirement (e.g. "retired \<date\>") — never folded into or presented as a
> "revision," since retiring withdraws a topic rather than changing its content.
> Attribution is per read-time guidance taught in `SERVER_INSTRUCTIONS`. A client
> is told to present this as "from your position record," never to restate it as
> its own present-tense belief without that framing. *(v12.0.0 — pins which event
> kinds advance "revision date" and how a retirement's own date is labeled;
> panel-2026-08-13-phase-b-reprobe.md's Divergence 3, folding in the first Phase B
> panel's gap 1 since it's the same design question.)*

## SR-062 — amended

**Before:**
> **SR-062** — When `SERVER_INSTRUCTIONS` is extended to teach read-time rendering
> of a recalled position, the guidance shall require every rendered stance to state
> its provenance explicitly (at minimum the formed date and, where superseded, the
> most recent revision date) and shall forbid presenting a recalled stance as the
> client's own present-tense belief without that attribution. *(ubiquitous)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); applies the SCN-007 recall-clarity precedent (cited, not restated) to positions; this is the SR that trips constitution escalation trigger 4 — it extends SERVER_INSTRUCTIONS, the exact surface trigger 4 names; mapping-pending: true`

**After:**
> **SR-062** — When `SERVER_INSTRUCTIONS` is extended to teach read-time rendering
> of a recalled position, the guidance shall require every rendered stance to state
> its provenance explicitly: the formed date (the topic's original `assert`
> event's timestamp), and — only where at least one `revise` event exists for that
> topic — the most recent revision date, meaning the latest `revise` event's
> timestamp specifically; a `reaffirm` event shall not advance the revision date,
> since it re-endorses the current stance without changing it. Where the topic's
> most recent event is a `retire`, the guidance shall additionally require the
> retirement's own date to be stated, labeled explicitly as a retirement and never
> presented as a revision. The guidance shall forbid presenting a recalled stance
> as the client's own present-tense belief without this attribution. *(ubiquitous)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); amended v12.0.0 (panel-2026-08-13-phase-b-reprobe.md, Divergence 3, folding in panel-2026-08-13-phase-b.md's gap 1: pins "revision date" to revise-only, matching the glossary's own "changed (revise)" vs. "re-endorsed (reaffirm)" distinction, and requires a retired topic's own retirement date be labeled distinctly rather than folded into "revision"); applies the SCN-007 recall-clarity precedent (cited, not restated) to positions; this is the SR that trips constitution escalation trigger 4 — it extends SERVER_INSTRUCTIONS, the exact surface trigger 4 names; mapping-pending: true`

## Traceability row — cosmetic update

`SR-062` gains an `*(amended v12.0.0)*` tag in the SCN-011 traceability row.

## What does NOT change

- No new SR. No field, table, or schema change — this pins what the read-time
  *rendering guidance* must say, not the projection's stored shape (the fold
  already carries every event's own timestamp; this only says which ones get
  surfaced under which label).
- SR-058 (amended v9.0.0), SR-059 (amended v11.0.0), SR-060 (amended v8.0.0),
  SR-061 (amended v10.0.0), SR-063..065 — untouched. (SR-063/Dormant is Divergence
  4 — a separate, closely related but distinct question, left for its own
  amendment next.)
- No dissent reactivation expected: `efforts/decision-graph/dissents-active.yaml`'s
  relevant conditions key on code landing, not spec text — spec-only change, no
  Phase B code exists yet.

## Panel status after this amendment

Divergence 3 of `panel-2026-08-13-phase-b-reprobe.md`, and gap 1 of
`panel-2026-08-13-phase-b.md`, both closed. Divergence 4 (SR-060 vs. Dormant —
should a retired topic ever also compute as dormant) and Divergence 1 (SR-061's
not-found response shape) remain open, each its own future amendment. Also still
open: the re-probe's single-reader match-scope flag, and the first panel's gaps 2
(versioned-note-identity match precision) and 3 (SR-064's field scope).
