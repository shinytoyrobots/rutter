# HANDOFF — my-librarian

**Last updated:** 2026-08-05
**Purpose:** Single resume-point after a context clear or model switch. Self-contained: everything needed to continue the build without re-reading the whole history. Written for a fresh model/context.

> **Read §2.0 first.** The 2026-08-05 session ran a full flow effort (decision-graph Phase 0: durable note identity) end-to-end — spec → evals → two generations → cull → converge → chavruta → metastable ship — plus a same-day production defect fix and a docs promotion. Everything sits on **PR #17, OPEN and awaiting Robin's merge**. §2.1 covers 2026-08-04; everything below that is history.

## 2.0 Session of 2026-08-05 — note identity shipped, dogfood bit back same day

**Spec v3.10.2 · suite 0.8.0 · constitution v4.0.0 · PR #17 open at `b873aae` on `ship/decision-graph-phase-0`. 116 tests + tsc clean. Merge with a MERGE COMMIT, never squash — the flow ship SHAs (993a89d, dfa3811) and generation lineage must stay reachable from main.**

**What shipped (effort decision-graph, Phase 0):** recorded refs survive vault renames. Exact-hash auto-binding (SR-036); ambiguity surfaced with candidates, never guessed (SR-037, prohibition 8); confirmation via CLI only, never MCP (SR-044 — a model must not be able to confirm bindings; this applies to assistants too: hand Robin the command, never run it); append-only `note-identity@1` ledger at `_librarian/note-identity.md` (SR-039); strict (path,hash) keying, newest-wins for automatic only (SR-045); **confirmed bindings are sticky, conflicts render as "confirmed X; the hash now matches Y" (SR-046** — born from a gen-1 population fork, HITL-resolved). Projections stay disposable (drop `data/librarian.db`, reindex).

**The flow trail (audit register: `efforts/decision-graph/flow-state.yaml` phase-log):** gen-1 3×sonnet (interpretation panel first → spec v3.9.0), cull found SR-046 fork + var-2's byte-append defect; gen-2 refined both survivors (suite 0.7.0 holdouts authored FIRST — flow-generate halted on SR-046's missing mapping, HITL chose eval-first); cull: var-3-reversibility first fully-conformant variant, its byte-test found and fixed a real shared-ancestor serializer defect; converge 0.846 → metastable ship, chavruta 2 NON-BLOCKING dissents, both mitigated pre-ship (M1 schema-drift guard, M2 docs). Constitution v4.0.0 recalibrated light budgets 150k/500k → 200k/700k from actuals (Rule 5 fired at dispatch).

