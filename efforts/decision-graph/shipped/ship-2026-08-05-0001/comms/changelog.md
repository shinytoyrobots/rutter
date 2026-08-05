# my-librarian — Note identity (decision-graph Phase 0)

*Ship 2026-08-05 · spec v3.10.1 · single-audience changelog (operator preference:
sponsor/sales/support/marketing tiers deliberately omitted)*

## New

- **References survive renames.** Session records reference notes by path + content
  hash. When a referenced note is renamed without edits, the next `npm run reindex`
  re-binds the reference automatically — exact content-hash match only, no
  similarity guessing (constitution prohibition 8). `librarian-recent` and search
  enrichment resolve through the binding; the stored record's bytes never change.
- **Ambiguity is surfaced, never guessed.** Renamed *and* edited (no hash match), or
  duplicated content (multiple matches): the reference renders as **unresolved** with
  its candidates. Zero-candidate references appear on `librarian-recent` only —
  enrichment is candidate-anchored (documented limit; dissent-0001).
- **Human confirmation, CLI only:** `npm run identity-confirm <old-path> <candidate>`
  appends a `detected: confirmed` binding. Deliberately not an MCP tool — a connected
  model must not be able to launder auto-binds past prohibition 8 (SR-044).
- **Confirmed bindings are sticky** (SR-046, new this ship): later automatic
  detection never silently outvotes a human decision; disagreement renders as
  "confirmed X; the hash now matches Y" until a fresh confirmation moves it.
- **Append-only ledger** at `_librarian/note-identity.md` (`note-identity@1`,
  mdbase-compatible): the single durable artifact of the identity pass. Existing
  entries are never rewritten, reordered, or compacted — now enforced down to byte
  level and guarded against schema-drift field loss (pre-ship mitigation M1).
- SQLite projections remain disposable: delete `data/librarian.db` and reindex;
  identity state rebuilds from vault + `_librarian/` alone.

## How-to

README §"Note identity survives a rename" and `docs/memory-of-use.md` §6 (both
updated in this ship, verified against actual behavior at eval).

## Known limits / deferred

- SR-104's wall-time bound is still uncalibrated (identity pass ~103ms p50 at 2,300
  notes on the shared fixture; bound to be fixed by patch after named-span
  instrumentation).
- Two recorded disagreements (dissents) ship with armed reactivation conditions —
  see `../ship-record.md`.
