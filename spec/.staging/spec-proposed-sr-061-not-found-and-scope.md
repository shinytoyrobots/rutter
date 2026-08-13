# Proposed amendment — SCN-011, SR-061 (not-found wire shape + match scope)

**Classification:** Major (existing SR-061 text and existing SCN-011 acceptance
criterion modified). Version: 13.0.0 → 14.0.0.

**Source:** two findings on the same SR, folded into one pass:

- **Divergence 1, Phase B re-probe** (`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`):
  all 3 readers found that v10.0.0's amendment closed *cardinality* (topic-key
  mode never returns a list) but left the not-found response's *wire shape*
  unpinned — a structured sentinel field, an `isError` result, and a plain-text
  message are all defensible readings of "explicit not-found response," and the
  amendment's own citation of `librarian-get-note` as precedent isn't verifiable
  from spec text alone (S1 tools predate this spec, not re-specced here).
- **Single-reader flag, same re-probe**: 1 of 3 readers (rated "the sharpest
  remaining fork" for its correctness impact) found that SR-061 never states
  whether free-text/note-identity matching scans a topic's live event only, or
  its entire chain — meaning a stance phrase that only appears in a *superseded*
  event might or might not surface its topic, depending on which reading an
  implementer picks.

**Resolution and reasoning (checked against actual shipped source this time, not
just spec text — the same "verify before writing" discipline used at v6.0.0,
now extended to code since the citation itself pointed at code):**

For the not-found shape, I read the real implementation rather than guessing at
what "mirrors `librarian-get-note`" might mean. `src/server.ts` shows both
existing read tools handle their empty case identically:

```ts
// librarian-get-note, src/server.ts:130-134
if (!note) {
  return { content: [{ type: "text", text: `Note not found: ${notePath}` }] };
}
// librarian-search, src/server.ts:110-116
if (results.length === 0) {
  return { content: [{ type: "text", text: `No notes matched "${query}".` }] };
}
```

Neither uses `isError`. Both are normal, successful MCP results whose `content`
is a single text block carrying a human-readable sentinel string. There is no
shared `notFoundResult()` helper — it's the same *pattern*, written inline each
time — but the pattern itself is consistent across every existing tool in this
server, with no exception. `librarian-positions`' not-found case adopts the same
pattern rather than inventing a fourth convention.

For match scope: all three original panel readers' independent implementation
sketches put the FTS5 index over the *full* `position_events` table (every
event, not a live-only subset) — a design they converged on before this question
was even posed. Scoping matches to the live event only would require either a
second, live-only index or a runtime filter discarding matches on superseded
events — additional mechanism nobody asked for. More importantly, this project
has a repeated, explicit ethos against silent loss (SR-049's v4.0.0 amendment:
"never silently"; SCN-011's own Given/When/Then: never blend or lose
attribution). A recall tool that silently fails to surface a topic because the
matching phrase was later revised is exactly that failure shape. **Match scope
is the full chain**; response scope (live-only by default, full chain on
request) is a separate, already-settled knob — the two are independent.

---

## SCN-011 — amended acceptance criterion

**Before:**
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
> Divergence 3.)* Free text and note-identity matching scan a topic's **entire
> event chain**, not only its live event — a topic surfaces if any of its events,
> live or superseded, matches, since a "did I ever take this position" search
> that silently missed a superseded stance would be exactly the kind of silent
> gap this project's capture contract elsewhere refuses to accept. A matched
> topic's *response* still defaults to its live position only, with the full
> chain returned only on explicit request — matching scope and response scope
> are independent knobs. A not-found response (topic-key mode) is a normal,
> non-error MCP result carrying one human-readable text content block naming the
> unmatched topic key — never an `isError` result, never a structured sentinel
> field — matching the exact convention every existing tool in this server
> already uses (`librarian-get-note`: "Note not found: \<path\>";
> `librarian-search`: "No notes matched \"\<query\>\""). *(v14.0.0 — pins match
> scope to the full chain and the not-found response's wire shape;
> panel-2026-08-13-phase-b-reprobe.md's Divergence 1 (verified against
> `src/server.ts`'s actual shipped tools rather than re-derived from panel
> readings alone) and its single-reader match-scope flag.)* The default response
> for any matched topic is its live position only; the full chain is returned
> only when explicitly requested.

## SR-061 — amended

**Before:**
> **SR-061** — `librarian-positions` shall support querying by topic key (exact
> match), by free text matched against stance content, and by a note's versioned
> identity (returning positions whose refs include that note). A topic-key query
> shall return a single topic result or an explicit not-found response, never a
> list — mirroring `librarian-get-note`'s singular-lookup convention, since a topic
> key is by construction unique in the fold. A free-text or note-identity query
> shall return a list of zero or more topic results — mirroring
> `librarian-search`'s list convention, since both can match more than one topic.
> The default response for any matched topic shall return its live position only,
> with the full supersession chain returned only on explicit request.
> *(ubiquitous)*

**After:**
> **SR-061** — `librarian-positions` shall support querying by topic key (exact
> match), by free text matched against stance content, and by a note's versioned
> identity (returning positions whose refs include that note). A topic-key query
> shall return a single topic result or an explicit not-found response, never a
> list — mirroring `librarian-get-note`'s singular-lookup convention, since a topic
> key is by construction unique in the fold. A free-text or note-identity query
> shall return a list of zero or more topic results — mirroring
> `librarian-search`'s list convention, since both can match more than one topic.
> Free-text and note-identity matching shall scan a topic's entire event chain,
> not only its live event, so a topic whose distinguishing stance or ref appears
> only in a superseded event is never silently excluded from matching. The
> default response for any matched topic shall return its live position only,
> with the full supersession chain returned only on explicit request. Where a
> topic-key query finds no match, the response shall be a normal, non-error MCP
> result carrying one text content block naming the unmatched topic key — never
> an `isError` result and never a structured sentinel field — matching the exact
> convention `librarian-get-note` and `librarian-search` already use for their own
> not-found/empty-result cases. *(ubiquitous)*

## Traceability row — cosmetic update

`SR-061` retains its `*(amended v10.0.0)*` tag, gaining a second: `*(amended
v14.0.0)*`.

## What does NOT change

- No new SR. No field, table, or schema change — this pins response wire shape
  and match scope, not the fold or projection design.
- SR-058 (v9.0.0), SR-059 (v11.0.0), SR-060 (v8.0.0), SR-062 (v12.0.0), SR-063
  (v13.0.0), SR-064, SR-065 — untouched.
- No dissent reactivation expected: relevant conditions key on code landing, not
  spec text — spec-only change, no Phase B code exists yet (this amendment reads
  existing S1 source for precedent; it does not modify or generate anything).

## Panel status after this amendment

All four routed divergences from `panel-2026-08-13-phase-b-reprobe.md` are now
closed (v11.0.0, v12.0.0, v13.0.0, this version), plus its single-reader
match-scope flag. Two low-priority, never-routed gaps remain from the first
Phase B panel — versioned-note-identity match precision (gap 2) and SR-064's
field scope (gap 3) — recommended for a future patch, not decisions requiring a
stop now.
