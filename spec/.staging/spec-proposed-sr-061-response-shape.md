# Proposed amendment — SCN-011, SR-061 (query response envelope shape)

**Classification:** Major (existing SR-061 text and existing SCN-011 acceptance
criterion modified). Version: 9.0.0 → 10.0.0.

**Source:** `/flow-panel` (spec/.staging/panel-2026-08-13-phase-b.md), Divergence 3.
SR-061 names three query modes (topic key / free text / note identity) without
stating the response envelope. 2 of 3 blind readers (R1, R2) had topic-key mode
return a singular object (0 or 1 result, since it's an exact match), with the other
two modes returning a list. 1 of 3 (R3) argued for a uniform list envelope across
all three modes, on ergonomic grounds (one contract, no branching by mode).

**Resolution and reasoning (checked against this project's own established tool
conventions, not re-derived from panel readings alone — the v5.0.0/v6.0.0/v8.0.0/
v9.0.0 pattern):** this project already ships two read-only tools whose names
themselves encode this exact distinction. `librarian-get-note` fetches **one** note
by its own unique identity — a singular lookup, singular result. `librarian-search`
returns **however many** results match a query — a list, by design. `librarian-positions`'
topic-key mode is structurally identical to `librarian-get-note`'s case: a topic
key is unique in the fold by construction (the fold groups events by topic key —
there is exactly one live projection per key, never several), so it is an
exact-identity lookup, not a search. Its free-text and note-identity modes are
structurally identical to `librarian-search`'s case: both can plausibly match more
than one topic, so they are searches, not lookups. Reading A is adopted: **the
response shape varies by mode**, following the get-vs-search convention this
project already established rather than inventing a third, uniform-envelope
convention for one tool.

---

## SCN-011 — amended acceptance criterion

**Before:**
> **Query modes.** `librarian-positions` accepts a topic key (exact match), free
> text (matched against stance content), or a note's versioned identity (returning
> positions whose refs include that note). The default response is live positions
> only; the full chain is returned only when explicitly requested.

**After:**
> **Query modes.** `librarian-positions` accepts a topic key (exact match), free
> text (matched against stance content), or a note's versioned identity (returning
> positions whose refs include that note). A topic-key query returns a single
> topic result or an explicit not-found response, never a list — a topic key is
> unique in the fold by construction, the same singular-lookup shape
> `librarian-get-note` already uses for its own exact-key lookup. A free-text or
> note-identity query returns a list of zero or more topic results, since either
> can plausibly match more than one topic — the same list shape `librarian-search`
> already uses. *(v10.0.0 — pins the response envelope; panel-2026-08-13-phase-b.md's
> Divergence 3.)* The default response for any matched topic is its live position
> only; the full chain is returned only when explicitly requested.

## SR-061 — amended

**Before:**
> **SR-061** — `librarian-positions` shall support querying by topic key (exact
> match), by free text matched against stance content, and by a note's versioned
> identity (returning positions whose refs include that note); the default
> response shall return live positions only, with the full supersession chain
> returned only on explicit request. *(ubiquitous)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); the "default live, history on request" split mirrors the plan's own status-lifecycle framing; mapping-pending: true`

**After:**
> **SR-061** — `librarian-positions` shall support querying by topic key (exact
> match), by free text matched against stance content, and by a note's versioned
> identity (returning positions whose refs include that note). A topic-key query
> shall return a single topic result or an explicit not-found response, never a
> list — mirroring `librarian-get-note`'s singular-lookup convention, since a topic
> key is by construction unique in the fold. A free-text or note-identity query
> shall return a list of zero or more topic results — mirroring
> `librarian-search`'s list convention, since both can plausibly match more than
> one topic. The default response for any matched topic shall return its live
> position only, with the full supersession chain returned only on explicit
> request. *(ubiquitous)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); amended v10.0.0 (panel-2026-08-13-phase-b.md, Divergence 3: pins the response envelope shape — singular for topic-key's exact-match lookup, list for the two search-like modes — matching this project's own established get-vs-search tool-shape convention (librarian-get-note singular, librarian-search list) rather than inventing a new uniform-envelope convention for this one tool); the "default live, history on request" split mirrors the plan's own status-lifecycle framing; mapping-pending: true`

## Traceability row — cosmetic update

`SR-061` gains an `*(amended v10.0.0)*` tag in the SCN-011 traceability row; the
acceptance-criteria summary column gains "response envelope pinned" alongside
"query modes."

## What does NOT change

- No new SR. No field, table, or schema change — this pins the tool's response
  *envelope*, not the fold or projection shape.
- SR-058 (already amended v9.0.0), SR-059, SR-060 (already amended v8.0.0),
  SR-062..065 — untouched.
- No code exists yet for Phase B (dispatch remains blocked on escalation trigger
  4) — nothing to regenerate.
- No dissent reactivation expected: `efforts/decision-graph/dissents-active.yaml`'s
  relevant condition (dissent-2026-08-05-0001 condition 2, "a third read surface
  lands") keys on code landing (`grep -c 'librarian-positions' src/server.ts`),
  not spec text. This is a spec-only change.

## Panel status after this amendment

All three routed divergences from `panel-2026-08-13-phase-b.md` are now closed
(v8.0.0, v9.0.0, v10.0.0). The panel's three convergent-but-underspecified gaps
(revision-date scope; versioned-note-identity match precision; SR-064's field
scope) remain open, unrouted by design — the panel explicitly did not treat them
as decisions, only as recommendations for a future patch.
