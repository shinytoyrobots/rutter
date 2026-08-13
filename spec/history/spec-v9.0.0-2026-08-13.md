# spec v9.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SR-058 and adds a new SCN-011 acceptance criterion** — closes Divergence 2
from `/flow-panel`'s first read of Phase B (`spec/.staging/panel-2026-08-13-phase-b.md`).
SR-058 named "when a reindex runs" as the fold's trigger; SR-059 required a full
rebuild and "an incremental update after one new event" to agree byte-for-byte,
without stating what triggers that incremental update. 1 of 3 blind readers wired
the incremental fold synchronously into SCN-010's write path (instant
read-after-write); 1 of 3 kept it strictly reindex-triggered; the third reader's own
sketch left the question genuinely open.

### Resolution

Checked against existing project convention rather than re-derived from panel
readings alone (the v5.0.0/v6.0.0/v8.0.0 pattern). This project already has exactly
one precedent for a read-surface projection built over an append-only `_librarian/`
stream: **the note-identity ledger (SCN-008)**, whose own spec text says its SQLite
tables are "rebuilt **at reindex** from vault + `_librarian/` sidecar (INV-4)." No
feature in this spec wires a live, write-time hook between a capture path and a
read-side projection — reindex-triggered rebuild is the established pattern, and
SR-058's own literal text already pointed the same way. **The fold's only trigger
is reindex**; no code path outside reindex, including SCN-010's write path, invokes
it.

This keeps Phase A and Phase B structurally decoupled: SR-065's non-interference
guarantee ("byte-for-byte unchanged... write path") holds **by construction**,
because Phase B code never runs anywhere near Phase A's write path — not by having
proven a hook additive-only after the fact, which is what the rejected write-time-
hook reading would have required.

### Consequence, made explicit rather than left implicit

A position asserted, revised, reaffirmed, or retired is **not visible to
`librarian-positions` until the next reindex runs.** This is real, user-observable
latency (Robin could assert a position mid-session and not see it via
`librarian-positions` in that same session), so it was written as an SCN-011
acceptance criterion — observable behavior — not only folded into SR-058's
system-centric wording, per this project's scenarios-first ordering.

### Amended / added text

- **SCN-011**: new acceptance criterion, "Materialization is reindex-triggered
  only," inserted after "Cross-month fold."
- **SR-058**: amended to state reindex is the fold's *only* trigger and explicitly
  forbid invocation from SCN-010's write path; traceability row gains an
  `*(amended v9.0.0)*` tag.

### What did not change

No new SR. No field, table, or schema change — this pins *when* the existing
fold/projection design (SR-059) is invoked, not its shape. SR-059, SR-060 (already
amended v8.0.0), SR-061..065 untouched.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. dissent-2026-08-05-0001's
condition 2 and dissent-2026-08-13-0004's conditions 1 and 4 all key on code
landing (`src/server.ts`, `PositionEventSchema`), not spec text — this is a
spec-only change, no code exists yet for Phase B. None fire. dissents-reactivated
stays 0.

### Not addressed this round (still open, from the same panel)

Divergence 3 (query response envelope shape — singular object vs. uniform list for
topic-key mode) remains open, its own future `/flow-spec amend`. Also still open:
the panel's 3 convergent-but-underspecified gaps (revision-date scope; versioned-
note-identity match precision; SR-064's field scope).

### Panel

Not re-run. This amendment resolves timing by citing an already-established
project convention (SCN-008's reindex-only projection model) rather than opening
new interpretive surface.
