# Librarian Design: Storage & Capabilities

**Status:** S1 (retrieval skeleton) shipped and verified. This document lays out everything *after*
the skeleton — the stateful layer that is the actual reason the project exists.

Grounded in the full invention chain (research → invent → collide → score → ACH → validate →
architecture) under `knowledge-vault/Notes/Reference/`. The architectural decisions (ADR-1…6) live in
`…/Invention-Skills/validate-plan/2026-07/22-personal-librarian/architecture-proposal.md`. Fast resume:
[`HANDOFF.md`](./HANDOFF.md).

---

## The thesis (read first)

The Librarian is a **personal, persistent memory-of-use layer** for LLM conversation. Retrieval is
*not* the product — Claude Code reading an `obs-`-organized vault already retrieves well. The reason
this exists is the one thing a stateless assistant cannot be: **it remembers across time.**

The mental model is human memory, and it is exact:

- **Context window = working memory** — what's front of mind. Finite, expensive.
- **The Librarian's store = long-term memory** — deep, cheap to hold, recalled *with effort* on a cue.

Effortful, cue-driven recall is a **feature, not a limitation.** Human memory doesn't dump everything
into consciousness; it surfaces the relevant thing on a cue and leaves the rest dormant. A librarian
that made recall total and frictionless would just recreate context overflow. This is the same
principle as "discursive on demand, quiet when unprompted."

This reframes context limits and context rot: you stop trying to hold everything in the window
(impossible) and instead keep a compact working set, recalling the curated rest on demand. The hard
problem *moves* from "context overflowed" to "recall the right thing + forget well" — which is
tractable, and is exactly what this design is about.

---

## 1. Two orthogonal layers: the store vs. the memory-of-use

The sharpest distinction in the design, and the one that makes multi-user *not* a hard problem:

