---
version: "4.0.0"
status: active
effort:
  - s1-5-ambient-capture   # converged
  - decision-graph         # active (v3.0.0 —)
last-amended: 2026-08-04
amendment-policy: every edit is a MAJOR version increment and requires HITL
amendments:
  - "2.0.0 (2026-07-25, HITL-approved at flow-init): eval-dimension override — accessibility replaced by documentation"
  - "3.0.0 (2026-08-04, HITL-approved at flow-init decision-graph): effort-scoped weight class + budgets; prohibitions 8-9; escalation triggers 4-5"
  - "4.0.0 (2026-08-04, HITL-approved at gen-2 dispatch, escalation trigger 3): decision-graph light-class budgets recalibrated 150k/500k -> 200k/700k from gen-1 actuals (variants ran ~190-218k vs 150k; generation ran ~1.28M vs 500k incl. panel+cull). 700k covers a 2-variant refinement honestly; it does NOT cover a light N=3 full-envelope generation — revisit the generation figure at the next full-envelope dispatch with two generations of actuals"
---

# Constitution: my-librarian

The constitution binds all phases (S1.5 → H2 → H3 → generalized), not just the current
slice. Any edit to this document is **always a major version increment** and **always
requires HITL**. Escalation triggers below may not be softened without explicit user
direction.

## Prohibitions (hard constraints — never generate code that violates these)

1. **No LLM in the server.** The server contains no model inference; the client is the
   brain. Reasoning and summary generation are the connected client's. *(→ INV-6)*
2. **Local-first / no egress.** No network calls. Nothing leaves the machine — all
   capture, storage, and retrieval use only the local filesystem. *(→ INV-1)*
3. **Never hard-delete memory-of-use.** Session records (and all future memory-of-use)
   are appended, archived, or invalidated — never destroyed. *(→ INV-3)*
4. **Never write to stdout under stdio transport.** Only MCP protocol frames on stdout;
   all diagnostics to stderr (stdout writes corrupt the protocol). *(→ INV-5)*
5. **The librarian writes only to `_librarian/` and `data/`.** It never creates,
   modifies, or deletes store (vault) content. *(→ INV-2)*
6. **No vault or session content in the code repository.** Memory-of-use lives in the
   vault or its own overlay repo; the code repo holds code only.
7. **No stage ships without a docs pass.** Every development stage (each shipped spec
   version) updates the user-facing "how-to" documentation (`README.md` / `docs/`) to
   cover its new or changed behaviors before the stage is considered shipped.
   *(→ SR-103; added at HITL approval, 2026-07-25)*
8. **Never auto-bind an ambiguous note-identity match.** Exact-hash, single-candidate
   matches only; everything else is surfaced with candidates and bound only by human
   confirmation. *(→ SR-036, SR-037, SR-043; SCN-008/SCN-009; added v3.0.0,
   effort decision-graph)*
9. **Decision-graph reads never count toward the desirability gate.** Reads from
   tools or read-paths introduced by the decision-graph effort are never counted
   toward the SCN-004 desirability-gate metric (`stateful-use.jsonl`) unless the gate
   design itself is amended by HITL. *(added v3.0.0, effort decision-graph)*

## Preferences (defaults — deviate only with recorded rationale)

1. **`node:sqlite` over native-dependency alternatives** (e.g. `better-sqlite3`).
2. **mdbase-compatible sidecar frontmatter** — shape records so H2 mdbase adoption is a
   drop-in; do not adopt mdbase itself in S1.5.
3. **Quiet when unprompted, discursive on demand.** Enrichment and memory surface only
   when relevant; no nagging. Discursiveness is client-side, invited, never at-you.
4. **Additive spec changes over restructures.** Prefer new SCN/SR over modifying or
   reorganizing existing ones; restructures require HITL.
5. **Cheapest useful slice behind a kill gate** — do not gold-plate ahead of the
   desirability verdict.

## Eval & dispatch overrides

1. **Eval dimensions: `accessibility` is replaced by `documentation`.** Rationale: the
   librarian is a headless MCP server over stdio with no UI surface — WCAG conformance
   has nothing to measure. The `documentation` dimension (docs-currency grader,
   threshold 0.90, weight 0.10) gives SR-103 / prohibition 7 (docs pass at every
   shipped stage) a scored home. *(HITL-approved 2026-07-25; revisit if any UI surface
   is ever added — that re-adds `accessibility` and is itself a constitution amendment.)*

## Weight class & budgets — effort: decision-graph

*(added v3.0.0; s1-5-ambient-capture predates weight classes and is converged — no
class is assigned to it retroactively)*

- **weight-class: light.** Rationale: small additive gen-1 scope (~6 SRs), no
  security-bearing surface, append-only reversibility, personal tool.
- **token-budget-per-variant: 200000**
- **token-budget-per-generation: 700000**
- *(v4.0.0 recalibration from gen-1 actuals — see amendments list. The per-variant
  figure is a ceiling; dispatch may set a tighter in-prompt working budget for
  refinement runs.)*

## Escalation triggers (HITL required)

1. **Any spec change touching capture or appraisal semantics** → route to
   preference-articulator HITL before writing. These are the load-bearing,
   still-open parts of the design.
2. **Desirability-gate verdict at the 2-week mark** → HITL decision: proceed to H2/H3
   per the wish log, or stop the product here. This verdict is not automatable.
3. **Any edit to this constitution** → HITL, major version increment (see header).
4. **Any decision-graph SR entering scope that touches the capture contract or server
   instructions** (Phases A–C territory) → HITL class-promotion review
   (light → standard) BEFORE dispatch; never silent. *(added v3.0.0)*
5. **Phases A–C of `docs/decision-graph-plan.md` may not enter spec scope** before the
   desirability-gate verdict (escalation trigger 2) is written AND the operator's
   wish-log entry recording demand exists. *(added v3.0.0)*
