# Internal changelog — ship-2026-08-13-0001

**Effort:** decision-graph, Phase A (position capture) · **Spec:** v4.0.0 ·
**Ship kind:** GATED · **Date:** 2026-08-13
**Variant:** `gen-4/population/var-1-graft` @ `45b0ec9`, built on
`gen-3/population/var-2-maintainability` @ `fa93acf`
**First ship of Phase A.** Phase 0 (durable note identity) shipped separately as
`ship-2026-08-05-0001`.

Terms used below are glossed on first use — this is written for someone who runs the
suite, not someone who lives inside it.

---

## What shipped

A second kind of "remember this" line. Sessions could already leave a summary of what
they did; they can now also leave a **stance** — a position on some topic that the
session formed, changed, reaffirmed, or retired:

```
<!-- librarian-position POSITION assert|revise|reaffirm|retire <topic-key>: <stance> -->
```

The capture hook routes it by action word alone and appends it to a brand-new
append-only file, `_librarian/positions/<YYYY-MM>.md`. Nothing about the existing
session stream changes. This is the write half of the belief-lifecycle capability;
there is no read path in this ship and none was specced.

Four behaviors worth knowing without reading the spec:

- **Retire is an append, not a delete.** The stream is never rewritten or compacted.
- **Topic keys are stored byte-verbatim**, including spaces and punctuation. A key that
  departs from convention produces a note on stderr and is stored anyway. Same
  report-don't-enforce shape the stance word budget already uses.
- **An empty stance is no directive.** Ratified in v4.0.0 after the pre-implementation
  spec panel split on it; mirrors the existing unfilled-`<template>` rule.
- **Session capture is provably untouched.** Not asserted — measured, by byte-comparing
  session records across five interleavings of position and session captures against a
  position-free control run. The control-vs-control baseline was validated first,
  because real-clock ids legitimately differ between any two runs and an earlier pass
  of that probe reported a false failure for exactly that reason.

The feature is **taught, not dark**: the server instructions carry the grammar, so a
connected client can emit the directive from the moment the server restarts.

---

## Why this is gated rather than clean

The gate has changed character since the previous round, and that is the real result
here. At gen-3 the blockers were **code defects** — a grammar that rejected any topic
key containing a space, and a missing diagnostic. Both are closed. What remains are
two **ratification items**: places where the shipped code and the ratified spec text
disagree, deliberately and with the reasoning written down, in a way only a human
decision through `/flow-spec` can settle.

Both were correctly anticipated in the variant's own decision ledger before the
evaluator found them. Neither is a defect, and neither is something a user of the tool
would notice.

### Item 1 — the provisional format marker isn't blessed yet

The positions file stamps its own format as `position-event@1-provisional`. The
ratified spec names the bare `position-event@1` in six places. Read literally, the
shipped code does not conform to its own spec.

This is intentional. It came out of the paired adversarial review at the cull (the
chavruta — two reviewers arguing opposite biases to a recorded verdict), which held
that if the capture path is turned on, the records it writes are permanent, and
permanent records should say which encoding produced them **before the first one
exists**. That window is genuinely open right now: no real position event exists
anywhere, so there is no migration to do and no file containing two encodings.

Cost of closing it either way is one line. Either the spec ratifies the suffix and
states the condition under which it gets dropped, or the code reverts the bump.

### Item 2 — a test expects a message the spec doesn't promise

One adversarial test covers a directive whose action word isn't one of the four
(`POSITION maybe my-topic: ...`). Storage behavior is entirely correct — nothing is
captured, nothing leaks into the session record, exit code clean. The test additionally
requires a stderr diagnostic, and no requirement anywhere states that one is owed.

So this is a spec/test disagreement, not a functional gap. It's also the single reason
the new-scope slice of the correctness score sits just under its threshold while the
pooled score clears it comfortably — read both numbers together or you'll draw the
wrong conclusion from either.

Worth flagging: the evaluator graded this **strictly and against the variant's
interest**. On any position-only firing, the session channel unconditionally logs "no
session directive found" — a grader reading the test criterion literally would have
scored a pass off that unrelated line. It didn't, and it recorded why, so the next run
reproduces.

