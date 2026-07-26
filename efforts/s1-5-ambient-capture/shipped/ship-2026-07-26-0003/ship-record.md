# Ship record — ship-2026-07-26-0003

**Effort:** s1-5-ambient-capture · **Spec:** v3.1.0 · **Suite:** 0.4.0 · **Type:** FULL ship (convergence above threshold)
**Shipped variant:** gen-3/var-1 (maintainability-lineage) @ `c0cc3c7` + pre-ship hardening commit, merged to `feat/workspace-provenance` → PR → `main`.
**HITL:** ship approved 2026-07-26 as "micro-harden first, then ship" + "commit, push, PR and merge".

## What shipped

- **SCN-005 workspace provenance:** every captured session entry now records `workspace: {cwd, project, repo?}`, all auto-derived (project = git work-tree root basename, fallback cwd basename; repo = `[remote "origin"]` url read from `.git/config` by pure file reads — no subprocess, no network). Additive-optional on `session-record@1`; pre-existing records untouched and valid; SR-013 dedupe identity unchanged.
- **SCN-006 client adoption guidance:** the server declares MCP server-level `instructions` (verified over a real initialize handshake) directing clients to `librarian-recent` for recency questions and `librarian-search` for prior-engagement/content questions before reading files. `librarian-recent` displays `[project]` per provenance-carrying entry and accepts a case-insensitive, NFC-normalized, exact-whole-name `project` filter; provenance-less entries are excluded from filtered results, never fabricated into matches. Server 0.2.0 → 0.3.0.

## Pre-ship hardening (HITL deviation from ship-what-was-culled, both named by chavruta)

1. **dissent-2026-07-26-0003 mitigated:** gitdir-redirect/commondir targets are followed only when git-metadata-shaped (`isGitShaped` — a `.git` path segment). Crafted `.git` files pointing at arbitrary directories are refused; the real worktree shape still resolves. Adversarial tests added (credential-bearing loot config never read/recorded).
2. **NFC normalization in project matching:** NFD-spelled filters (macOS paths, IMEs) match NFC-stored names; accent-stripped names correctly do NOT match.

## Verification

- Post-merge on `feat/workspace-provenance`: build + typecheck clean, **69/69 tests** (49 base + 17 var-1 + 3 hardening).
- Cull: 3 independent adversarial-depth evaluators; var-1 first front by strict domination ex-cost; 0 variant-attributable invariant failures; Goodhart none. See `generations/gen-3/summary.md`.
- Chavruta: NON-BLOCKING; dissents 0003 (mitigated pre-ship) and 0004 (active) raised; 0001/0002 checked, not reactivated. See `generations/gen-3/chavruta-checkpoint.md`.

## Rollout

Ring-0 only (single-user tool). Hook + CLAUDE.md rule already installed from ship-0001/0002; new behavior is live from the first Stop firing after `main` is rebuilt (`npm run build`). No user action needed beyond rebuild.

## Desirability gate — CLOCK RESTARTED

Per HITL 2026-07-26: the 2-week gate starts at this ship. **Verdict ~2026-08-09, mandatory HITL** (`npm run gate` ≥3×/week unprompted + wish-log judgment → H2/H3/stop). A negative verdict reactivates dissent-0001. NOTE (dissent-0004 sentinel): this is the SECOND clock restart; a fourth restart without a verdict ever being rendered escalates the gate's design itself to HITL.

## Rollback

`git revert -m 1 <merge-sha on main>` (records already captured with `workspace` remain valid under the schema — the field is optional in both directions).

## Deferred / watch (carried forward)

- Cost budget recalibration (~250k) — dissent-0001 cond #2, dissent-0004; THIRD generation unmet. Do before gen-4, if any.
- INV-4 grader defect: corruption-recovery task reported passing in gen-2 but fails at base — flow-eval must fix the grader and decide whether rebuild-over-corruption becomes a spec requirement.
- Concurrent distinct-directive lost-update (measured 3/6); O(all-records) dedupe on the per-turn hot path; un-canonicalized ref keys silently missing enrichment; security-adv dataset saturated (6 discriminating vectors recorded by gen-3 evaluators).
- `repo`/`cwd` recorded but not yet rendered by `librarian-recent` (display surface earns nothing yet) — wish-log candidate.
