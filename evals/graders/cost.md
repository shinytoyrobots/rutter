---
name: cost
version: "1.0.0"
status: placeholder
dimension: cost
grader-type: deterministic   # token accounting, no judgment
threshold: 0.50
covers-sr: []   # cross-cutting; consumes the evaluator's own cost accounting
covers-scn: []
datasets: [cost-real-v1]   # = generation/eval telemetry, not a task corpus
---

# Cost grader — S1.5 ambient memory-of-use

Scores the token/compute cost of *producing and evaluating* a variant, so the
orchestrator can weigh a marginal quality gain against its price on the Pareto front.
This is meta-cost (build the slice cheaply — constitution preference 5), NOT the
runtime cost of the server (the server does no inference; INV-6). Threshold **0.50**.

## Grader type

**Deterministic.** Sums counters already emitted by the pipeline; performs no model
inference and makes no judgment.

Inputs consumed:
- **tokens-to-generate** — tokens spent by flow-generate to author this variant
  (implementation + constraint-bias reasoning).
- **tokens-to-evaluate** — tokens spent by this evaluator across all graders for this
  variant, including LLM-judge passes and (on deep/adversarial depth) re-samples.
- **elapsed-ms** for both phases (secondary; reported, lightly weighted).

The evaluator writes its own `tokens-to-evaluate` and `elapsed-ms` into `eval-result.yaml`
(per the evaluator contract), and this grader reads them back — a variant that is
expensive to evaluate (e.g. because it tripped many re-samples) pays for it here.

## Input format

`cost-real-v1.jsonl` — a single record per variant assembled from pipeline telemetry:

```json
{"id":"variant-cost","tokens_generate":42000,"tokens_evaluate":58000,
 "elapsed_generate_ms":90000,"elapsed_evaluate_ms":120000,
 "budget_total_tokens":150000,"weight_tokens":0.8,"weight_time":0.2}
```

## Scoring rules

- Total tokens = `tokens_generate + tokens_evaluate`.
- Token sub-score: `1.0` if total ≤ 0.5 × budget; linear ramp to `0.0` at `budget`;
  `0.0` above budget. (Cheaper is better; the ramp rewards frugality, not just being
  under budget.)
- Time sub-score: same shape against a total-elapsed budget.
- Aggregate = `0.8 · token_sub + 0.2 · time_sub`. Pass when ≥ 0.50.
- **Higher score = cheaper.** This axis is minimized-cost expressed as a 0..1 utility so
  it composes with the other five dimensions (all "higher is better").

## Failure-rationale requirement

If below threshold, record: total tokens vs budget, the generate/evaluate split, elapsed
split, and the largest cost driver (e.g. "adversarial-depth re-samples on security judge
= 31k tokens"). Written to `evals-failures/{variant-id}-cost.md`.

## Open assumptions (flow-eval attention)

- **DRAFT budget:** `budget_total_tokens = 150000` per variant is a placeholder for the
  cheapest-useful-slice ethos; flow-eval should set it from real generation telemetry
  once a generation exists.
- Assumes the generate/evaluate token counters are actually emitted by flow-generate and
  the evaluator. If a counter is missing the grader records the gap and returns a partial
  score rather than fabricating a number. **Telemetry wiring to be established.**
- Cost is deliberately low-threshold (0.50) and reporting-oriented: it is a trade-off
  axis, not a gate. The orchestrator, not this grader, decides if a variant is too dear.
- Excludes human-review time and any future runtime inference cost (there is none in the
  server by INV-6).