**Day-one production finding (the session's best moment):** first live reindex reported 31 dead refs — **27 were false**: refs to existing non-note files (`.gitignore`, `_librarian/*`, `.html`/`.yaml`), mislabeled because dead-ref detection resolved paths against the md-notes index, not the disk. Every variant, both generations, the panel, the ledgers, AND the eval suite (all-markdown fixtures) shared the blind spot — only production caught it. Fix-now-same-PR (HITL): spec v3.10.2 patch (resolution = confined disk existence, any file type), suite 0.8.0 (+COR-R-038 incident-derived, +COR-A-021 over-correction holdout), fix @ dfa3811, independently re-scored ALL GREEN. Live proof: 31 → 4 records / 2 genuine paths. Lesson recorded in GOODHART.md: fixture diversity (file types, dotfiles, sidecars) is now a standing authoring consideration.

**Docs promoted:** `docs/getting-started.md` (zero-to-first-recall tutorial; tw-generate pipeline: research → draft → 34/34 verification → revision → operator edits; archival copy in vault at `Notes/Reference/Tech-Writer/generate/2026-08/05-zero-to-first-recall/`). Same commit retired the stale pre-v3.4.0 CLAUDE.md guidance from `docs/memory-of-use.md` + `docs/overview.md` and added `--scope user` to README's registration example.

**Open, in priority order:**
1. **Merge PR #17** (merge commit). Then reconnect the MCP client (`/mcp` → reconnect; stdio server, no daemon).
2. **Repair the two real unresolved refs** — the kung-fu draft moved+renamed to published state (Robin's identification). Robin runs (never the assistant — SR-044):
   `npm run identity-confirm -- "Non-Fiction/Drafts/I know kung fu. I might remember how to throw one punch..md" "Non-Fiction/Field Notes/2026-08-02 - I know kung fu. I might remember how to throw one punch..md"` and the same for `"Notes/Reference/Field Notes drafts/2026-07-31-i-know-kung-fu-first-draft.md"`, then `npm run reindex`. NOTE: these are the ledger's FIRST entries — from then on `_librarian/` holds the only copy of confirmed bindings (dissent-0002's armed probe; vault backup covers it). Afterwards: flip `dissent-2026-08-05-0001` from `reactivated` back to `active` in `efforts/decision-graph/dissents-active.yaml` (its firing condition — zero-candidate rows ≥1 — clears).
3. **Desirability-gate verdict ~2026-08-09** (mandatory HITL, carried from §2.1 incl. the falsifiability fix it demands). New wrinkle: constitution prohibition 9 — identity-introduced reads never count toward the gate metric. Phases A–C of `docs/decision-graph-plan.md` stay spec-locked until the verdict (escalation trigger 5).
4. **SR-104 calibration patch:** instrument the NAMED span (dead-ref detection + exact-hash + projection rebuild) on the shipped code, then patch the bound. Live data exists: 118ms/147ms at 2,428 notes. Chavruta explicitly rejected pinning to full-reindex (5× headroom = unfalsifiable). Harness entry stays `mapping-pending: calibration`.
5. **flow-eval backlog: 9 items** (gen-2/summary.md §Suite gaps + fix1 ledger audit D-4 edited-in-place MEDIUM / D-5 renamed-non-note; SR-024..035 backfill; cost-grader formula write-down; confirm-target validation; zero-candidate-enrichment task — which doubles as dissent-0001's resolve trigger).
6. **Spend calibration for next dispatch:** evaluators run ~245k each at quick+targeted-adversarial (not 180k); in-prompt token budgets are confirmed advisory two generations running (agents cannot see their own spend). Gen-2 total: 852,962 observed vs 700k budget.
7. **Publish checklist** (carried from §2.1): still gated on the gate verdict; the fresh-clone-as-a-stranger test now has a written path — `docs/getting-started.md` IS the script, run it on a clean machine.
8. Housekeeping, non-blocking: ~20 stale worktrees under `.claude/worktrees/` (s1-5 + dg generations); prune after PR #17 merges.

**Mechanics a fresh session must not rediscover:**
- `src/identity.ts` contains ONE deliberate NUL byte (composite-key separator in `distinctRefs`) — `git grep` reports the file as binary; use `grep -a`.
- `efforts/` split: `dissents-active.yaml` + `shipped/` are committed; `flow-state.yaml` + `generations/` are gitignored working artifacts.
- The dissent registry has 2 entries with mechanically-testable reactivation probes (`shipped/ship-2026-08-05-0001/post-ship-eval/config.md` lists them). dissent-0001 is in `reactivated` until item 2 above completes.
- M1 means an additive-optional field on the identity schema now THROWS at the serializer until `CANONICAL_BINDING_FIELDS` is updated with it — that is fail-closed by design, not a bug.

---

## 1. What this is (the thesis, in one breath)

A **personal, persistent memory-of-use layer** for LLM conversation, built as an MCP server over a markdown knowledge base (Obsidian vault today). Modelled on the *Snow Crash* Librarian: an always-on companion that **remembers across time and thinks alongside you** — the one thing a stateless assistant cannot be.

**Critical framing (do not lose this):**
- **Retrieval is NOT the product.** Robin's incumbent — Claude Code reading his `obs-`-organized vault — already retrieves well. Building a better search box loses. The differentiator is **persistent memory that accrues by itself and surfaces the right thing later.**
- **The server holds state; the client is the brain.** The MCP server contains *no LLM*. It is code + storage. All reasoning/"discursiveness" is the connected client (Claude, later ChatGPT). This split is what keeps it portable across clients — keep it.
- **Stance: "weighs openly, attributably, reversibly — never silently."** When beliefs conflict/change, show both with provenance + a reversible mark; never auto-pick. (Refined from "never adjudicates" via the Library-of-Alexandria collision — the obelus/asteriskos marginal-marks idea.)
- **Memory-of-use vs. store (this session's key advance).** The *knowledge store* (content) can be shared; the *memory-of-use* (how **I** engaged it — what I read, concluded, how my beliefs evolved) is inherently personal. The product is the memory-of-use. This means: never build "shared memory"; build **per-person memory-of-use that overlays a store (shared or not).** Multi-user = one shared store + N personal overlays. The personal single-user build is the *architecturally correct unit*, not just the MVP.

## 2.1 Session of 2026-08-04 — five ships, and a change of purpose

**Spec v3.7.0. `main` @ PR #15 merged, clean tree, `dist` rebuilt, 94 tests + tsc + Vale all clean. No CI exists — the local suite is the only gate, so run `npm test` before merging anything.**

**The decision that reframes the project:** publish this repo as a **dated open-source artifact — a reference implementation, explicitly not a supported product.** Reasoning came from a `/inv-opportunity-scan` (vault: `Notes/Reference/Invention-Skills/opportunity-scan/2026-08/03-agent-session-decision-memory/`): the *problem* is real (~18 independent hand-rolled fixes, no winner), but the *space is crowded* — Recall, Kage, Memoir, twiceshy, mcp-memory-service all ship adjacent things, and Claude Code itself now does session recaps, auto-memory and consolidation. What is **not** claimed anywhere is the combination this has: content-hashed refs that make drift visible, append-only-never-rewritten with read-time grouping, and author-curated capture with no model in the server. Lead with that, never with "a memory MCP server". A separate strategic finding: the venture-shaped version of this is org-scale decision provenance, which is the same thesis as Robin's Knapsack work — treat any commercial move as gated on that conflict, not as a technical question.

**Shipped today, in order:**
1. **PR #11 — spec v3.6.0, summary word budget.** Step counts were flat (7–40/day) while mean summary length tripled: 37–61 words/step in the first fortnight → 141/142/192 on 08-02/03/04. SR-021 said "one line, not a build log" — true but *unnumbered*, so unfalsifiable. Now states 40 target / 60 ceiling from `config.summaryWordTarget`/`summaryWordCeiling`; `+SR-034` makes `capture-cli` report overage on stderr and store verbatim anyway. **Truncating, rejecting, and annotating the record are all forbidden** (SR-023, INV-6, COR-R-027) — do not "fix" length by mutating a record.
2. **PR #12 — README for publication + MIT `LICENSE`.** Also fixed a real first-run trap: Setup told a reader to reindex before ever mentioning `LIBRARIAN_VAULT_PATH`, and `walkMarkdown` swallows an unreadable directory, so a stranger got a silent zero-note "success".
3. **PR #13 — `LIBRARIAN_USER_LABEL`, default `the user`.** The instructions and tool descriptions said "Robin's work" to every connected client. Now interpolated. Two guards: a handshake test (default install names nobody) and a source test (`server.ts` holds no literal name) — the handshake test alone only sees the surfaces it asks for.
4. **PR #14 — voice guide applied** (`~/Documents/knowledge-vault/Non-Fiction/Professional voice and tone guide.md`). Docs were already clean of the guide's AI-tell vocabulary; the gaps were structural — bullets carrying the argument, `drift`/`receipts` unused in a tool about exactly those, no compressed closer. **Reference sections stay terse on purpose** — the guide's register map prescribes that; don't prose-ify the config table or install steps.
5. **PR #15 — spec v3.7.0, per-outcome emission trigger.** *The important one.* The contract contradicted itself: SR-025 said "at the end of a session … exactly one directive" while SR-033 and SR-021 assumed several as you go. Real capture averages **3.2 entries per session, never 1.0 on any day**, and SCN-001 was always titled "exactly once per distinct directive". This is very likely the **cause** of the length creep #11 treated — a client told it gets one line at the end packs the session into it. SR-025 amended to per-outcome; `+SR-035` forbids the instructions ever implying one-per-session or end-of-session again; `COR-R-034` guards it over both the instructions and the README's quoted copy (mutation-checked, not just green).

**Two mechanics a fresh session must not rediscover:**
- **The README's quoted capture-contract block is byte-compared to `SERVER_INSTRUCTIONS`** (`SR-027`, `COR-R-030`). PR #15 was the first change to touch it — it is **regenerated programmatically** from source, never hand-edited. The compared slice runs from the trigger sentence to just before "When you report recalled summaries back", so anything outside that range is README-only.
- **Three tests anchor on literal instruction phrases** (`adoption.test.ts` ×2, `clarity.test.ts` `authoringSection()`). Rewording the instructions breaks them by design; move the anchors deliberately.

**Open, in priority order:**
1. **The desirability gate verdict, ~2026-08-09 — the only date-driven item, mandatory HITL.** *It is currently unfalsifiable and must be fixed first:* 10 of 11 logged calls are `librarian-recent`, and since SR-020 the server instructions tell every client to prefer these tools — so `stateful-use.jsonl` cannot distinguish Robin reaching for it from a model calling it because it was told to. **Add a model-initiated vs human-initiated field to SCN-004 instrumentation before writing the verdict**, or the number means nothing. Judge the verdict against **memory-of-use** — what the tool actually became, and what `HANDOFF.md` §1 already calls the thesis — not against H2 belief-lifecycle. The wish log stopped 07-27 with six entries and **not one asks for belief-lifecycle**; all six were capture/recall plumbing. Do not start H2 on inference alone.
2. **Read-value signal.** Nothing records whether a recall was *used*, only that it happened — so "the record has gone write-only", the exact disease this tool exists to cure, is currently undetectable.
3. **Watch the v3.7.0 prediction.** Entries-per-session should rise above 3.2 and mean length fall toward 40 words. `_librarian/sessions/` answers this with no new instrumentation; if it doesn't move, the trigger fix didn't take.
4. **Publish checklist remainder:** drop `"private": true` from `package.json`; flip repo visibility to public; **fresh-clone test as a stranger** (new directory, throwaway notes dir, real sessions, records land with no dotfile edit — the one thing that would embarrass publicly); tag `v0.1.0`. `LICENSE` and README framing are done. Publish **before** anything derived from the 2026-07-28 `decision-record-capture` morph ships at Knapsack — that morph is `mode: work`, studied this codebase, and publishing first makes the prior art shown-by-timeline rather than argued.
5. `docs/roadmap.md` holds the phased plan (Phase 0 close the gate → Phase 1 discipline + read-value → Phase 2 publish → Phase 3 next pillar from observed use → Phase 4 org scale as watch item only). It is a **proposal**; `spec/spec.md` remains the executable source of truth.

**Loose ends at 2026-08-04 close:**
- **Robin is re-registering the MCP server himself** to pick up `LIBRARIAN_USER_LABEL=Robin` and the v3.7.0 instructions. Until he does, his own client reads "the user's work" and the old per-session trigger. Do not run `claude mcp` commands for him.
- **Vault has uncommitted `_librarian/` working-tree edits** — session records plus wish-log SHIPPED annotations added today for the two entries closed at v3.4.0/v3.5.0 (never annotated at the time) and completed today. **Do not commit the vault** (see §9).
- `§3` below still lists the S1-only file layout; the current layout is in `README.md`. `§6`/`§8` predate S1.5 shipping and read as history now.

## 2. Current status

- **S1 walking skeleton: BUILT, VERIFIED, PUSHED, REGISTERED.**
  - Repo: `~/Development/personal/my-librarian` → **https://github.com/shinytoyrobots/my-librarian** (PRIVATE), branch `main`, origin via SSH. Committer: `Robin Cannon <robin@shinytoyrobots.com>`.
  - Does: full-text search over the vault (node:sqlite FTS5) + two read-only MCP tools. No memory yet.
  - Verified against the real vault: **2,298 notes indexed in ~1s**; search returns provenance-tagged, snippet-highlighted results; MCP protocol smoke-tested over stdio (both tools register with `readOnlyHint`).
  - **Registered into Claude Code** — `librarian-search` and `librarian-get-note` are live as `mcp__my-librarian__*` tools.
- **Docs are in sync:** HANDOFF.md and DESIGN.md are committed (`9388700`, PR #1); the memory-of-use framing, ambient-capture S1.5 revision, elevated thesis, and ks-kb/mdbase positioning are all folded into DESIGN.md.
- **S1.5 spec: AUTHORED, APPROVED, FLOW-INITIALIZED.** Executable spec **v2.0.0** at `spec/spec.md` (4 SCN, 16 SR, 6 INV @ threshold 1.0) + `spec/constitution.md` v2.0.0 (7 prohibitions incl. docs-pass-at-every-stage; eval override: `accessibility` dimension replaced by `documentation` — headless server, no UI). Effort `s1-5-ambient-capture` (`flow.yaml`, `efforts/`), HITL-approved 2026-07-25. `flow-init` completion run done: canonical 6-dimension harness, placeholder grader specs (`evals/graders/`), empty datasets, `.flow-index/` codebase index, temperature 0.5.
- **Eval suite: BOOTSTRAPPED (suite 0.2.0, spec v2.0.1, `mapping-pending` cleared).** 86 tasks / 19 datasets (one per acceptance criterion; correctness + security + all six invariants adversarially paired — `evals/GOODHART.md` records the accepted real-only gap for perf/maint/docs with close-triggers). Six INV graders `ready` @ threshold 1.0 (hard-cull); the six dimension graders stay `placeholder` because their **runner scripts are built with the gen-1 implementation** (recorded in `harness.yaml` `runners:` block).
- **Gen-1: COMPLETE (5/5 variants, 0 failed).** Scaffolding committed on branch `s1.5-spec` @ `f26b3aa` (local only, not pushed). Five full S1.5 implementations on isolated worktree branches (SHAs + self-checks in `efforts/s1-5-ambient-capture/generations/gen-1/population/var-*/notes.md`): simplicity 45t, performance 37t + all benchmarks 1.00, maintainability 46t, security 52t, convention 37t. Isolation verified — no variant commit reachable from `s1.5-spec`/`main`. All five converged on the same Stop-hook answer (client-authored sentinel line, hook extracts deterministically — INV-6-safe, resolving the §8 spike); real forks recorded for cull/chavruta: stateful-log location (4-1 `_librarian/` vs `data/`), 3 session-record shapes, timezone + window-default choices.
- **Gen-1 CULLED.** 0 invariant failures (30/30). First Pareto front = **var-1 (simplicity, 0.908), var-2 (performance, 0.899), var-3 (maintainability, 0.899)** — all three metastable candidates; **var-3 strongest** (stability 1.0, spec-proximity 1.0, best maint 0.99). var-4/var-5 dominated → `superseded/` (var-5 on a within-noise 0.01 judge delta, flagged). Full matrix + carry-forward forks in `generations/gen-1/summary.md`. Eval-suite findings queued for flow-eval: cost budget miscalibrated (all 5 fail it), latent SR-100 multi-entry-day staleness ungraded, enrichment O(records) scaling watch. Temp 0.4, convergence 0.65 rising.
- **CONVERGE DECIDED: metastable ship of var-3, HITL-approved 2026-07-25.** Convergence 0.584 (gen-1 structural stability cap; shipped via metastable criteria — stability 1.0, 0 deferred SRs). Chavruta NON-BLOCKING; **2 active dissents** in `dissents-active.yaml` (0001 velocity ship-var-1-instead; 0002 stability record-format commitment) with concrete reactivation conditions incl. the 2026-08-08 gate verdict. Chavruta correction: var-3's enrichment is also O(records)/search — on the scaling watch list. Full rationale: `generations/gen-1/convergence-decision.md`.
- **S1.5 SHIPPED — `ship-2026-07-25-0001`.** var-3 merged to `s1.5-spec` @ `dd58d14` (LOCAL, not pushed). Post-merge verified: build+tsc clean, 46/46 tests, real vault reindexes (2,306 notes/1.1s). Ship record, rollout plan (ring-0 only), post-ship eval config, and comms live under `efforts/s1-5-ambient-capture/shipped/ship-2026-07-25-0001/`. Rollback: `git revert -m 1 dd58d14`.
- **MERGED TO MAIN (`bca845d`, PRs #2 + #3).** Stop hook installed in `~/.claude/settings.json` (pipe-tested), directive rule added to global `~/.claude/CLAUDE.md`, docs aligned (README 3-step capture setup). **Capture is LIVE — first real record landed in `<vault>/_librarian/sessions/2026-07-26.md`.**
- **POST-SHIP FINDING → FIXED SAME DAY (ship-2026-07-25-0002, FULL ship, convergence 0.92).** Stop fires per-turn (not per-session) → duplicate capture entries. Pipeline ran end-to-end inside day one: spec v3.0.0 (SCN-001 idempotent-per-distinct-directive, SR-013/014, suite 0.3.0) → gen-2 hotfix (security bias, 3-file diff) → adversarial cull (13/13 synthesis probes, INV-3 proven by byte-compare) → converge 0.92 → shipped @ `cb7cfee` on `hotfix/capture-idempotence`. Real-vault duplicates (6) cleaned; effort status: **converged**.
- **ALL MERGED:** `main` @ `c6a0bd6` (PR #4 = spec v3.0.0 + hotfix + ship records), rebuilt, 49/49 on main. Hook + global-CLAUDE.md directive rule installed and live; first genuine session record in `<vault>/_librarian/sessions/`; `npm run gate` correctly reads an empty baseline (events accrue only from server-path stateful use).
- **S1.5.1 SHIPPED — `ship-2026-07-26-0003` (spec v3.1.0, suite 0.4.0).** First real dogfooding session produced two wish-log findings (`<vault>/_librarian/wish-log.md`): records had no workspace provenance, and client tool-adoption lived in per-repo CLAUDE.md. Both spec'd (SCN-005/006, SR-015..020, HITL 2026-07-26), built as gen-3 (3 variants, adversarial cull, chavruta NON-BLOCKING), shipped as **var-1 + pre-ship micro-hardening** (HITL choice): every entry now records auto-derived `workspace {cwd, project, repo}` (additive-optional on `session-record@1`, dedupe identity unchanged); `librarian-recent` shows/filters by project (exact, case- + NFC-insensitive); the server ships MCP-level `instructions` (no client config anywhere); gitdir/commondir reads are contained to git-shaped targets. 69/69 tests. Dissents: 0003 mitigated pre-ship, 0004 active (cost-axis exclusion), 0001/0002 unreactivated.
- **S1.5.2 SHIPPED — `ship-2026-07-27-0004` (spec v3.2.0, suite 0.5.0, server 0.4.0).** Wish-log finding #3 (output clarity): session summaries were build-log-dense at recall time. Shipped as gen-4/var-1 (single-variant hotfix pipeline, adversarial cull 5/5 + 17/17 probes, 0 reactivations): a plain-language **style contract** for `librarian-session` summaries (later-reader framing, lead with outcome, common words over shorthand, expand session jargon) now travels in the server-level MCP instructions AND the global `~/.claude/CLAUDE.md` directive rule (deployment step done); **read-time guidance** tells clients to render recalled summaries — including pre-contract dense records — in plain language; **SR-023** makes byte-verbatim storage normative (server never rewrites/truncates/rejects on style). No record-schema change, no retrofit (HITL). 75/75 tests. **Gate clock NOT restarted** (HITL) — verdict stays ~2026-08-09; dissent-0004's restart sentinel does not advance. **MERGED TO MAIN (`d570967`, PR #8).** Carried forward: ST-1 (COR-R-027 fixture has ~90 chars headroom under the pre-existing 2000-char SR-101 cap — spec tension, flow-eval/H2), F-1 (docs say "byte-verbatim" without naming SR-101's inert-line transforms), OBS-1 (server instructions at 2093 chars — bloat watch).
- **NOT yet done:** (1) the 2-week desirability gate — **clock RESTARTED at this ship; verdict ~2026-08-09, mandatory HITL** (`npm run gate` ≥3×/week unprompted + wish-log judgment → H2/H3/stop; negative verdict REACTIVATES dissent-0001; a FOURTH clock restart without any verdict escalates the gate design itself — dissent-0004 sentinel); (2) flow-eval items: cost budget recalibration ~250k (3 gens unmet), **INV-4 grader defect** (reported a gen-2 pass it never measured — corrupt-DB kills startup with no recovery path at base), security-adv dataset saturated (6 discriminating vectors recorded); (3) watch: concurrent distinct-directive lost-update (3/6 measured), O(all-records) dedupe on the per-turn hot path, un-canonicalized ref keys silently miss enrichment, `repo`/`cwd` recorded but not yet rendered; (4) H2 vs H3 — the wish log decides, only after the gate passes.
- **Immediate next step:** nothing to build. Live with it; keep the wish log; weekly `npm run gate`.
- **Loose ends at 2026-07-27 session close:** (1) vault has uncommitted `_librarian/` working-tree changes (wish-log SHIPPED annotation for finding #3 + session records) awaiting Robin's manual Obsidian-flow commit/push — do NOT commit them for him (see vault rule below); (2) preserved branches: superseded gen-3 (`flow/gen-3/var-2-simplicity`, `var-3-security`), gen-4 `flow/gen-4/var-1-documentation`, agent worktrees under `.claude/worktrees/`; (3) `main` @ `d570967` (PR #8 merged), rebuilt on main, 75/75 — the registered stdio server serves v3.2.0 behavior (style contract + render guidance in instructions) from the next session connect.

## 3. How the code works (S1)

Stack: **TypeScript ESM, Node ≥22, `node:sqlite` (built-in — no native deps), gray-matter, Zod, `@modelcontextprotocol/sdk`. npm.**

```
src/
  config.ts      vault + db paths (resolved from module location, NOT cwd), ignore list
  vault.ts       markdown walk + frontmatter parse (gray-matter)
  db.ts          node:sqlite open + FTS5 schema (notes + notes_fts)
  indexer.ts     full reindex (vault -> cache); BEGIN/COMMIT txn
  search.ts      FTS5 query (AND-of-terms, BM25) + getNote; metadata filters
  embeddings.ts  STUB port (Ollama wired at H2 — throws if called)
  server.ts      MCP: registers librarian-search + librarian-get-note (readOnlyHint)
  stdio.ts       stdio entry (local Claude Code); logs to stderr only
  reindex.ts     `npm run reindex`
  search-cli.ts  `npm run search -- <query>`
```

Run: `npm install && npm run build && npm run reindex`. Then `npm run search -- <query>`.
Register: `claude mcp add my-librarian --scope user -- node <repo>/dist/stdio.js`.

## 4. Hard-won gotchas (do NOT rediscover these)

1. **`better-sqlite3` does NOT compile on Node 26** (no prebuilt binary; native build fails against new V8). We switched to **`node:sqlite`** (built-in, Node 22+, FTS5 included, zero native deps). Keep it.
2. **FTS5 auxiliary functions (`bm25()`, `snippet()`) require the real table name, not an alias.** `bm25(f)` fails with "no such column: f". Use `bm25(notes_fts)`.
3. **DB path must resolve from the module location, not `process.cwd()`.** Claude Code launches the server from an arbitrary directory; a cwd-relative path silently creates an empty index in the wrong place. `config.ts` uses `fileURLToPath(import.meta.url)` → project root. Keep it.
4. **YAML parses bare dates (`created: 2026-07-22`) into JS `Date` objects** at UTC midnight → ugly timezone-shifted strings. `vault.ts` `normalizeScalar()` coerces `Date` → `YYYY-MM-DD`. Keep it.
5. **FTS5 query builder** quotes each token and ANDs them (`toMatchQuery`), deliberately avoiding Obsidian's "blue man group → blue OR man OR group" failure. This is a feature Robin explicitly wanted.
6. **`.gitignore` excludes `data/` and `*.db`** — the SQLite index contains copies of note contents; keep it OUT of git even though the repo is private. No vault content in the repo.
7. **Stdio transport: never log to stdout** (corrupts MCP). Use `console.error`.

## 5. Key decisions & rationale (condensed ADRs)

- **Standalone server, not a module in `robin-mcp`.** Copy `robin-mcp`'s transport/OAuth/SQLite patterns as a *template*; don't graft onto the generic connector.
- **Local filesystem vault access, not GitHub API.** Faster, offline, local-first. (Robin works direct-from-vault on this Mac.)
- **Three storage layers:** vault (`*.md`, source of truth) / `_librarian/` sidecar (`*.md`, durable interpretive layer — facts, marks; git-committed) / SQLite (disposable, regenerable cache). **Rule: SQLite must always be rebuildable from vault + sidecar.**
- **Bitemporal facts in plain SQLite, no graph DB.** `valid_from/valid_to` + `tx_created/tx_expired`, invalidate-never-delete; recursive CTEs over a `note_links` table for associative expansion. (DDL is in `DESIGN.md` §2.1 and the architecture proposal ADR-3.)
- **Local embeddings via Ollama (`nomic-embed-text`) at H2**, brute-force cosine over ~2k vectors (no ANN index needed at this scale). Stubbed now.
- **Basic Memory: build fresh, do NOT fork** (AGPL-3.0 = one-way door; run a 2–4h spike as reference only).
- **mdbase (`callumalpass/mdbase`, MIT, TypeScript): NOT for S1; adopt at the memory layer.** It gives typed/validated collections, CEL queries, and wikilink/backlink extraction — useful for the *librarian-authored* sidecar, not for full-text search. **Split: raw messy vault → FTS5 (lenient); clean `_librarian/` sidecar → mdbase (typed).** Cheap move now: shape the sidecar frontmatter to be mdbase-compatible so adoption later is a drop-in. It's pre-1.0/"intentionally breaking" — don't bet bedrock on it yet.
- **Cross-client via git, not a hosted server.** ChatGPT reads the vault (incl. `_librarian/`) via GitHub → inherits the librarian's memory as a read-only snapshot, no hosting needed. Claude Code = live local server. Remote Claude.ai = the only case needing the (dormant) remote-HTTP+OAuth server → deferred indefinitely.

## 6. Roadmap & the immediate next build (S1.5)

**S1 (done)** → **S1.5 (next)** → H2 → H3 → generalized.

### S1.5 — memory-of-use capture (THE next build; it is the real desirability gate)
The point of S1.5 is the first behavior a stateless assistant *cannot* have. **REVISED design (important):** the original plan logged librarian *tool calls* (`retrieval_log`). That was rejected — it only captures deliberate searches, not how you actually work, so it isn't real memory. Replace it with **ambient capture**:

- **Cheapest useful mechanism:** a **Claude Code Stop hook** that, at the end of each session, has Claude write a one-line "what did this session decide/produce?" summary, appended to a log the librarian reads. Ambient (no proactivity from Robin), low-noise (one curated line/session, not the raw transcript), gives "what have I been working on lately" almost free.
- **Fuller mechanism (later):** ingest Claude Code's local session transcripts, extract topics/decisions with light appraisal.
- **Store it as memory-of-use** (per §1): personal records in `_librarian/` (own space), each **referencing store items by durable, versioned identity** (path + content-hash / git ref), so it can overlay a shared store and detect when the store changed under you.
- **New tools:** `librarian-recent` ("what was I working on?"), plus "have I seen this / what did I conclude before?" enrichment on search.
- **Desirability gate (the whole point):** Robin reaches for the *stateful* behavior unprompted **≥3×/week for 2 weeks**, measured against his Claude Code habit. If not → stop; it's cheap to find out.
- **Wish log:** during those 2 weeks, keep a running note of "what I wished it did." That — not any document — picks whether H2 (belief-lifecycle) or H3 (ingestion) comes next.

### H2 — belief-lifecycle (the differentiated core)
Bitemporal `facts` + `note_links` (SQLite projections of `_librarian/`). Capabilities: **Marginalia/Obelus** graded reversible conflict marks (`↻` superseded / `✻` corroborated / `†` disputed); **Pinakes tier** (forget→durable metadata stub, never hard delete); **GRADE-style reasoned confidence**; **stopping-rule conflict-surfacing** (surface at tightening thresholds, don't nag). Local embeddings arrive here. **Adopt mdbase for the sidecar records here.**

### H3 — ingestion
Conversation-as-acquisition (already partly the S1.5 ambient capture). Treat ingested content as untrusted (prompt-injection); human-confirm writes.

### Generalized (later; Robin bracketed this as later-stage)
Target shape ≈ **ks-kb** (`knapsack-labs/ks-kb`, a Knapsack internal KB): typed markdown + mdbase + Claude-maintained + multi-source ingestion + governance/appraisal + operation log. **But ks-kb is the *store/curation* half; it does NOT have the memory-of-use/belief-lifecycle half — that's our differentiator.** Generalized librarian = ks-kb-shaped store + memory-of-use layer, on mdbase, "Obsidian or otherwise." Target segment: power users / small teams with structured, growing markdown vaults who've outgrown search and feel the memory gap. Sell them memory, not search. Multi-user = shared store + per-user memory-of-use overlays.

## 7. The full artifact trail (the "why" behind everything)

All in `~/Documents/knowledge-vault/Notes/Reference/`:
- **Deep-Research/2026-07/22-personal-context-librarian-mcp/** — `research-output.md` (landscape + North-Star, incl. the amended "weighs openly" stance), `notes.md`, `brief.md`, `sources-index.md`.
- **Invention-Skills/** — `invent/…/22-personal-librarian-mcp/invent.md` (SIT concepts), `collide/…/22-clinical-research-alexandria/collide.md` (Alexandria/clinical bisociation — obelus marks, Pinakes tier), `idea-score/…/22-personal-librarian-concepts/idea-score.md`, `idea-ach/…/22-personal-librarian-product-shape/idea-ach.md` (retrieval-is-not-the-value proof), `validate-plan/…/22-personal-librarian/validate-plan.md` (+ Day-0 Validation Signals) and `architecture-proposal.md` (the ADRs, walking-skeleton spec, DDL).
- **Tech-Writer/generate/2026-07/25-librarian-overview/** — plain-English explanation.

In the repo: `README.md`, `docs/overview.md` (plain-English), `DESIGN.md` (storage & capabilities roadmap — current: includes the S1.5 ambient-capture revision, the memory-of-use framing, the elevated thesis, and the ks-kb/mdbase positioning).

## 8. Open questions / unresolved

- Exact Stop-hook mechanism in Claude Code (how to capture the one-line summary reliably) — needs a spike.
- What the memory-of-use record schema looks like concretely (make it mdbase-compatible).
- Appraisal is the hard, unsolved core — for the personal build it can be ambient/light; ks-kb shows that at higher stakes it reverts to governed human review.
- Whether to run the 2–4h Basic Memory spike before/while building S1.5 (benchmark semantic search vs Claude Code navigation on Robin's fuzzy queries).

## 9. Working norms (Robin's rules)

- Committer `Robin Cannon <robin@shinytoyrobots.com>`. Code goes through GitHub before any deploy; commit/push only when asked; branch off `main` for new work (don't commit S1.5 directly to main).
- Plan/design → write to a file, don't implement until told. American English. Keep CLAUDE.md files <40 lines.
- Vault access: read/write local `~/Documents/knowledge-vault/` directly. **The vault is git-hands-off: never branch, commit, or push there** (even scoped to `_librarian/`) — Robin runs everything through Obsidian and commits/pushes manually. Leave vault changes as working-tree edits and say what changed. (Branch/PR/merge workflow applies to code repos only.)
- Keep this HANDOFF.md updated as the single resume-point; refresh it at the end of significant sessions.
- **At every ship: annotate the wish log.** Check `<vault>/_librarian/wish-log.md` for entries the ship addresses and append a one-line `STATUS: SHIPPED <date> (<spec/ship id>)` above each — append-only, never edit the wish text (it is gate evidence), one line max (it is not a changelog), and note any residual gap as a pointer to a possible new wish. Client/human judgment only — the server never writes this file.
