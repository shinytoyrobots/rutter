# Roadmap — rutter

**Written:** 2026-08-03
**Amended:** 2026-08-05 — gate axis reframed from call origin to intent (Phase 0, kill
conditions); discursive-librarian direction added (Phase 5).
**Status:** proposal, not ratified. `spec/spec.md` remains the executable source of truth;
nothing here is a requirement until it lands there.
**Purpose:** high-level sequencing for work after the S1.5 desirability gate. Phases are
ordered by dependency, not by calendar. Each carries an explicit exit condition.

---

## Where this stands (2026-08-03)

Spec v3.5.0. Ambient capture shipped and verified behaviorally — session records landed
unbroken 07-26 → 08-04 after the hand-installed global rule was deleted on 07-27, which
is the verification wish-log finding #5 asked for. Recall-dedup is closed on both leak
paths (v3.3.0 fix (a) for hash churn; v3.5.0 incremental capture + read-time grouping).

Desirability gate (SCN-004) verdict due ~2026-08-09.

**Two live problems, both measurement/discipline rather than architecture:**

1. **The gate can no longer see what it measures.** 10 of 11 logged calls are
   `librarian-recent`, and since SR-020 the server instructions tell every connected
   client to prefer these tools. The log cannot distinguish an unprompted human reach
   from a model call made because it was instructed to. The gate is defined as
   unprompted human use, so it will return a passing number either way.
2. **Summary verbosity is regressing.** Step counts are stable (7–40/day, no trend) but
   average summary length has tripled: ~37–61 words/step in week 1 → 141 (08-02),
   142 (08-03), 192 (08-04). SR-021's style contract asks for one plain-English line.
   Nothing enforces it, so it drifts — the same "behaviorally, not architecturally,
   guaranteed" failure class as finding #5, recurring on a different requirement.

---

## Phase 0 — Close the gate honestly (now → ~08-09)

The verdict is worth more than the deadline. Do not let a technically-passing number
authorize the next build.

- ~~Separate **model-initiated** from **human-initiated** calls in SCN-004
  instrumentation.~~ **Reframed 2026-08-05: call origin is the wrong axis.** "What have
  I been working on?" is model-executed but human-intended — the assistant is the
  delivery mechanism, and memory reached through conversation is still memory reached.
  Excluding model-initiated calls would exclude the librarian doing its job. Classify
  each stateful call by **what pulled it** instead: a live human question in the
  session, or the standing server instructions alone. Intent attribution, not caller
  identity. Without this the gate is still unfalsifiable; the reframe just makes the
  instrumentation measure the right thing.
- Either restart the wish log or accept that it already answered. It stopped 07-27 with
  six entries, **none** of them asking for belief-lifecycle — all six were capture/recall
  plumbing defects.
- Write the verdict against **memory-of-use**, which is what HANDOFF.md's thesis
  already says the tool is, rather than against H2 (belief-lifecycle) from the
  validate-plan. The validate-plan itself flagged H2's value as "inferred, not
  observed"; two weeks of real use have not changed that.

**Exit:** a written verdict naming which thesis the observed behavior supports, and an
instrumentation change that makes the next gate falsifiable.

**Status (2026-08-12): DONE — see `docs/gate-verdict-2026-08.md`.** Verdict: PASS,
both on the raw count (W31: 8, W32: 16, both well over the ≥3/week bar) and on the
intent axis (every logged call traces to a live human question or task, per Robin's
own 2026-08-05 ruling that model-executed-but-human-intended recall counts). Thesis
supported: memory-of-use, not H2 — the wish log stayed silent on belief-lifecycle
through two more gate-passing weeks. The instrumentation-change half of the exit
condition is carried forward as a non-blocking recommendation (a self-reported
trigger tag at call time), queued alongside Phase 1's read-value signal rather than
done here.

---

## Phase 1 — Summary discipline (immediately after, small)

The live regression. Cheap to fix, and it gates Phase 2: a record averaging 192
words/step makes the abbreviated recall view not actually cheap, which defeats the one
control that decouples recall cost from stored size.

- ~~Enforce SR-021 mechanically at capture time.~~ **Done, spec v3.6.0 (2026-08-04).**
  Corrected on contact with the spec: "refuses" was never available — SR-023 and the
  SCN-007 acceptance criteria forbid rejecting *or* truncating on style grounds, and
  annotating the record body is forbidden too (COR-R-027 requires the body line to be
  time + summary and nothing else). What shipped instead: an explicit word budget in
  the contract (40 target / 60 ceiling, the authoring-time lever), overflow channelled
  into per-thing directives via SR-033, and the capture path reporting overage on
  stderr while storing verbatim (+SR-034).
- ~~Add a drift test on summary length.~~ **Done** — the contract's stated numbers and
  `config.summaryWordCeiling` must agree or the suite fails, so the contract and the
  code cannot drift apart.
- Consider making `detail` default to abbreviated, with the existing non-silent
  abbreviation notice.
- ~~Add a **read-value** signal.~~ **Settled qualitatively, 2026-08-12 — no
  instrument built.** See `docs/read-value-verdict-2026-08.md`: Robin's direct account
  is that captures reduce rework and often drive new directions, which the
  architecture (no model in the server) puts on the human side to judge, not a proxy
  metric. `docs/read-value-signal-plan.md` scoped a mechanical alternative and is
  retired, kept only for its tier-1 blind-spot finding.

**Exit:** average summary length back inside the contract, and a test that fails if it
drifts again.

---

