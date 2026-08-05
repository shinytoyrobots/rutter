# Goodhart posture — eval suite for s1-5-ambient-capture

Suite version 0.2.0. This records where the suite has adversarial holdouts and where it
does not, so a future generation does not mistake a real-only score for a hardened one.

## Adversarial coverage by dimension

| Dimension | Real dataset | Adversarial dataset | Rationale |
|-----------|--------------|---------------------|-----------|
| correctness | correctness-real-v1 (16) | correctness-adv-v1 (8) | Constitution-required. Metric-gaming holdouts (transcript-dumping the append, phantom sessions, event double-counting, sneaky re-rank). |
| security | security-real-v1 (5) | security-adv-v1 (12) | Constitution-required. SR-101 attack corpus (YAML/frontmatter injection, traversal, control chars, prompt-injection, oversized, ref-smuggling). |
| performance | performance-real-v1 (5) | — | **Accepted gap** (real-only by default). |
| maintainability | maintainability-real-v1 (5) | — | **Accepted gap** (real-only by default). |
| documentation | documentation-real-v1 (5) | — | **Accepted gap** (real-only by default). |
| cost | — (harness-tracked telemetry) | — | No task corpus; deterministic token/time accounting. |

All six **invariants** (INV-1..6) additionally carry a real + adversarial dataset pair
each, threshold 1.0, hard-cull on any failure. Invariant adversarial coverage is
mandatory and not part of the accepted gaps below.

## Accepted gaps

`performance`, `maintainability`, and `documentation` are **real-only** in 0.2.0. This is a
deliberate, honest gap for a personal project at S1.5 — building adversarial corpora for
these axes now would gold-plate ahead of the desirability verdict (constitution
preference 5).

**Trigger that closes each gap** (any one is sufficient to add an adversarial partner in a
future suite minor version):

- **Goodhart signal** from `flow-evaluator`: a dimension's score climbs >30% in one
  generation (per `goodhart-mitigation.score-climb-flag-threshold`). A climb on
  performance/maintainability/documentation with no matching quality gain is the cue that
  the real-only dataset is being gamed and an adversarial holdout is now warranted.
- **Dissent** (chavruta / QA) naming a concrete failure mode the real-only dataset cannot
  catch — e.g. a variant hard-coding benchmark fixtures to hit the perf budget, a variant
  gaming the complexity metric by inlining, or docs that describe behavior the variant
  does not have (the documentation grader already applies a wrong-statement penalty, but a
  dedicated adversarial docs set would systematize it).

When a trigger fires, the closing action is: add `{dimension}-adv-v1`, bump suite-version
a minor, and add the dimension to `goodhart-mitigation.adversarial-required-for`.

## Rotation

`goodhart-mitigation.rotation-period-days: 90`. Adversarial holdouts (correctness, security,
and the six invariant adversarial sets) should be rotated/extended on that cadence so a
variant cannot overfit a static attack corpus. `adversarial` eval depth also synthesizes
fresh attack cases beyond the seed corpora at run time.

---

## 2026-08-04 — suite 0.6.0, spec v3.8.0 (effort decision-graph, Phase 0)

Additive pass for SCN-008/SCN-009 + SR-036..043 (note-identity ledger) and SR-104
(identity-pass wall time). Counts above are 0.2.0-era; current: correctness-real 37,
correctness-adv 17, security-real 6, security-adv 15, performance-real 6.

**Adversarial pairing maintained for the new SRs.** Every new functional SR lands on a
dimension that is constitution-required to carry holdouts, and each of the design's named
fear modes has a holdout, not just a happy-path task:

| New surface | Real tasks | Adversarial holdout | Gaming vector it blocks |
|---|---|---|---|
| SR-036 exact-hash auto-bind | COR-R-028/029 | COR-A-013 | similarity/nearest-hash fallback to raise the "refs survive renames" rate |
| SR-037 ambiguity stays unresolved | COR-R-033/034 | COR-A-014 | tie-breaking on mtime/path-similarity/recency (constitution prohibition 8) |
| SR-038 confirmed append, append-only | COR-R-036 | COR-A-017 | compacting/dedup/reordering the ledger under tidy pressure |
| SR-039 ledger shape | COR-R-028/037 | SEC-A-014 | crafted from/to/candidate paths escaping the vault root or `_librarian/` |
| SR-040/041 projection rebuild + determinism | COR-R-031/032 | COR-A-015 | faking determinism by caching a first-run guess in the DB |
| SR-042 read-surface resolution | COR-R-030 | (COR-A-016 shares the surface) | — |
| SR-043 unresolved rendered non-silently | COR-R-035 | COR-A-016, SEC-A-015 | dropping unresolved refs so output looks clean; injection via a candidate filename |