- **Knowledge store** — the content. Objective. Can be **shared** (a team vault, a company KB like
  `ks-kb`, even someone else's).
- **Memory-of-use** — how **I** engaged the store: what I looked at, what I concluded, how my beliefs
  evolved, which things I connected, what I chose to keep or forget. Subjective, inherently **personal**
  — even over a shared store. *Same book, two readers, two different memories.*

**The product is the memory-of-use.** Consequences that shape everything below:

1. **Never build "shared memory."** Build **per-person memory-of-use that overlays a store** (shared or
   not). Whose-belief is trivially "mine." Multi-user = *one shared store + N personal overlays* — not a
   new memory model. So the personal single-user build is the **architecturally correct unit**, not just
   the MVP.
2. **Decouple storage.** The memory-of-use lives in its own space (the `_librarian/` overlay, its own
   repo/branch), separate from the store — so it can overlay a store you don't own.
3. **Reference the store by durable, *versioned* identity** — path + content-hash / git ref, not just a
   path. A shared store changes under you.
4. **Bitemporal earns its keep twice** — it tracks not only *how my belief changed* but *that the
   underlying note changed under me*: "you concluded X from note Y as it stood on date Z; Y has since
   been rewritten." Two timelines: my thinking, and the store's evolution.

This is the deepest form of "own your memory": you may not own the *knowledge* (it's your company's),
but you own *how you used it* — and that is portable across your AI clients and independent of who owns
the store. It goes with you.

---

## 2. The storage principle: three layers

| Layer | What lives here | Durability | Who reads it |
|-------|-----------------|------------|--------------|
| **Store** (`*.md`) | The content — your notes, or a shared vault | **Source of truth.** Git-backed. | Everything |
| **`_librarian/` memory-of-use** (`*.md`) | The librarian's *judgments*: facts, marks, fingerprints, grades, session memory — all keyed to store items by versioned ref | **Durable** — git-committed markdown, human-readable, survives index loss | The librarian; ChatGPT via GitHub; you in Obsidian |
| **SQLite index** (`data/librarian.db`) | Search index + queryable projections of the above | **Disposable cache** — rebuilt from the two layers above in ~1s | The librarian server only |

**Why the sidecar is markdown-in-git, not just SQLite rows** (ADR-4): judgments are the valuable part —
you'd cry over losing them, not the search cache. Git-committed markdown gives them the store's own
durability *and* portability. It does triple duty:
1. **Durability** — regenerate the DB anytime; judgments aren't in the throwaway layer.
2. **Legibility** — read/edit a mark in Obsidian; it diffs in git.
3. **Cross-client distribution** — because it's in a git repo, **ChatGPT (which reads via GitHub)
   inherits the memory-of-use for free**, no hosting required. (See §8.)

Rule of thumb: **the SQLite index must always be fully reconstructible from the store + `_librarian/`.**
Nothing load-bearing lives only in the DB. The `_librarian/` overlay may live in the vault (personal
case) or in its own repo (overlaying a store you don't own — the shared-store case).

---

## 3. Phase S1.5 — ambient memory-of-use capture (build next; the real desirability gate)

The point of S1.5 is the first behavior a stateless assistant **cannot** have: memory that accrues by
itself. It comes before the full belief engine.

**Design note — a rejected first idea and why.** The obvious first cut was logging the librarian's own
*tool calls* (a `retrieval_log` of searches). Rejected: an MCP server only sees deliberate tool
invocations, not how you actually work, so that "memory" would require proactively routing everything
through the librarian every time. **That isn't memory — it's search-on-demand with a log.** Useful
memory must accrue *ambiently*.

**Where the conversation already lives:** Claude Code already writes local session transcripts on your
machine. The librarian doesn't need to log anything new — it needs to read what's already there. (This
is local-first: it reads files on disk, sends nothing anywhere.)

**Cheapest useful mechanism — a Stop hook + one-line session summary:**
- A Claude Code **Stop hook** fires at the end of a session and has Claude write **one line** — *"what
  did this session decide / produce?"* — appended to a log the librarian reads.
- Ambient (no proactivity from you), low-noise (one *curated* line per session, not the raw
  transcript), and it directly answers "what have I been working on lately."

**Fuller mechanism (later):** ingest the full local transcripts and extract topics/decisions with light
appraisal.

**The coupling you can't dodge:** ambient capture without an **appraisal step** produces noise, context
rot, and the collector's fallacy. "Accrues by itself" and "is actually good" are coupled. For the
personal build appraisal can be light/ambient (single-user, low stakes); `ks-kb` shows that at higher
stakes it reverts to governed human review (see §9).

**Storage:** memory-of-use records in `_librarian/` (per §1 — personal, versioned refs to store items).
Shape the frontmatter to be **mdbase-compatible** now (§9), so adopting mdbase at H2 is a drop-in.

**New tools:** `librarian-recent` ("what was I working on?"), plus a quiet "have I seen this / what did
I conclude before?" enrichment on search.

**Desirability gate (the whole point):** you reach for these *stateful* behaviors unprompted **≥3×/week
for 2 weeks**, measured against your Claude Code habit. If not, the product stops here — cheaply.

**Wish log:** during those 2 weeks, keep a running note of "what I wished it did." That — not this
document — picks whether H2 (belief-lifecycle) or H3 (ingestion) comes next.

---

## 4. Phase H2 — the belief-lifecycle engine (the differentiated core)

Where the librarian becomes what no stateless retriever can be: it tracks *what you believed and when*,
and surfaces change **openly, attributably, reversibly.**

### 4.1 Storage — `facts` + `note_links` (SQLite projections of `_librarian/`)

Bitemporal, invalidate-don't-delete (ADR-3). Practical in `node:sqlite`; **no graph DB** — recursive
CTEs over the wikilink adjacency cover a personal vault's needs.

```sql
CREATE TABLE facts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  subject            TEXT NOT NULL,
  predicate          TEXT NOT NULL,
  object             TEXT NOT NULL,
  valid_from         TEXT,                 -- when true in the world (NULL = unknown/always)
  valid_to           TEXT,                 -- NULL = still true
  tx_created         TEXT NOT NULL DEFAULT (datetime('now')),
  tx_expired         TEXT,                 -- NULL = current belief; set on invalidate, NEVER delete
  source_note_path   TEXT NOT NULL,        -- provenance anchor
  source_rev         TEXT,                 -- content-hash / git ref of the note AS READ (§1: store changes under you)
  source_reliability TEXT NOT NULL DEFAULT 'unrated',
  corroboration_count INTEGER NOT NULL DEFAULT 1,
  provenance_type    TEXT NOT NULL DEFAULT 'verbatim',  -- verbatim | paraphrase | inference
  confidence         REAL,
  superseded_by      INTEGER REFERENCES facts(id),
  mark_status        TEXT NOT NULL DEFAULT 'active'      -- active | superseded | disputed | corroborated
);

CREATE TABLE note_links (
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  link_type   TEXT NOT NULL DEFAULT 'wikilink'  -- wikilink | tag-cooccurrence | librarian-candidate
);
```

"Current belief about X" = `WHERE subject=? AND tx_expired IS NULL`. History = drop that clause.
Invalidation = `UPDATE facts SET tx_expired=?, valid_to=?, mark_status='superseded', superseded_by=?`
— **never `DELETE`**. `source_rev` lets the librarian notice when a belief's underlying note changed
after the belief was formed (the shared-store case, §1).

### 4.2 Sidecar layout (`_librarian/`, the durable memory-of-use home)

```
_librarian/
  facts/<mirrors source note path>.md    # one file per source note's extracted claims (frontmatter list)
  marks/<subject-slug>.md                # belief-change history per subject, human-readable
  pinakes/<fingerprint>.md               # durable metadata stub for forgotten content (see 4.4)
  sessions/<date>.md                     # ambient session memory-of-use (from S1.5)
  policy/collection-development.md        # your hand-authored "what to keep vs forget" charter
```
The DB tables are rebuilt from these on reindex. **Adopt `mdbase` for these records at this phase**
(§9): typed/validated collections + wikilink/backlink extraction, MIT-licensed.

### 4.3 Capability — Marginalia / the Obelus Layer (the headline behaviour)

When beliefs conflict or change, the librarian **never silently picks a winner.** It shows the current
best-supported reading inline with a *graded, clickable, reversible* mark (borrowed from Alexandria's
textual critics):

- `↻ superseded` — you believed the opposite as of <date>, on the basis of <note>
- `✻ corroborated` — restated/confirmed across independent notes
- `† disputed` — actively conflicting, unresolved

Reversal = one documented action (edit `mark_status` / delete the sidecar mark file). The
reliability × corroboration grade is the *presentation vocabulary*, not a hidden decision rule.

### 4.4 Capability — the Pinakes Tier (safe forgetting)

Forgetting is **not** delete. Demote pruned content to a durable metadata fingerprint (source, gist,
corroboration count, first/last-seen) in `_librarian/pinakes/`, so an item can be *recognised if it
resurfaces* (anti-duplication) even after the body is gone. Three tiers: full content → metadata-only →
(never) hard delete. This is what makes aggressive appraisal *safe*.

### 4.5 Capability — reasoned confidence (GRADE-style), not a vibe

`source_reliability` + `corroboration_count` roll up from named, inspectable dimensions (staleness,
internal inconsistency, directness, specificity, selection-skew; upgraded by unprompted recurrence or
surviving your attempts to reject it). An old, well-corroborated note can outrank a fresh offhand one —
which is why ranking is **decoupled from recency** (counters every framework's "trust the newest").

### 4.6 Capability — conflict-surfacing without nagging (stopping rules)

Don't flag every contradiction. Borrow clinical-trial interim-analysis: surface a belief conflict only
at log-spaced intervals with a *tightening* threshold — a belief held for two years needs a stronger
contradiction to resurface than last week's jotting. Forgetting = a principled "futility stop."

### 4.7 Local embeddings arrive here (ADR-6)

Wire the stubbed `EmbeddingClient` to local Ollama (`nomic-embed-text`); brute-force in-process cosine
over ~2k vectors (<50ms, no ANN index). Enables semantic recall + associative neighbourhood expansion.

---

## 5. Phase H3 — ingestion (conversation-as-acquisition)

Capture Claude/ChatGPT conversation insights as candidate notes (writes to the store per its
writable-path convention, **not** `_librarian/`). Overlaps with S1.5's ambient capture — H3 is the
fuller, full-transcript version. Treat all ingested content as **untrusted** (prompt-injection
surface); human-confirm every write.

---

## 6. The discursive layer — server holds state, client does the talking

"Discursive" is an *interaction property that emerges in the client*, not something the server does.

- **Server provides:** stateful memory + **associative retrieval primitives** — `note_links`
  neighbourhood expansion (Graph-RAG over wikilinks via recursive CTE), "you concluded X here →
  connects to Y", candidate-link suggestions.
- **Client produces the experience:** Claude/ChatGPT, conversing over those primitives (optionally
  shaped by a librarian persona/skill), ranges and follows threads.
- **Tension held:** discursive *when invited* (ranges richly once you're steering a thread), terse and
  quiet when unprompted. Discursive-on-demand, not discursive-at-you.

---

## 7. Sequencing & gates

| Phase | Builds | Gate to proceed |
|-------|--------|-----------------|
| **S1** ✅ | FTS5 retrieval, 2 read-only tools | shipped |
| **S1.5** | ambient capture (Stop-hook session summaries), `librarian-recent`, "seen before" | **≥3×/week unprompted stateful use, 2 weeks** |
| **H2** | `facts`/`note_links`, `_librarian/` on mdbase, Marginalia, Pinakes, grading, Ollama | wish-log confirms belief-lifecycle is the pull |
| **H3** | full-transcript ingestion | wish-log shows capture is the pain |

Let the **wish log** pick H2 vs H3 order — from behaviour, not this document.

---

## 8. Cross-client distribution (falls out of §2 for free)

- **Claude Code (Mac):** live server over local `fs` — full experience.
- **ChatGPT:** reads `_librarian/` markdown via GitHub → inherits the memory-of-use as a read-only
  snapshot (as-of-last-push), **no server hosting needed.**
- **Remote Claude.ai:** reachable by neither path — the only case that would need the (dormant)
  remote-HTTP + OAuth server. Out of scope unless specifically wanted.

Consequence: the remote-server / OAuth workstream is **deferrable indefinitely.**

---

## 9. Generalization & reuse (later-stage; personal-first now)

The generalized target shape ≈ **`ks-kb`** (`knapsack-labs/ks-kb`): typed markdown + `mdbase` +
Claude-maintained + multi-source ingestion + governance/appraisal + operation log. **But `ks-kb` is the
*store / curation* half; it does NOT have the memory-of-use / belief-lifecycle half — that's this
project's differentiator.** Generalized Librarian = a `ks-kb`-shaped store **+** the memory-of-use layer,
on `mdbase`, "Obsidian or otherwise."

**`mdbase` (`callumalpass/mdbase`, MIT, TypeScript) — adopt at the memory layer, not S1.** It gives
typed/validated collections, CEL queries, and wikilink/backlink extraction. It does **not** do full-text
search, so it complements FTS5 rather than replacing it. The split:

```
store (organic, messy)          →  FTS5, lenient        (S1: shipped)
_librarian/ memory-of-use (clean) →  mdbase, typed/strict (H2)
```

Never point strict validation at an organic vault; point it only at the librarian-authored records.
`mdbase` is pre-1.0 / "intentionally breaking" — don't bet bedrock on it yet; the free move now is to
**shape the sidecar frontmatter to be mdbase-compatible.**

**Positioning:** personal-first, generic-by-design. Target segment for the generalized version — power
users / small teams with structured, *growing* markdown vaults who have **outgrown search and feel the
memory gap.** Sell them memory, not search (that space is crowded). Multi-user = shared store + per-user
memory-of-use overlays (§1). The moat is *whose* memory it is (owned, portable, anti-lock-in) + appraisal
quality — not benchmark scores.

---

## 10. Explicitly deferred / out of scope
- Vector/ANN index (brute-force cosine is enough until ~10× growth).
- Remote deployment, OAuth wiring, ChatGPT *write-back* (scaffolding only).
- Multi-user governance (classification, permissions) — the `ks-kb`-scale concern; single-user first.
- Incremental (vs full) reindex — add only when full rebuild exceeds the 60s budget.
- **Decouple from Obsidian conventions behind an adapter** when generalizing ("Obsidian or otherwise").
