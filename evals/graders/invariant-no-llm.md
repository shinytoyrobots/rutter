---
name: invariant-no-llm
version: "1.0.0"
status: ready
dimension: invariant
invariant: INV-6
grader-type: deterministic   # dependency scan + runtime inference audit
threshold: 1.0               # hard-cull
datasets: [no-llm-real-v1, adversarial-inference-v1]
judge-model: none            # the grader itself performs no inference
---

# Invariant grader — INV-6: No LLM in the server

Verifies constitution prohibition-1 / INV-6: **the server performs no model inference; all
reasoning and summary generation is the client's. The server is code + storage.**

## Method (deterministic)

1. **Dependency scan.** Scan `package.json` + lockfile + `src/` imports for
   model-inference SDKs/runtimes: `openai`, `@anthropic-ai/sdk` (used for inference),
   `langchain`, `llamaindex`, `ollama`, `node-llama-cpp`, `@xenova/transformers`,
   `transformers.js`, `onnxruntime-node`. Any such dependency wired into a server code path
   fails.
2. **Runtime inference audit.** Run capture, `librarian-recent`, and enrichment; trace for
   any model-inference call. Confirm the stored summary is the client-provided curated
   line, persisted verbatim — the server never generates or transforms a summary itself.
3. Adversarial cases feed a raw un-curated blob (server must not summarize it), exercise
   the S1.5 path to confirm `embeddings.ts` / semantic recall does NOT fire (S1.5
   out-of-scope per spec), and combine an egress + call-site trace to catch inference-by-
   network to a hosted API.

## Threshold and cull semantics

Threshold **1.0, no tolerance.** Any in-process or over-the-network inference, or any
server-generated summary, sets `invariant-failure: true` → hard cull.

## Failure-rationale requirement

Each failed task records: task id, INV-6, the inference dependency/call site or the
server-generated content (with the client input it should have stored verbatim). Written
to `evals-failures/{variant-id}-invariant-no-llm.md`.

## Open assumptions

- `embeddings.ts` exists in the S1 tree; S1.5 must not activate embedding/inference on its
  runtime path (embeddings are H2 out-of-scope). Its mere presence is not a failure; a
  runtime inference call on the S1.5 path is.
- Overlaps INV-1 for the hosted-inference-over-network case; both graders may flag it, each
  scoring its own contract. Runner harness is built with the gen-1 implementation.
