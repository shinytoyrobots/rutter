# my-librarian — S1.5: the Librarian starts remembering (ship-2026-07-25-0001)

*2026-07-25 · spec v2.0.1 · gen-1 var-3 (maintainability bias) · local ship, not yet pushed*

The first stateful slice. Until today the Librarian could only search; a stateless
assistant forgets you between sessions. From this ship forward it **accrues
memory-of-use ambiently** — the one thing the whole project exists to test.

## New

- **Ambient session capture** — a Claude Code Stop hook appends *one curated line* per
  session ("what did this session decide/produce?") to `<vault>/_librarian/sessions/<date>.md`.
  Durable, git-committable markdown; typed mdbase-compatible frontmatter
  (`session-record@1`); notes referenced by path + content-hash as-read. Empty
  sessions leave no trace. No AI runs in the server — your client writes the line,
  the server stores it inertly.
- **`librarian-recent`** — "what was I working on lately?" Most-recent-first session
  summaries with dates and provenance; optional `window`/`count`; honest empty state.
- **Prior-engagement enrichment** — search results you've engaged before carry a quiet
  "↩ prior engagement" annotation. Additive only: never re-ranks, never nags, silent
  on everything else.
- **Desirability-gate instrumentation** — `npm run gate` reports per-ISO-week stateful
  use against the ≥3×/week bar.

## Guarantees (invariant-tested, threshold 1.0)

Local-first, zero network egress · vault is never written · memory-of-use is never
hard-deleted · the SQLite index stays a disposable cache (delete + rebuild verified) ·
stdout carries only MCP frames · no model inference in the server.

## Quality at ship

46/46 tests · 12/12 injection-attack vectors neutralized (path traversal, YAML/frontmatter
injection, control chars, oversized input) · all perf budgets cleared 5–50× · real-vault
reindex: 2,306 notes in ~1.1s.

## Known trade-offs (tracked, not hidden)

Enrichment re-reads session records per search — imperceptible at ~1 record/day, on the
watch list for ~1k records. Session days are UTC. Two chavruta dissents remain active
with armed reactivation conditions (see dissents-active.yaml).

## What decides this slice's fate

Two weeks of real use, verdict ~2026-08-08: reach for the stateful behaviors unprompted
≥3×/week or the product stops here — cheaply, by design. Keep the wish log.
