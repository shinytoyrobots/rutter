# HANDOFF — my-librarian

**Last updated:** 2026-07-25
**Purpose:** Single resume-point after a context clear or model switch. Self-contained: everything needed to continue the build without re-reading the whole history. Written for a fresh model/context.

---

## 1. What this is (the thesis, in one breath)

A **personal, persistent memory-of-use layer** for LLM conversation, built as an MCP server over a markdown knowledge base (Obsidian vault today). Modelled on the *Snow Crash* Librarian: an always-on companion that **remembers across time and thinks alongside you** — the one thing a stateless assistant cannot be.

**Critical framing (do not lose this):**
- **Retrieval is NOT the product.** Robin's incumbent — Claude Code reading his `obs-`-organized vault — already retrieves well. Building a better search box loses. The differentiator is **persistent memory that accrues by itself and surfaces the right thing later.**
- **The server holds state; the client is the brain.** The MCP server contains *no LLM*. It is code + storage. All reasoning/"discursiveness" is the connected client (Claude, later ChatGPT). This split is what keeps it portable across clients — keep it.
- **Stance: "weighs openly, attributably, reversibly — never silently."** When beliefs conflict/change, show both with provenance + a reversible mark; never auto-pick. (Refined from "never adjudicates" via the Library-of-Alexandria collision — the obelus/asteriskos marginal-marks idea.)
- **Memory-of-use vs. store (this session's key advance).** The *knowledge store* (content) can be shared; the *memory-of-use* (how **I** engaged it — what I read, concluded, how my beliefs evolved) is inherently personal. The product is the memory-of-use. This means: never build "shared memory"; build **per-person memory-of-use that overlays a store (shared or not).** Multi-user = one shared store + N personal overlays. The personal single-user build is the *architecturally correct unit*, not just the MVP.

## 2. Current status

- **S1 walking skeleton: BUILT, VERIFIED, PUSHED.**
  - Repo: `~/Development/personal/my-librarian` → **https://github.com/shinytoyrobots/my-librarian** (PRIVATE), branch `main`, origin via SSH. Initial commit pushed. Committer: `Robin Cannon <robin@shinytoyrobots.com>`.
  - Does: full-text search over the vault (node:sqlite FTS5) + two read-only MCP tools. No memory yet.
  - Verified against the real vault: **2,298 notes indexed in ~1s**; search returns provenance-tagged, snippet-highlighted results; MCP protocol smoke-tested over stdio (both tools register with `readOnlyHint`).
- **NOT yet done:** registered into Claude Code / dogfooded; S1.5 (the first stateful slice); anything in H2/H3.
- **Immediate next step:** build **S1.5 (memory-of-use capture)** — see §6.

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

In the repo: `README.md`, `docs/overview.md` (plain-English), `DESIGN.md` (storage & capabilities roadmap — **note: predates the S1.5 ambient-capture revision, the memory-of-use framing, ks-kb/mdbase relationship, and the positioning; these need folding in — see §8**).

## 8. Pending doc updates (not yet written into DESIGN.md)

These were agreed in conversation but not yet edited into `DESIGN.md`:
1. **S1.5 revision:** replace the tool-call `retrieval_log` with **ambient capture** (Stop-hook one-line session summaries → appraised → written back as markdown). Note the coupling: useful ambient memory needs an appraisal step or it becomes noise/rot.
2. **Memory-of-use framing** (§1 here): store (shareable) vs memory-of-use (personal); reference store by versioned ID; bitemporal tracks both my belief-change and the store changing under me.
3. **Elevated thesis up top:** personal persistent-memory layer for LLM conversation; working-memory (context) vs long-term-memory (store) analogy; effortful cue-driven recall is a feature.
4. **Vault-as-medium** (not just source), and the **generic-by-design / personal-first** positioning + **ks-kb relationship** + **mdbase** (adopt at memory layer; shape sidecar to be mdbase-compatible now).

## 9. Open questions / unresolved

- Exact Stop-hook mechanism in Claude Code (how to capture the one-line summary reliably) — needs a spike.
- What the memory-of-use record schema looks like concretely (make it mdbase-compatible).
- Appraisal is the hard, unsolved core — for the personal build it can be ambient/light; ks-kb shows that at higher stakes it reverts to governed human review.
- Whether to run the 2–4h Basic Memory spike before/while building S1.5 (benchmark semantic search vs Claude Code navigation on Robin's fuzzy queries).

## 10. Working norms (Robin's rules)

- Committer `Robin Cannon <robin@shinytoyrobots.com>`. Code goes through GitHub before any deploy; commit/push only when asked; branch off `main` for new work (don't commit S1.5 directly to main).
- Plan/design → write to a file, don't implement until told. American English. Keep CLAUDE.md files <40 lines.
- Vault access: read/write local `~/Documents/knowledge-vault/` directly.
- **This HANDOFF.md is uncommitted** — offer to commit it (and it needs adding to the repo).
