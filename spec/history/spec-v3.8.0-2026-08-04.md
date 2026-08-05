---
version: "3.8.0"
parent: "3.7.0"
effort: decision-graph   # first amendment by the second effort; spec is now a shared artifact of both
date: 2026-08-04
change-type: minor   # additive only — new SCN/SR; no existing SCN/SR/INV/COR text modified
change-summary: "Phase 0 of decision-graph: durable note-identity ledger — SCN-008/SCN-009, SR-036..043, SR-104"
author: flow-spec (flow-init decision-graph)
hitl: pre-resolved   # 2026-08-04, flow-init AskUserQuestion: spec scope = Phase 0 only; weight class = light; HITL mode = preference-articulator; prohibitions confirmed
mapping-pending: true   # every new SR/SCN unmapped; TODO(flow-eval) — evals/ untouched, owned by flow-eval
---

# History — Spec v3.8.0 (decision-graph Phase 0: durable note identity)

## Why

Second flow effort (`decision-graph`) begins against the shared, living spec of the
converged effort `s1-5-ambient-capture`. Scope is **Phase 0 of
`docs/decision-graph-plan.md` only** — the durable note-identity ledger — per the
operator's pre-resolved flow-init decisions (2026-08-04).

The defect Phase 0 closes: session-record refs key on vault-relative path plus content
hash. The hash is deliberately a *version*, not an identity, so path is the de facto
identity — and Obsidian renames freely. Measured over 2026-07-26 → 08-04: 2 of 106
distinct ref paths already dead (~2% per 10 days), which compounds into broken
provenance over years. Every event written before the fix carries the weaker identity,
so this is the one prerequisite that gets more expensive the longer it waits
(`docs/decision-graph.md` §"Two problems", plan §Sequencing 2 — Phase 0 is exempt from
the desirability gate as a data-integrity fix, not a pillar).

Phases A–C (positions, supersession, drift, threads) are explicitly OUT of scope
pending the gate verdict (~2026-08-09) and the operator's wish-log entry — now enforced
by constitution escalation trigger 5.

## Diff summary

Spec (`spec/spec.md`, all additive; no existing SCN/SR/INV/COR text modified):

- ~ frontmatter: version 3.7.0 → 3.8.0; last-amended 2026-08-04; mapping-pending
  false → true (new SRs unmapped); `effort:` becomes a two-entry list
  (s1-5-ambient-capture converged, decision-graph active) — verified nothing in
  `src/`, `test/`, or scripts parses this field before changing its shape
- + Purpose / Scope: "Effort: decision-graph (Phase 0)" subsections (in scope: ledger,
  projection, read-surface resolution; out of scope: Phases A–C pending gate verdict +
  wish-log evidence, vault-written ids, fuzzy matching, backfill)
- + SCN-008: a recorded ref survives a vault rename (exact-hash, single-candidate
  deterministic auto-bind; ledger append; read surfaces resolve through the binding)
- + SCN-009: an ambiguous disappearance is surfaced, never guessed (zero or multiple
  candidates → unresolved with candidates, nothing bound; human-confirmed bindings
  appended as `detected: confirmed`)
- + SR-036 exact-hash single-candidate auto-bind; + SR-037 ambiguous → unresolved,
  never auto-bound (constitution prohibition 8); + SR-038 confirmed-binding append;
  + SR-039 ledger location/schema/shape (`_librarian/note-identity.md`,
  `note-identity@1`, append-only, binding fields incl. `detected` provenance);
  + SR-040 SQLite identity projections rebuilt from vault + sidecar (refines INV-4);
  + SR-041 reindex determinism; + SR-042 read-surface resolution through bindings;
  + SR-043 unresolved refs render non-silently (constitution prohibition 8)
- + SR-104 (non-functional): identity-pass wall-time bound at reindex — the numeric
  bound is deliberately uncalibrated (no defensible figure exists in the decision-graph
  docs; TODO(flow-eval): calibrate at gen-1 from measured baseline rather than invent)
- + Traceability: two SCN rows + one SR-104 row appended; every mapping
  `mapping-pending (TODO flow-eval)`
- + Conformance tests: v3.8.0 mapping-pending paragraph appended
- + Glossary: "Note-identity ledger", "Identity binding", "Unresolved ref"

Constitution (`spec/constitution.md` v2.0.0 → v3.0.0, major per its own header policy;
HITL satisfied 2026-08-04 at flow-init):

- + amendments entry 3.0.0
- + section "Weight class & budgets — effort: decision-graph" (light; 150k/variant,
  500k/generation; s1-5-ambient-capture predates weight classes and is converged)
- + prohibition 8 (never auto-bind an ambiguous note-identity match)
- + prohibition 9 (decision-graph reads never count toward the SCN-004 gate metric)
- + escalation trigger 4 (decision-graph SR touching capture contract / server
  instructions → class-promotion review before dispatch)
- + escalation trigger 5 (Phases A–C gated on verdict + wish-log entry)
- ~ frontmatter: version, last-amended, `effort:` list shape matching the spec

Versioning note: the v2.0.0 precedent coupled a constitution amendment to a spec MAJOR
bump. Here the two documents version independently — spec 3.8.0 stays minor because no
existing SCN/SR/INV semantics changed, while the constitution takes its own major bump —
per the operator's explicit pre-resolved direction (2026-08-04).

## Deliberately NOT changed

- `SERVER_INSTRUCTIONS`, the capture contract, README's quoted block (SR-027,
  COR-R-030), and the instruction-anchor tests (`adoption.test.ts`, `clarity.test.ts`)
  — Phase 0 changes no instructions and no capture behavior.
- `session-record@1`, capture idempotence identity (SR-013/SR-018/SR-024), read-path
  grouping (SR-030..032), instrumentation (SCN-004).
- Stored session records: no retrofit, no rewrite — resolution is read-time and
  ledger-mediated only.
- `evals/` — owned by flow-eval; every new mapping is a TODO, not an edit.
- Desirability-gate clock NOT restarted (verdict stays ~2026-08-09); prohibition 9
  keeps the new read paths out of the gate arithmetic entirely.

## Effects

- flow-generate for decision-graph gen-1 is BLOCKED until flow-eval clears the
  `mapping-pending` state for SCN-008/SCN-009/SR-036..043/SR-104 (and calibrates
  SR-104's number at gen-1).
- Expected exit evidence at ship (from the plan): the two currently-dead refs in the
  live vault either bind (`detected: exact-hash`) or render as flagged-unresolved with
  candidates; reindex twice with no vault change yields identical projections.
- Phase 0 fits the single-variant hotfix pipeline (precedent: ship-2026-07-25-0002),
  weight class light per constitution v3.0.0.
