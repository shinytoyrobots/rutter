---
version: "2.0.0"
status: active
effort: s1-5-ambient-capture
last-amended: 2026-07-25
amendment-policy: every edit is a MAJOR version increment and requires HITL
amendments:
  - "2.0.0 (2026-07-25, HITL-approved at flow-init): eval-dimension override — accessibility replaced by documentation"
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

## Escalation triggers (HITL required)

1. **Any spec change touching capture or appraisal semantics** → route to
   preference-articulator HITL before writing. These are the load-bearing,
   still-open parts of the design.
2. **Desirability-gate verdict at the 2-week mark** → HITL decision: proceed to H2/H3
   per the wish log, or stop the product here. This verdict is not automatable.
3. **Any edit to this constitution** → HITL, major version increment (see header).