---

## Why a graft, and why that shape matters here

A **graft** is a variant assembled by carrying one lineage's code forward and porting
named fixes into it, rather than generating a fresh implementation. This one took the
maintainability lineage as its base (chosen for its separate `librarian-position` tag,
which makes the two capture streams structurally unable to collide) and ported in three
named fixes from the cull: the missing empty-stance diagnostic, the topic-key grammar
that rejected spaces, and the provisional marker.

The shape is what makes this shippable while gated: three source files changed, one of
them a single constant, no new imports anywhere, and each fix independently revertible
without unwinding the others. Everything on the existing read and index paths has a
zero-line diff.

The score movement on the new-scope correctness slice is steep enough to trip the
metric-gaming detector, and the evaluator reported that rather than suppressing it.
The shape is benign: the optimization target was **externally specified** — a cull named
exactly these three fixes — and a targeted graft closing exactly the tasks a cull named
will always show a steep climb. Every fix was re-verified by an evaluator-written probe
driving the real CLI as a child process, not by trusting the variant's green tests, and
the documentation shadow score was reported **downward** against the variant's interest
(see below).

One structural caveat: this generation had a population of one, so nothing here was
cross-checked by a sibling variant disagreeing. The decision-ledger audit substitutes
for that and is a weaker instrument. Specifically, item 2 above is currently one
lineage's reading of the spec versus one test, with no tiebreaker — which is a reason
to treat it as a human decision rather than let the scoreboard settle it.

---

## What a raw-file reader should know

Anyone opening `_librarian/positions/2026-08.md` will see `-provisional` on the format
line with no explanation of what it means. That gap is real and known: the reasoning
lives in a source comment and the decision ledger, and neither the README nor
`docs/memory-of-use.md` mentions it. The documentation score the suite reports is
inherited unchanged and doesn't see this at all — it was caught only by the evaluator's
parallel shadow judgment, which dropped accordingly. Closing item 1 should close the
doc gap in the same pass.

Practical guidance for anyone building on this: don't pin a reader to the current
on-disk shape. The format validator accepts either encoding on read, so a stream
written under the provisional tag still parses once the tag is finalized — that
backward-tolerance is the point of the marker, not an accident.

---

## Armed and watched

- **Two recorded disagreements from this checkpoint ship with the code** —
  `dissent-2026-08-13-0003` (one sentinel channel or two) and `-0004` (teach it now or
  ship it dark). Both were resolved into this graft's construction; neither blocks.
- **The earlier `dissent-2026-08-05-0001` reactivation trigger does not fire.** It
  greps for the *plural* `librarian-positions`; the shipped code contains the
  *singular* `librarian-position` as its wire tag. This is a one-character near-miss
  and it is correct — the trigger's intent is a read surface, and Phase A has none.
  Do not "helpfully" loosen the pattern.
- **`dissent-2026-08-05-0002`'s code shape recurs verbatim** on the new stream: the
  append path re-serializes the whole event array over a schema that strips unknown
  keys, so a field added after events exist would be silently dropped from the older
  ones. That is precisely why the encoding marker was specified as required rather than
  optional.
- **Known gaps the suite cannot currently see**, routed to `/flow-eval`: no test crosses
  a month boundary, so the deduplication scan's scope is unprobed; no test uses a topic
  key containing a colon, so the delimiter rule is unpinned; no test asserts the format
  string, which is how the rename passed silently in the first place; and no performance
  task covers the position write path at all, while the duplicate check scans every
  month's file on every capture.
- **Instrument caveats, so nobody over-reads the scoreboard:** the cost score is
  produced by a budget known to be stale and is not meaningful — the raw token count is
  well under the constitution's per-variant budget and less than half the previous
  round's. The security score has been at ceiling for every variant in every generation
  of this effort and should not be read as evidence of comparable hardening. The
  performance improvement is better instrumentation, not faster code; no module on any
  measured path was touched.

## Next

`/flow-spec` on the two ratification items — item 1 is on the critical path and cheapest
now, while no real position event exists anywhere. Then `/flow-eval` to make the format
string actually asserted, so neither this rename nor a future accidental one is
invisible again.
