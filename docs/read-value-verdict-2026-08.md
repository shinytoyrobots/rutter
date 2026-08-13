# Read-value verdict

**Written:** 2026-08-12. **Ratified by Robin: 2026-08-12.**
**Question (`docs/roadmap.md` Phase 1, promoted to the primary kill condition):** does
a recall change what happens next, or has the record gone write-only?
**Verdict: PASS, decided qualitatively — no instrument built.**

---

## What was tried, and why it was set aside

`docs/read-value-signal-plan.md` scoped a mechanical signal — a graded, ambient
correlation between recall events and later captures (session continuation, then ref
overlap, then a mined self-report). Robin's read on it: this isn't something to
instrument, and isn't something to review as a mechanism. From the individual
perspective the captures demonstrably help — at minimum reducing rework, and often
driving work in new directions — and that's a felt, qualitative judgment, not one
that reduces cleanly to a proxy metric.

That call is consistent with the constraint the plan itself was built under: **no
model in the server** (HANDOFF §1). Whether something changed what a person did next
is exactly the kind of judgment the architecture already puts on the human/client
side, never the server's. The plan's own tier-1 design had a known blind spot for
precisely this reason — it couldn't see "the recall informed new work" at all, only
"the recall's own artifact got revisited" — and that blind spot is a symptom of
trying to mechanize something that has a direct, cheaper, more honest source: asking.

## Verdict

**Does not hold:** "recalls are written but never acted on." Robin's direct account is
that recalls change subsequent work, in both directions the kill condition cares about
— less re-derivation of settled thinking, and new directions the recall itself
surfaced. The record has not gone write-only.

## Disposition

- `docs/read-value-signal-plan.md` — retired, not built. Kept as a record of the
  design exploration (its blind-spot finding is worth keeping even though the
  mechanism isn't), status header updated to say so.
- `docs/roadmap.md` — Phase 1's read-value bullet and the kill-conditions section
  both get a status note pointing here.
- **Consequence for Phase 5:** its stated entry condition — "Phase 0 and the Phase 1
  read-value signal show recall is real and acted on" — is now met on both halves
  (Phase 0: `docs/gate-verdict-2026-08.md`, PASS; read-value: this verdict, PASS).
  This clears the gate; it does not itself start Phase 5, which stays a direction
  until someone decides to build it.

## Standing note for later

If the tool's shape changes such that no one person's felt judgment is available to
ask — multi-user, or a client acting with less human-in-the-loop than today —
`docs/read-value-signal-plan.md`'s tiered design is where to pick this back up. Under
the current single-user, ask-Robin architecture, it isn't needed.
