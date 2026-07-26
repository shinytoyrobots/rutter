# constraint-bias: maintainability-lineage (gen-3 / var-1)

**Assigned bias:** maintainability, specifically *continuing the shipped var-3 lineage* —
fine-grained single-purpose modules, one write choke point (`fs-safe.ts`), typed frontmatter
as source of truth with a regenerated body view, comments that state constraints and cite
SR/INV ids.

**Consequential choices under that bias:**

1. **A new module instead of a fatter `capture.ts`.** All provenance mechanism — the upward
   `.git` walk, gitdir-redirect (`.git`-as-file) handling, `commondir` fallback, the minimal
   INI read, length bounds — lives in `src/workspace.ts`. `capture.ts` gained one payload
   field, one call and two comments. The bound on a stored provenance value is defined in
   `workspace.ts` rather than `config.ts` (cohesion over convention, and one fewer file in
   the change set); noted as a deliberate deviation from `maxSummaryChars`'s home.
2. **Schema ownership follows the existing pattern.** `WorkspaceSchema` lives beside its
   derivation and is imported by `session-record.ts`, mirroring how `refs.ts` owns
   `RefSchema`. `SCHEMA_ID` stays `session-record@1` and now carries a comment explaining
   *why* additive-optional does not bump it — the next reader's most likely question.
3. **Both recall surfaces updated together.** `librarian-recent` (MCP) and `npm run recent`
   (inspector) display and filter identically; letting them diverge is the drift this bias
   exists to prevent. Cost: a 7th `src/` file (dissent-0001's trigger is >= 8).

**Trade-offs the evaluator should know:**

- Provenance derivation is ~180 lines to record three strings. Under a simplicity bias this
  is `basename(cwd)` and nothing else. The extra surface buys subdirectory-stable project
  names, worktree/submodule support, and a repo identity that never spawns `git`.
- `formatRecentEntry` is now exported from `server.ts` purely for testability.
- `recent-cli.ts` keeps its pre-existing `console.log` (human inspector, not a stdio server
  path). A stricter reading of "no stdout in CLI paths" would change shipped UX; flagged
  rather than silently reversed.
- One spec ambiguity documented in `notes.md` (no defined failure mode for project
  derivation); resolved by omitting `workspace` entirely rather than storing a half-shape.
