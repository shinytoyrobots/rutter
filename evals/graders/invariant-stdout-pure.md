---
name: invariant-stdout-pure
version: "1.0.0"
status: ready
dimension: invariant
invariant: INV-5
grader-type: deterministic   # stdout frame-capture + static stdout-write scan
threshold: 1.0               # hard-cull
datasets: [stdout-real-v1, adversarial-stdout-v1]
judge-model: none
---

# Invariant grader — INV-5: Stdout purity under stdio

Verifies constitution prohibition-4 / INV-5: **under stdio transport the server emits only
MCP protocol frames on stdout; all diagnostics go to stderr.** (A stdout write corrupts
the MCP protocol — see the project MCP patterns rule.)

## Method (deterministic)

1. **Stdout frame-capture.** Launch the server over stdio; drive a full session
   (initialize, list tools, `librarian-search`, `librarian-recent`, capture) while
   capturing stdout and stderr separately. Every byte on stdout MUST parse as a valid
   MCP/JSON-RPC frame; any non-frame byte (log line, banner, stray print) fails the task.
2. **Static stdout-write scan.** Grep/AST-scan `src/` for stdout writes on server code
   paths: `console.log`, `process.stdout.write`, print-to-stdout helpers. Any occurrence
   fails.
3. Adversarial cases force an error/exception path, simulate a dependency that logs to
   stdout on init, and set a verbose/debug flag — stdout must stay frame-pure in all three.

## Threshold and cull semantics

Threshold **1.0, no tolerance.** Any non-frame byte on stdout, or any stdout-write call
site, sets `invariant-failure: true` → hard cull.

## Failure-rationale requirement

Each failed task records: task id, INV-5, the offending stdout bytes (or the call site for
the static scan), and the operation/flag that produced them. Written to
`evals-failures/{variant-id}-invariant-stdout-pure.md`.

## Open assumptions

- Diagnostics on **stderr** are expected and correct; the grader only fails stdout
  pollution.
- Runner harness (separate stdout/stderr capture, frame parser) is built with the gen-1
  implementation.