## Phase 2 — Open-source release (after Phase 1)

Publish as a **dated artifact**, not as a maintained project. That distinction is the
whole cost/benefit: an artifact carries the positioning value; a project carries a
standing support obligation.

Mechanical work (~half a day, no blockers found):

- Add `LICENSE` (MIT — dependency tree is `@modelcontextprotocol/sdk`, `gray-matter`,
  `zod`, all MIT; no AGPL, because the Basic Memory fork was correctly avoided).
- `package.json`: drop `"private": true`; repo visibility private → public.
- De-personalize `SERVER_INSTRUCTIONS` and the tool descriptions in `src/server.ts` —
  they say "Robin's work" / "a result Robin engaged" and ship to every client. Source
  comments naming Robin are cosmetic and can stay.
- Fix three hardcoded `/Users/shinytoyrobots/...` paths in `README.md` and
  `docs/overview.md`.
- README must state (a) what it is *for* — memory-of-use, not retrieval, not
  belief-lifecycle; (b) that it is a personal tool shared as reference, unsupported;
  (c) any known limitation honestly.

No content scrubbing needed: `data/` and `_librarian/` are gitignored and memory-of-use
is kept out of the code repo by spec (SR-102 / prohibition 6). Nothing personal is
tracked.

**Timing note — the real reason not to let this drift.** Ideas from this codebase have
begun informing the author's professional work. Publishing promptly establishes the
mechanism as independently authored prior art, shown by the timeline rather than argued
after the fact.

**Exit:** public repo, MIT, README that claims the right thing.

**Status (2026-08-05): DONE — and out of order.** Published and tagged `v0.1.0` ahead of
the Phase 0 gate verdict, on an explicit operator call; the timing argument above won.
Recorded plainly: publication was originally gated on the verdict and shipped without
it. The gate work is unchanged, the verdict (~2026-08-09) is still owed, and a public
repo does not count as evidence the stateful behavior gets reached for.

---

## Phase 3 — The next pillar, chosen by evidence (after the verdict)

Deliberately unspecified here. Candidates, from the ACH: H3 (ingestion), H4
(guide-to-collection), H2 (belief-lifecycle). The ACH ranked H3/H4 co-equal at −0.5 and
flagged the tie as brittle; H2 was most-corroborated but least-observed.

**Rule:** do not build H2 on inference alone. It is the pillar with the strongest
research support and the weakest behavioral evidence, and the instrument built to
detect demand for it (the wish log) conspicuously never asked for it.

**Exit condition to even start:** Phase 0's verdict names a pillar, supported by
observed use rather than analysis.

---

## Phase 4 — Org scale (watch item, not a build)

Keep as a question, not a project. Single-user use teaches almost nothing about the
hard parts at team scale: ratification authority, privacy surface, cross-user conflict.
The June concept bake-off already scored the nearest neighbor (H5 "Remembrancer") last
at −7.0, sunk by integration burden and privacy sensitivity.

Any commercial move here also has to clear the employer-conflict question first, since
it overlaps the author's professional work. That is a gate, not a risk.

---

## Phase 5 — The discursive librarian (direction, not yet a build)

Added 2026-08-05. Stephenson's Librarian was discursive — you talked to it and it
talked back, with a manner. The long direction for this tool is the same: a librarian
you converse with rather than an index you query. More discursive answers first;
possibly a pseudo-personality later.

The no-model rule survives this. The server already ships `SERVER_INSTRUCTIONS` to
every client that connects; a voice is just more instruction, performed by the client,
where the reasoning already lives. The record underneath stays inert, append-only,
checkable. Constitution principle 3 ("quiet when unprompted, discursive on demand")
already names the boundary — this extends the discursive-on-demand half without
touching the quiet half.

**Exit condition to even start:** Phase 0 and the Phase 1 read-value signal show recall
is real and acted on. A personality on a write-only record is a costume.

**Entry condition met (2026-08-12):** both halves are now verdicted PASS —
`docs/gate-verdict-2026-08.md` (Phase 0) and `docs/read-value-verdict-2026-08.md`
(read-value, decided qualitatively). This clears the gate; Phase 5 is still a
direction, not scheduled, until someone decides to build it.

---

## Non-goals

- Retrieval quality as a value thesis — commoditized (ACH: H1 second-worst, above only
  the null).
- Server-side summarizing, merging, or rewriting on the read path — INV-6, COR-A-012.
- Becoming a supported open-source product with roadmap obligations to strangers.
- Multi-user / team features while the single-user thesis is still unverified.

## Kill conditions

*(Reframed 2026-08-05. The first condition previously keyed on call origin — "unprompted
human use once model-initiated calls are excluded." That axis doesn't survive contact
with real usage: recall flows through the assistant by design, so excluding
model-initiated calls excludes the librarian doing its job.)*

- Phase 0 verdict shows no stateful call traces back to a human question — the memory
  is consulted only under standing instruction, never through conversation → the tool
  is agent infrastructure, not a librarian; re-scope or stop.
  **Evaluated 2026-08-12: does not hold.** PASS — see `docs/gate-verdict-2026-08.md`.
- Read-value signal (Phase 1) shows recalls are written but never acted on → the record
  has gone write-only; fix that before building any new pillar. **This is the primary
  condition.** A recall that changes nothing downstream fails regardless of who
  initiated it; one that changes what happens next is the tool working, whoever placed
  the call.
  **Evaluated 2026-08-12: does not hold.** PASS, decided qualitatively — see
  `docs/read-value-verdict-2026-08.md`.
