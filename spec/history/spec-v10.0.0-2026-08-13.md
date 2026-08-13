# spec v10.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SR-061 and the SCN-011 "Query modes" acceptance criterion** — closes
Divergence 3 from `/flow-panel`'s first read of Phase B
(`spec/.staging/panel-2026-08-13-phase-b.md`), the last of its three routed
divergences. SR-061 named three query modes (topic key / free text / note
identity) without stating the response envelope. 2 of 3 blind readers had
topic-key mode return a singular object (0 or 1 result); 1 of 3 argued for a
uniform list envelope across all three modes on ergonomic grounds.

### Resolution

Checked against this project's own established tool conventions rather than
re-derived from panel readings alone (the v5.0.0/v6.0.0/v8.0.0/v9.0.0 pattern).
This project already ships two read-only tools whose names encode this exact
distinction: **`librarian-get-note`** fetches one note by its own unique identity
— a singular lookup — and **`librarian-search`** returns however many results
match a query — a list, by design. `librarian-positions`' topic-key mode is
structurally identical to the `get-note` case: a topic key is unique in the fold
by construction (the fold groups events by topic key — exactly one live
projection per key, never several), so it is an exact-identity lookup, not a
search. Its free-text and note-identity modes are structurally identical to the
`search` case: both can plausibly match more than one topic. **The response shape
varies by mode**, following the get-vs-search convention this project already
established, rather than inventing a third, uniform-envelope convention for one
tool.

### Amended text

- **SCN-011**, "Query modes" acceptance criterion: now states explicitly that a
  topic-key query returns a single result or not-found, never a list, while
  free-text and note-identity queries return a list of zero or more results.
- **SR-061**: same content pinned in the EARS requirement, citing
  `librarian-get-note` and `librarian-search` by name as the precedent; traceability
  row gains an `*(amended v10.0.0)*` tag.

### What did not change

No new SR. No field, table, or schema change — this pins the tool's response
*envelope*, not the fold or projection shape. SR-058 (amended v9.0.0), SR-059,
SR-060 (amended v8.0.0), SR-062..065 untouched.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. dissent-2026-08-05-0001's
condition 2 ("a third read surface lands") keys on code landing
(`grep -c 'librarian-positions' src/server.ts`), not spec text — this is a
spec-only change, no code exists yet for Phase B. Does not fire.
dissents-reactivated stays 0.

### Panel status after this amendment

All three routed divergences from `panel-2026-08-13-phase-b.md` are now closed:
Divergence 1 (retired-stub content, v8.0.0), Divergence 2 (fold materialization
timing, v9.0.0), Divergence 3 (query response envelope, this version). The
panel's three convergent-but-underspecified gaps remain open by design — the
panel recommended them for a future patch, never routed them as decisions:

1. Whether "most recent revision date" (SR-062) advances on `reaffirm` or only on
   `revise`.
2. Whether a note's-versioned-identity query matches exact-version only or is
   version-agnostic.
3. Whether SR-064's inert-rendering requirement extends to stance/refs/session-id,
   or is scoped to `topic_key` alone.

### Panel

Not re-run. This amendment resolves shape by citing an already-established
project convention (the `get`-vs-`search` tool-naming/shape distinction) rather
than opening new interpretive surface.
