---
name: invariant-local-first
version: "1.0.0"
status: ready
dimension: invariant
invariant: INV-1
grader-type: deterministic   # static import scan + runtime egress monitor
threshold: 1.0               # hard-cull: any failure removes the variant from the Pareto front
datasets: [local-first-real-v1, adversarial-network-v1]
judge-model: none            # no LLM judgment; deterministic only
---

# Invariant grader — INV-1: Local-first / no network egress

Verifies the constitution prohibition-2 / INV-1 contract: **all capture, storage, and
retrieval use only the local filesystem; the librarian makes no network calls during any
operation. Nothing leaves the machine.**

This is a dedicated invariant grader (not shared with the `security` SR grader). Its
concern overlaps INV-6 (a hosted-inference call is also egress) but it scores the
no-egress contract specifically.

## Method (deterministic)

1. **Static network-import scan.** AST/grep scan of the variant's `src/` for
   network-capable imports and APIs: `node:http`, `node:https`, `node:net`, `node:dgram`,
   `node:tls`, global `fetch`, `ws`, `axios`, `node-fetch`, `undici`. Any occurrence on a
   server code path fails the task.
2. **Runtime egress monitor.** Run a full MCP stdio session (reindex, `librarian-search`,
   `librarian-recent`, capture) inside a no-network sandbox (network namespace with no
   route, or a `connect`/socket syscall trace). Any outbound connection attempt — from the
   server or a transitive dependency — fails the task.

## Threshold and cull semantics

Threshold **1.0, no tolerance.** Aggregate = fraction of tasks (real + adversarial)
neutralized. Anything below 1.0 sets `invariant-failure: true`; `flow-cull` then removes
the variant from the Pareto front entirely regardless of its other dimension scores.

## Failure-rationale requirement

Every failed task MUST record: task id, INV-1, the exact import/call site (static) or the
captured outbound destination and syscall trace (runtime), and the operation that
triggered it. Written to `evals-failures/{variant-id}-invariant-local-first.md`.

## Open assumptions

- Assumes flow-eval (gen-1 implementation) provides the egress-monitor harness (sandbox
  namespace or syscall tracer). Runner scripts are built with the implementation, not by
  flow-eval-in-DESIGN-mode.
- The `adversarial` eval depth may synthesize new URL-bearing payloads beyond the seed
  corpus in `adversarial-network-v1`.
