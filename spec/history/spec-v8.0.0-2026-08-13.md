# spec v8.0.0 — 2026-08-13

**Effort:** decision-graph (Phase B)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

**Amends SCN-011's "Retire is a terminal marker" acceptance criterion and its
derived SR-060** — closes Divergence 1 from `/flow-panel`'s first read of Phase B
(`spec/.staging/panel-2026-08-13-phase-b.md`, run immediately after v7.0.0 drafted
this scenario). 3 blind readers split on whether the default-view "retired stub" a
topic renders when its most recent event is a `retire` includes that event's own
client-authored stance text, or suppresses stance entirely: 2 of 3 suppressed it,
1 of 3 included it.

### Resolution

Verified against already-ratified spec text rather than re-derived from panel
readings alone (the pattern this effort used for its last two amendments, v5.0.0
and v6.0.0). The write side of this exact question is already settled: SCN-010's
grammar accepts a stance on a `retire` directive, and **SR-057 — already ratified,
Phase A — requires that stance to be non-empty for the directive to be valid at
all, with no carve-out for `retire`**. Every `retire` event that exists on disk
therefore already carries a real, non-empty, client-authored stance by
construction. Suppressing it from the stub would discard real content on **every
single retirement**, not an edge case — the class of silent data loss this project
has repeatedly ruled against (SR-023/SR-034's report-never-discard pattern, INV-6's
no-laundering posture). The retired stub now carries the retire event's own fields
in full — kind, timestamp, session id, refs, and its own byte-verbatim stance —
using the same uniform event shape SR-048 already gives every event. No new field,
no special-casing.

### Amended text

- **SCN-011**, "Retire is a terminal marker, not a stored deleted state" acceptance
  criterion: now states explicitly that the stub carries the retire event's own
  kind, timestamp, session id, refs, and stance — the retirement's own recorded
  text (e.g. a reason), never a copy of the stance from the event before it.
- **SR-060**: same content pinned in the EARS requirement; traceability row gains
  an `*(amended v8.0.0)*` tag on SR-060, matching the convention already used for
  SR-047/048/049/052 in the SCN-010 row.

### What did not change

No new SCN, no new SR. No field renamed or added to the event schema — `stance`
was already mandatory on every `PositionEvent` (SR-048); this amendment states only
that the read-time stub doesn't drop it. SR-058, SR-059, SR-061..065 untouched.

### Dissent check

Checked `efforts/decision-graph/dissents-active.yaml`. dissent-2026-08-05-0001's
reactivation condition 2 ("a third read surface lands") and dissent-2026-08-13-0004's
condition 4 ("a field enters `PositionEventSchema`") both key on **code** landing,
not spec text — this is a spec-only change, no new field, no code yet for Phase B
(dispatch remains blocked on escalation trigger 4, unrelated to this amendment).
Neither fires. dissents-reactivated stays 0.

### Not addressed this round (still open, from the same panel)

Divergence 2 (fold materialization timing — reindex-only vs. a write-time hook into
SCN-010's write path, and its interaction with SR-065's non-interference guarantee)
and Divergence 3 (query response envelope shape — singular object vs. uniform list
for topic-key mode) remain open, each its own future `/flow-spec amend` per the
panel record's routing. Also still open: the panel's 3 convergent-but-underspecified
gaps (revision-date scope re/reaffirm-vs-revise-only; versioned-note-identity exact-
vs. version-agnostic match; SR-064's scope relative to stance/refs/session-id).

### Panel

Not re-run. This amendment codifies an answer already derivable from ratified Phase
A text (SR-057) rather than opening new interpretive surface — the same posture
v6.0.0 took for Phase A's wire-format ratification.
