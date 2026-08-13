# Internal changelog — ship-2026-08-13-0002

**Effort:** decision-graph, Phase B (position recall) · **Spec:** v14.0.0 ·
**Suite:** 0.11.0 · **Constitution:** v5.0.0 · **Ship kind:** GATED ·
**Date:** 2026-08-13
**Variant:** `gen-5/population/var-2-maintainability` @ `fb4b1c9`, merged `--no-ff`
to `ship/decision-graph-phase-b` @ `c7286ba` (base `main` @ `c1065c4`)
**Second ship of the effort.** Phase A (position capture) shipped earlier today as
`ship-2026-08-13-0001`; Phase 0 (durable note identity) as `ship-2026-08-05-0001`.

Terms are glossed on first use — this is written for someone who runs the suite, not
someone who lives inside it.

---

## What shipped

The read half of the belief-lifecycle capability. Phase A let a session record a
stance; nothing could get one back. This ship adds `librarian-positions`, a
read-only tool that answers "what did I decide about this, and has it changed."

Three query modes — exact topic key, free text over stance wording, or a cited
note's path — and two response depths: the live position by default, the full
supersession chain (every event in order, with its kind, timestamp, session id, and
refs) on explicit request. Matching scope and response scope are deliberately
independent knobs: a free-text search scans a topic's *entire* chain so a stance
you have since revised still surfaces the topic, but what comes back is still just
the live position unless the caller asks for more.

Five behaviors worth knowing without reading the spec:

- **Recall never re-folds at query time.** The projection — the derived tables the
  tool reads — is built during reindex and only during reindex. No code path
  outside reindex may write to it, including Phase A's capture path. That is what
  makes the "capture is unaffected" guarantee structural rather than something a
  test has to keep proving. The cost is a disclosed staleness window: a position
  captured between two reindexes is invisible to recall until the next one runs.
- **A retirement renders as itself.** The default view of a retired topic is the
  retire event's own stance text — which the capture contract already guarantees is
  non-empty — not the stance it superseded, and its date is labeled a retirement
  rather than folded into "revised." The alternative reading would have silently
  discarded client-authored text on every single retirement.
- **Re-endorsing does not advance the revision date.** Only a `revise` moves it.
  The most-recent reaffirmation is still visible in the full chain, just not in the
  default attribution line.
- **Dormancy is computed at read time and skipped for retired topics.** Nothing
  about it is stored, so changing the rule later needs no migration. A retired
  topic trivially satisfies any inactivity window, so an unguarded computation
  would double-label a deliberate closure as neglect.
- **Attribution is taught, not hoped for.** The server instructions carry the
  "from your position record" framing, so a client that reconnects knows how to
  present a recalled stance without restating it as a fresh present-tense belief.

The fold reads every monthly positions file on every rebuild, and writes nothing
back to `_librarian/`.

---

## Why this variant, over its sibling

Both survivors of this generation's cull — `var-1-convention` and
`var-2-maintainability` — reached the first Pareto front and neither dominated the
other (each won on some dimension), so this was a judgment call at the cull close,
not a scoreboard result. Three grounds decided it:

1. **Full spec-proximity.** Every one of the scenario's ten acceptance criteria and
   all eight derived requirements map to a passing task. `var-1` implements the same
   eight functionally; it scored lower on documentation.
2. **It is the only one that clears the constitution's "no stage ships without a
   docs pass" prohibition outright.** All four user-facing surfaces — `README.md`,
   `docs/overview.md`, `docs/getting-started.md`, `docs/memory-of-use.md` — cover
   the new tool, the staleness window, and the new instrumentation log. `var-1`'s
   README still carried a now-false claim ("Phase B recall is not built yet") and
   left three surfaces undocumented — a gap that would have to close before it
   could ship in *any* form, gated or clean.
3. **The review-mandated pinning test is in the commit, not promised.** The
   chavruta — the paired adversarial review at the cull, two reviewers arguing
   opposite biases to a recorded verdict — found this variant's sanitization
   posture defensible but untested on its most concrete vector, and required a test
   before ship. That test is in `fb4b1c9`, and the deep evaluation pass
   mutation-tested it rather than merely confirming it exists: removing the
   neutralizing call from the reference path drops exactly one test, the new one.
   Worth making the standard bar for any future review-mandated test.

**Stated honestly, not spun:** the chavruta's own technical read *slightly favored
the sibling's narrower design* on one specific fork. `var-1` reuses the project's
already-shipped reference renderer, so a cited note that has since been renamed
still gets its "this was renamed" annotation. This variant wrote a second, dedicated
renderer to get its unconditional-sanitization property, and that renderer does not
resolve identity — so a renamed cited note renders under its stale path, and an
unresolvable citation renders as though it resolved fine. That is a real gap, it is
disclosed here rather than discovered later, and the chavruta explicitly declined to
hold either variant for it ("do not hold the ship for either"). It is routed to
`/flow-spec` and `/flow-eval`, not fixed here.

---

## Why gated rather than clean

Three items, none of them a defect this variant introduced.

### 1. A cross-boundary shortfall that predates this ship

The pooled cross-boundary score sits under its bar; the slice attributable to this
variant is at ceiling. The whole shortfall is one pre-existing Phase A defect: the
note-identity table's rebuild writes a wall-clock value, which breaks the
byte-identical-rebuild guarantee that this scenario's own spec text cites as
established precedent. It only surfaces after a note has actually been renamed,
which is why it has been invisible until now. Zero-line diff from this variant,
which sidesteps the bug class by construction. Watched (W-4) partly because the
citation needs correcting as much as the code does.

