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