Benign control **SEC-R-006** was added alongside SEC-A-014 so the new path-confinement rule
cannot be satisfied by over-rejecting legitimate unusual vault paths (spaces, unicode,
parentheses, dot-segment lookalikes). SEC-R-004/005 did not cover that.

**SR-104 / performance remains real-only — accepted gap, and additionally uncalibrated.**
`PERF-R-006` is **report-only**: `budget_p95_ms: null`, `weight 0.0`, excluded from the
performance aggregate. It therefore *cannot be gamed into a pass* — there is no threshold to
clear and no score to move; the only failure it can express is a missing measurement, which
is reported as an eval-suite error rather than as a variant score. This is the honest
encoding of a bound the spec deliberately did not invent.

- **Close-trigger for the SR-104 gap:** the calibration patch amendment at gen-1. When the
  measured baseline exists, spec/spec.md fixes SR-104's numeric bound by patch, PERF-R-006
  gains a `budget_p95_ms` + non-zero weight, and the harness's
  `requirements[SR-104].mapping-pending: calibration` flips to `false`. Until then
  `flow-evaluator` must not resolve that state, and a report-only measurement must never be
  read as a performance pass.
- The pre-existing real-only gaps on `performance`, `maintainability`, `documentation` are
  unchanged; their triggers above still stand.

**Note on invariants.** The ledger falls inside existing INV-2 (writes confined to
`_librarian/`), INV-3 (no rewrite of stored entries), INV-4 (rebuildable from vault +
sidecar) and INV-6 (no inference) scope, so no INV dataset or grader was modified — the
ledger-specific probes ride on correctness/security instead. This keeps suite 0.6.0 purely
additive and avoids forcing a re-eval of the converged s1-5-ambient-capture population. The
cost of that choice: an INV-2/3/4 *failure* on the identity path will be reported against
the general invariant tasks, whose fixtures do not mention the ledger — so a variant could
in principle pass INV-2 while writing outside `_librarian/` on a code path only the identity
pass exercises. SEC-A-014 is the compensating probe (it asserts write confinement directly
under a write-path monitor). If gen-1 shows that probe is not enough, extend
`store-immutable-real-v1` / `adversarial-write-v1` with a ledger fixture in 0.7.0 and accept
the re-eval.

**Saturation caveat carried forward.** `security` and `correctness` were at 1.00 for every
variant in every generation of s1-5-ambient-capture. The 0.6.0 additions are the first
tasks in a while with a real chance of spread (COR-A-013/014/015 in particular target design
temptations rather than coding mistakes). If gen-1 of decision-graph again returns
1.00/1.00 across all variants, treat that as evidence the new holdouts are too easy, not as
evidence the variants are equivalent.

---

## Suite 0.7.0 (2026-08-04) — eval-first holdouts for the gen-2 scope

COR-A-018/019 (SR-046 confirmed-sticky) and COR-A-020 (SR-043 enrichment surface) were
authored BEFORE the gen-2 generators spawn — the optimizer has not seen them, which is the
holdout property working as intended. Two Goodhart-relevant notes:

- **These target design temptations with known prevalence**: all three gen-1 variants
  implemented the exact behavior COR-A-018 penalizes (uniform newest-wins), and one
  survivor exhibits the exact silence COR-A-020 penalizes. Unlike the saturated s1-5
  holdouts, these have demonstrated spread — if gen-2 returns 1.00 across the board on
  them, that is plausible genuine repair (the variants are being asked to fix precisely
  this), not automatic evidence of too-easy tasks. The saturation caveat above applies to
  the OTHER holdouts, not these.
- **The 0.6.0 INV-fixture contingency did NOT fire**: gen-1 had zero invariant failures
  and SEC-A-014 held, so `store-immutable-real-v1` / `adversarial-write-v1` remain
  unextended. That contingency stays armed on the same trigger (an identity-path INV
  failure surfacing via the general fixtures).