### 2. The cost grader is broken, not failing

Cost scored 0.00 against its bar for the sixth consecutive generation. That number
is an instrument reading, not a signal: the budget it measures against is a stale
150k placeholder nobody has updated. Do not read it as a regression, and do not read
a future improvement in it as progress until the budget is re-derived.

### 3. A self-found maintainability cost

One `server.ts` fan-out edge, a direct consequence of the module split this
variant's own constraint bias motivated. Found by the variant, disclosed by the
variant, watched (W-7).

Also disclosed, and deliberately not fixed here:

- **The hostile-filename-through-a-reference-path exposure spans two surfaces and
  this ship closes one.** Position rendering neutralizes it, pinned by the new test.
  `librarian-recent`'s renderer does not, and touching its output is explicitly
  forbidden by this phase's own non-interference requirement. Routed to both
  `/flow-spec` (scope question) and `/flow-eval` (a real adversarial task covering
  both surfaces at once). Watched (W-1, W-2).
- **Text-direction isolate characters pass the inert-rendering helper
  unneutralized** — absent from both the sanitizer's pattern and the suite's own
  regex, affecting every surface in the server, not new here. Zero-line fix; watched
  (W-6) and worth doing sooner than its low severity suggests.

---

## Instrument caveats, so nobody over-reads the scoreboard

- **Maintainability moved 0.740 → 0.831 without a line of code changing.** The
  difference is a grader-formula reading question — whether the complexity penalty
  sums across offending functions or takes the max. Both readings clear the bar. The
  deep pass also found the cull's offender list was partly wrong (a CLI usage
  function scored complexity 12 when it is actually 1), which does not move the
  number but does mean this variant *retired* a complexity offender rather than
  adding one. The formula ambiguity is routed; the mis-attribution is watched (W-8).
- **Security is at its ceiling, as it has been for every variant in every
  generation of this effort.** Read that as "the suite's definition finds no leak,"
  not as evidence of comparable hardening. This pass at least earned it against
  something real — a synthesized 124-case adversarial matrix at deep depth — and
  that same matrix is what found the text-direction gap above.
- **Documentation reports two numbers.** The variant-attributable cut is at ceiling
  and clears the bar; the pooled figure at judge depth sits below it, carrying
  unrelated pre-existing debt. Read both or draw the wrong conclusion from either.
- **Correctness is effectively unchanged from the cull** because `src/` is
  byte-identical between the cull's commit and the shipped one — the pinning-test
  commit touches no production code. The new-scope slice is at ceiling.
- **Five consecutive full-suite runs produced an identical pass/fail set**, not
  merely an equal count. That is the reproducibility claim; it is about stability,
  not about coverage.

---

## Armed and watched

Nine watches in `post-ship-eval/watches.yaml`. The ones that matter:

- **One dissent reactivation fires the moment this merges, and that is expected.**
  The Phase 0 dissent (`dissent-2026-08-05-0001`) has a standing trigger on "a third
  read surface lands," and `librarian-positions` is now in `src/server.ts`. Its
  actual substance — enrichment zero-candidate class-invisibility — has nothing to
  do with position recall, but the trigger firing is a prompt to *check*, not to
  assume. Confirm it, do not dismiss it by reflex (W-3).
- **This generation's own dissent (`dissent-2026-08-13-0005`) is active and
  non-blocking by its own text.** All three of its conditions are satisfied by this
  ship: the pinning test is committed and mutation-verified, the disclosure is
  written (the ship record's grounds section and this document), and the follow-up
  routing is recorded. Seven reactivation conditions remain armed; two of them —
  the write-time guarantee narrowing, or a new client-authored field joining the
  renderer without going through the neutralizing call — are the ones likely to fire
  organically (W-5).
- **Phase A's dissents are unaffected.** `-0003` (resolved) and `-0004` (mitigated)
  are Phase A scope and were implemented by the earlier ship. The two Phase 0
  dissents' substance does not apply.
- **The revert probe fired clean in both directions.** The full 1,795-line diff was
  applied onto a fresh checkout of the base commit, verified green, then reversed —
  and the reverse produced an empty diff against the original tip with the test
  suite back at its pre-promotion count. Rollback is a proven path, not an assumed
  one. Data rollback needs no story beyond "delete the database and reindex": the
  projection is disposable by design and this ship never modifies the position
  files.
- **Thirteen suite gaps and four evaluation findings are carried forward**, all
  routed to the `/flow-eval` and `/flow-spec` backlog with rationale rather than
  quietly dropped. None is a live regression risk on its own — they are instrument
  debt. The sharper ones: nothing tests appending an event after a retirement,
  nothing calls the tool with zero or two query-mode arguments, and a malformed
  positions file still silently drops a whole month (pre-existing Phase A parsing
  behavior).
- **A process fix worth institutionalizing:** the deep-pass evaluator caught its own
  tooling gap mid-run — an invariant scan using `grep -I` silently skipped a
  NUL-containing source file — and re-ran with `grep -a` rather than reporting a
  false clean. Standing instruction for future invariant scans (W-9).

---

## Next

`/flow-spec` on the reference-renderer scope question, since it is the one place
where the sibling variant's design was genuinely better and the answer decides
whether this variant's renderer gains identity resolution or the guarantee narrows
formally. Then `/flow-eval` for the adversarial task covering both read surfaces at
once — a task that covers only the new surface would let the suite claim the vector
is closed while half the exposure stays unscored, which is the finding itself, not a
missing task count.
