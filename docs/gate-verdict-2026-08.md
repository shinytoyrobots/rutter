# Phase 0 gate verdict — the desirability gate

**Written:** 2026-08-12. **Ratified by Robin: 2026-08-12.**
**Gate (SCN-004):** Robin reaches for stateful behavior (`librarian-recent`, or a
`librarian-search` that surfaces a prior-engagement signal) unprompted ≥3×/week for
2 weeks, clock restarted 2026-07-26 at ship-2026-07-26-0003.
**Verdict: PASS.** The memory-of-use thesis (HANDOFF.md §1) is what the observed
behavior supports — not H2 (belief-lifecycle), which the wish log never asked for.

---

## 1. The numbers

`npm run gate`, run 2026-08-12:

```
2026-W30: 2
2026-W31: 8  ✓
2026-W32: 16  ✓
2026-W33: 2   (partial week, in progress)
```

Both full weeks after the clock restart clear the ≥3/week bar by a wide margin (8 and
16 against a bar of 3). W30 is a partial week predating the restart and doesn't count
against it. On the raw count alone this passes without qualification.

## 2. The open acceptance criterion — intent, not call origin

SCN-004's fourth acceptance criterion is explicitly deferred to this review:
classifying each invocation as *unprompted* means attributing it to a live human
question or task versus standing server instructions alone (SR-020) with no human
question behind it. This is the check the 2026-08-05 reframe (spec v3.11.0) exists
to make honest — a passing count that just reflects the server telling every client
to prefer these tools would mean nothing.

**What the log can and can't show.** `stateful-use.jsonl` (28 events, 2026-07-26 →
2026-08-13) records only `{ts, kind}` — no query text, no session linkage. A
mechanical per-event classification isn't recoverable from the log alone, and full
conversation transcripts from those past sessions aren't retained anywhere the
librarian can read. That's a real instrumentation gap, not a rounding error — see §4.

**What decides it instead:** Robin's own ruling, already on record. The 2026-08-05
session log (`_librarian/sessions/2026-08-05.md`, entry 12:38:50) captures it
directly — Robin challenged the human-vs-agent framing of an early draft and settled
it: *"model-executed but human-intended recall (e.g. 'what have I been working on?')
is the librarian working, not a failure mode."* That is the classification rule
SCN-004 asks for, stated at the policy level rather than needing to be re-derived
per call. It's also already in `spec/spec.md` SCN-004's Given clause verbatim.

**Applying the rule to these 28 calls.** `librarian-recent`'s own tool description is
"answer 'what was I working on lately?'" — there is no other reason a client calls
it. In an interactive, single-user Claude Code session (no scheduled or autonomous
invocation exists anywhere in this project), every tool call happens inside a live
human turn by construction. The case SR-020 was written to exclude — an ambient
reach with *no* human question behind it at all, e.g. a background job polling the
tool — doesn't occur in this architecture. The `search-signal` events (6 of the 28)
are the same shape one level down: a normal search surfaced a prior-engagement note
as a side effect of something Robin was already asking about.

The clearest single data point is this conversation: it opened with "where are we
with this project currently?" and the two `librarian-recent` calls at
2026-08-13T03:46:54Z/59Z are the direct, unambiguous response to that question —
exactly the target behavior, not the tool being reached for on standing instruction
with nothing live behind it.

**Conclusion on this criterion:** every logged event is attributable to a live
human question or task under Robin's own stated rule; none is the SR-020-only case
the axis exists to catch. The gate isn't just numerically passing — it's passing on
the intent it was designed to measure.

## 3. Which thesis this supports

Per `docs/roadmap.md` Phase 0: write the verdict against **memory-of-use**
(HANDOFF.md §1 — "personal, persistent memory-of-use layer... the server holds
state, the client is the brain"), not against H2 (belief-lifecycle) from the
2026-07-22 validate-plan. The wish log stopped 2026-07-27 with six entries, none
asking for belief-lifecycle — all six were capture/recall plumbing. Two more weeks
of real, gate-passing use have not surfaced a belief-lifecycle wish either. The
validate-plan's own H2 caveat ("inferred, not observed") still holds. This verdict
does not authorize H2; per `docs/roadmap.md` Phase 3, the next pillar is chosen by
evidence, and the evidence so far still doesn't name H2.

## 4. Carried forward — the instrumentation gap this review exposed

SCN-004's acceptance criterion says instrumentation "captures all invocations with
timestamps to support" the classification — in practice, timestamps alone forced
this review onto a structural argument (§2) rather than a call-by-call one. That
argument holds here because the architecture is simple (one interactive client, no
autonomous calls), but it won't scale to a future where that's no longer true (e.g.
Phase 5's discursive client, or any autonomous/background use). Worth a small,
optional fix before the *next* gate needs to answer this: log a lightweight
self-reported trigger tag at call time (e.g. `"human-question"` vs
`"standing-instruction"`), set by the calling client, no new server-side judgment
required. Not blocking this verdict; flagged for whoever picks up Phase 1's
read-value signal, since it's the same shape of fix.

## 5. Disposition

Ratified. Closed out in:
- `docs/roadmap.md` Phase 0 — status line added, matching the Phase 2 precedent.
- `_librarian/wish-log.md` — one line noting the verdict, per the roadmap's own
  "either restart the wish log or accept it already answered" framing — accepted,
  not restarted.
- `HANDOFF.md` §Open item 3 (desirability-gate verdict) — marked done.

Item carried forward, not closed here: §4's instrumentation-gap fix (self-reported
trigger tag), queued alongside Phase 1's read-value signal — the next item on the
roadmap.
