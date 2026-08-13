# spec v14.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SR-061 and the SCN-011 "Query modes" acceptance criterion** — closes
two findings on the same requirement, folded into one pass:

- **Divergence 1, Phase B re-probe** (`spec/.staging/panel-2026-08-13-phase-b-reprobe.md`):
  v10.0.0's amendment closed *cardinality* (topic-key mode never returns a list)
  but left the not-found response's *wire shape* unpinned. All 3 readers found
  at least three defensible encodings (structured sentinel field, `isError`
  result, plain-text message), and the amendment's own citation of
  `librarian-get-note` as precedent wasn't verifiable from spec text alone (S1
  tools predate this spec).
- **Single-reader flag, same re-probe**: 1 of 3 readers (rated the sharpest
  remaining fork for its correctness impact) found SR-061 never states whether
  free-text/note-identity matching scans a topic's live event only, or its
  entire chain.

### Resolution

This time, verified against actual shipped source rather than spec text alone
— the citation in the prior amendment pointed at code, so the code is what got
checked (the same discipline used at v6.0.0, extended here since this is the
first Phase B amendment whose precedent lives outside `spec.md`). `src/server.ts`
shows both existing read tools handle their empty case identically:

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

Neither uses `isError`. Both are normal, successful results with one text block
carrying a human-readable sentinel string — no shared helper, but a consistent
pattern with no exception anywhere in the server. `librarian-positions` adopts
the same pattern.

For match scope: all 3 original panel readers independently sketched the FTS5
index over the *full* event table, not a live-only subset — a design converged
on before this question was even posed. This project also has a repeated,
explicit ethos against silent loss (SR-049's v4.0.0 amendment; SCN-011's own
Given/When/Then). A recall tool that silently misses a topic because the
matching phrase was later revised is exactly that failure shape. **Match scope
is the full chain**; response scope (live-only by default, chain on request)
stays a separate, already-settled knob.

### Amended text

- **SCN-011**, "Query modes" acceptance criterion: states the not-found
  response's shape (normal MCP result, one text block, human-readable message,
  never `isError`, never a structured field) and pins match scope to the full
  event chain.
- **SR-061**: same content pinned in the EARS requirement; traceability row
  gains a second version tag, `*(amended v14.0.0)*` (alongside its existing
  v10.0.0 tag).

### What did not change

No new SR. No field, table, or schema change. SR-058 (v9.0.0), SR-059 (v11.0.0),
SR-060 (v8.0.0), SR-062 (v12.0.0), SR-063 (v13.0.0), SR-064, SR-065 untouched.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. Relevant conditions key
on code landing, not spec text — spec-only change, no Phase B code exists yet
(this amendment *reads* existing S1 source for precedent; it does not modify or
generate anything). None fire. dissents-reactivated stays 0.

### Panel status after this amendment

All four routed divergences from `panel-2026-08-13-phase-b-reprobe.md` are now
closed (v11.0.0, v12.0.0, v13.0.0, this version), plus its single-reader
match-scope flag. Two low-priority, never-routed gaps remain from the first
Phase B panel — versioned-note-identity match precision (gap 2) and SR-064's
field scope (gap 3) — recommended for a future patch, not decisions requiring a
stop now.

### Panel

Not re-run. This amendment pins wire shape by citing already-shipped code
convention (not spec text, but the same "verify before writing" discipline) and
pins match scope by citing the panel's own convergent architecture sketches —
neither opens new interpretive surface.
