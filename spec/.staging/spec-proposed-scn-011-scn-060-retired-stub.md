# Proposed amendment — SCN-011, SR-060 (retired-stub content)

**Classification:** Major (existing SCN-011 acceptance criterion and existing SR-060
text modified). Version: 7.0.0 → 8.0.0.

**Source:** `/flow-panel` (spec/.staging/panel-2026-08-13-phase-b.md), Divergence 1.
Three blind readers split on whether `librarian-positions`' default-view "retired
stub" for a topic includes the `retire` event's own client-authored stance text, or
suppresses stance entirely. 2 of 3 (R1, R2) suppressed it; 1 of 3 (R3) included it.

**Resolution and reasoning (verified against already-ratified spec text, not
re-derived from panel readings alone — the pattern this effort used for its last two
amendments):** the write side of this exact question is already settled. SCN-010's
grammar accepts a stance on a `retire` directive (`POSITION retire <topic-key>:
<stance>`), and SR-057 — already ratified, Phase A — requires that stance to be
non-empty for the directive to be valid at all, with **no carve-out for `retire`**:
"a non-empty stance of any length is always a valid directive." That means every
`retire` event that exists on disk *already* carries a real, non-empty,
client-authored stance by construction. Reading A (suppress stance from the stub)
would therefore discard real content on **every single retirement**, not an edge
case — the exact class of silent data loss this project has repeatedly ruled against
(SR-023/SR-034's "report, never enforce or discard" pattern; INV-6's "no laundering"
posture). Reading B is adopted: the retired stub carries the retire event's own
fields in full, including its stance, using the same uniform event shape SR-048
already gives every event — no new field name, no special-casing.

---

## SCN-011 — amended acceptance criterion

**Before:**
> **Retire is a terminal marker, not a stored deleted state.** A `retire` event is
> folded the same way any other event is — appended to the chain in order — but the
> fold's live-view computation treats it as the topic's terminal state: the default
> view shows a retired stub (kind: retire, its own timestamp) rather than the
> stance of the event before it. No event is removed from the underlying stream or
> the full-chain view to produce this.

**After:**
> **Retire is a terminal marker, not a stored deleted state.** A `retire` event is
> folded the same way any other event is — appended to the chain in order — but the
> fold's live-view computation treats it as the topic's terminal state: the default
> view shows a retired stub — the retire event's own kind, timestamp, session id,
> refs, and its own byte-verbatim stance (every valid `retire` directive carries a
> non-empty stance per SR-057, exactly like every other directive kind; this is the
> retirement's own recorded text — e.g. a reason — never a copy of the stance from
> the event before it) — rather than the stance of the event before it. No event is
> removed from the underlying stream or the full-chain view to produce this.
> *(v8.0.0 — pins the retired stub's shape; panel-2026-08-13-phase-b.md's
> Divergence 1: the alternative reading, suppressing the retire event's own stance,
> would silently discard client-authored content on every single retirement, since
> SR-057 already guarantees that stance is never empty.)*

## SR-060 — amended

**Before:**
> **SR-060** — When the most recent event for a topic key is a `retire`, the
> default (live) view of `librarian-positions` shall render that topic as a
> retired stub rather than the stance of any earlier event, while every event for
> that topic — including those before the retirement — shall remain unmodified and
> queryable via the full-chain view. *(event-driven)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); INV-3 / constitution prohibition 3, cited not restated; "dropped from the default view" is a read-time display decision, never a write to the underlying stream; mapping-pending: true`

**After:**
> **SR-060** — When the most recent event for a topic key is a `retire`, the
> default (live) view of `librarian-positions` shall render that topic as a
> retired stub carrying the retire event's own kind, timestamp, session id, refs,
> and byte-verbatim stance, rather than the stance of any earlier event, while
> every event for that topic — including those before the retirement — shall
> remain unmodified and queryable via the full-chain view. *(event-driven)*
> `# ← SCN-011; added v7.0.0 (decision-graph, Phase B); amended v8.0.0 (panel-2026-08-13-phase-b.md, Divergence 1: pins the retired stub's shape — it carries the retire event's OWN stance, never suppresses it, since SR-057 already guarantees every retire directive has a non-empty stance and omitting it would silently discard client-authored content on every retirement); INV-3 / constitution prohibition 3, cited not restated; "dropped from the default view" is a read-time display decision, never a write to the underlying stream; mapping-pending: true`

## Traceability row — cosmetic update only

`SR-060` gains an `*(amended v8.0.0)*` tag in the SCN-011 traceability row, matching
the convention already used for SR-047/048/049/052 in the SCN-010 row. No other
column changes; mapping stays `mapping-pending: true` (unchanged — this amendment
touches text only, no eval mapping work).

## What does NOT change

- No new SR, no new SCN. No field renamed or added to the event/schema shape —
  `stance` was already a mandatory field on every `PositionEvent` (SR-048); this
  amendment only states that the read-time stub doesn't drop it.
- SR-058, SR-059, SR-061..065 — untouched.
- No code exists yet for Phase B (dispatch to `flow-generate` remains blocked on
  escalation trigger 4, unrelated to this amendment) — nothing to regenerate.
- No dissent reactivation expected: checked `efforts/decision-graph/dissents-active.yaml`
  — dissent-2026-08-05-0001's condition 2 ("a third read surface lands") and
  dissent-2026-08-13-0004's condition 4 ("a field enters PositionEventSchema")
  both key on *code* landing, not spec text; this is a spec-only change with no new
  field and no code yet, so neither fires.
