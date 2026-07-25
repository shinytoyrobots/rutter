# Librarian Design: Storage & Capabilities

**Status:** S1 (retrieval skeleton) shipped and verified. This document lays out everything *after*
the skeleton — the stateful, discursive layer that is the actual reason the project exists.

Grounded in the full invention chain (research → invent → collide → score → ACH → validate →
architecture) under `knowledge-vault/Notes/Reference/`. The architectural decisions (ADR-1…6) live in
`…/Invention-Skills/validate-plan/2026-07/22-personal-librarian/architecture-proposal.md`.

---

## 0. The one principle everything hangs on: three storage layers

| Layer | What lives here | Durability | Who reads it |
|-------|-----------------|------------|--------------|
| **Vault** (`*.md`) | Your notes — the content | **Source of truth.** Git-backed. | Everything |
| **`_librarian/` sidecar** (`*.md` in the vault) | The librarian's *judgments*: facts, marks, fingerprints, grades | **Durable** — git-committed markdown, human-readable, survives index loss | The librarian; ChatGPT via GitHub; you in Obsidian |
| **SQLite index** (`data/librarian.db`) | Search index + query-able projections of the above | **Disposable cache** — rebuilt from the two layers above in ~1s | The librarian server only |

**Why the sidecar is markdown-in-git, not just SQLite rows** (ADR-4): judgments are the valuable
part — you'd cry over losing them, not the search cache. Storing them as git-committed markdown gives
them the vault's own durability *and* makes them portable. It also does triple duty:
1. **Durability** — regenerate the DB anytime; judgments aren't in the throwaway layer.
2. **Legibility** — you can read/edit a mark in Obsidian; it diffs in git.
3. **Cross-client distribution** — because it's in the vault's git repo, **ChatGPT (which reads the vault via GitHub) inherits the librarian's memory for free**, no server hosting required. (See §6.)

Rule of thumb: **the SQLite index must always be fully reconstructible from `vault/` + `_librarian/`.**
Nothing load-bearing lives only in the DB.

---

## 1. Phase S1.5 — the cheapest stateful slice (build next; it's the real desirability gate)

Retrieval alone won't prove the product (your Claude Code + `obs-` incumbent already retrieves well).
The first thing worth measuring is the first behavior an ephemeral agent **cannot** have: memory across
sessions. This is small and comes before the full belief engine.

**Storage** — one new table (cache-only is acceptable here since it's low-stakes; promote to sidecar if it proves valuable):
```sql
CREATE TABLE retrieval_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL DEFAULT (datetime('now')),
  query      TEXT NOT NULL,
  result_paths TEXT,          -- JSON array of paths returned
  opened_path  TEXT           -- which result (if any) was then fetched via get-note
);
```

**New tools / capabilities:**
- `librarian-recent` — *"what was I looking at / working on recently?"* (reads `retrieval_log`).
- `librarian-search` gains a quiet enrichment: *"you've looked at this note before"* / *"you searched something similar on <date>"*.

**Desirability gate (the whole point):** you reach for these *stateful* behaviours unprompted **≥3×/week
for 2 weeks**, measured against your Claude Code habit. If not, the product stops here — cheaply.

---

## 2. Phase H2 — the belief-lifecycle engine (the differentiated core)

This is where the librarian becomes something no stateless retriever can be: it tracks *what you
believed and when*, and surfaces change **openly, attributably, reversibly.**

### 2.1 Storage — `facts` + `note_links` (SQLite projections of `_librarian/` sidecar)

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
— **never `DELETE`**.

### 2.2 Sidecar layout (`_librarian/`, the durable home)

```
_librarian/
  facts/<mirrors source note path>.md    # one file per source note's extracted claims (frontmatter list)
  marks/<subject-slug>.md                # belief-change history per subject, human-readable
  pinakes/<fingerprint>.md               # durable metadata stub for forgotten content (see 2.4)
  policy/collection-development.md        # your hand-authored "what to keep vs forget" charter
```
The DB tables above are rebuilt from these on reindex.

### 2.3 Capability — Marginalia / the Obelus Layer (the headline behaviour)

When beliefs conflict or change, the librarian **never silently picks a winner.** It shows the current
best-supported reading inline with a *graded, clickable, reversible* mark (borrowed from Alexandria's
textual critics):

- `↻ superseded` — you believed the opposite as of <date>, on the basis of <note>
- `✻ corroborated` — restated/confirmed across independent notes
- `† disputed` — actively conflicting, unresolved

Reversal = one documented action (edit `mark_status` / delete the sidecar mark file). The
reliability × corroboration grade (below) is the *presentation vocabulary*, not a hidden decision rule.

### 2.4 Capability — the Pinakes Tier (safe forgetting)

Forgetting is **not** delete. Demote pruned content to a durable metadata fingerprint (source, gist,
corroboration count, first/last-seen) in `_librarian/pinakes/`, so an item can be *recognised if it
resurfaces* (anti-duplication) even after the body is gone. Three tiers: full content → metadata-only →
(never) hard delete. This is what makes aggressive appraisal *safe*.

### 2.5 Capability — reasoned confidence (GRADE-style), not a vibe

`source_reliability` + `corroboration_count` roll up from named, inspectable dimensions (staleness,
internal inconsistency, directness, specificity, selection-skew; upgraded by unprompted recurrence or
surviving your attempts to reject it). An old, well-corroborated note can outrank a fresh offhand one —
which is also why ranking is **decoupled from recency** (counters every framework's "trust the newest").

### 2.6 Capability — conflict-surfacing without nagging (stopping rules)

Don't flag every contradiction. Borrow clinical-trial interim-analysis: surface a belief conflict only
at log-spaced intervals with a *tightening* threshold — a belief held for two years needs a stronger
contradiction to resurface than last week's jotting. Forgetting = a principled "futility stop."

### 2.7 Local embeddings arrive here (ADR-6)

Wire the stubbed `EmbeddingClient` to local Ollama (`nomic-embed-text`); brute-force in-process cosine
over ~2k vectors (<50ms, no ANN index). Enables semantic recall + associative neighbourhood expansion.

---

## 3. Phase H3 — ingestion (conversation-as-acquisition)

Capture Claude/ChatGPT conversation insights as candidate vault notes (writes to `Notes/Reference/`
per the existing writable-path convention, **not** `_librarian/`). Treat all ingested content as
**untrusted** (prompt-injection surface); human-confirm every write. Can be pulled forward if the
S1.5/H2 wish-log shows capture is the real pain.

---

## 4. The discursive layer — server holds state, client does the talking

"Discursive" is an *interaction property that emerges in the client*, not something the server does.

- **Server provides** (all of the above): stateful memory + **associative retrieval primitives** —
  `note_links` neighbourhood expansion (Graph-RAG over your wikilinks via recursive CTE), "you concluded
  X here → connects to Y", candidate-link suggestions.
- **Client produces the experience:** Claude/ChatGPT, conversing over those primitives (optionally
  shaped by a librarian persona/skill), ranges and follows threads.
- **Tension held:** discursive *when invited* (ranges richly once you're steering a thread), terse and
  quiet when unprompted. Discursive-on-demand, not discursive-at-you.

---

## 5. Sequencing & gates

| Phase | Builds | Gate to proceed |
|-------|--------|-----------------|
| **S1** ✅ | FTS5 retrieval, 2 read-only tools | shipped |
| **S1.5** | `retrieval_log`, `librarian-recent`, "seen before" | **≥3×/week unprompted stateful use, 2 weeks** |
| **H2** | `facts`/`note_links`, `_librarian/` sidecar, Marginalia, Pinakes, grading, Ollama | wish-log confirms belief-lifecycle is the pull |
| **H3** | ingestion capture | wish-log shows capture is the pain |

Let the **wish log** (a running note of "what I wished it did") pick H2 vs H3 order — from behaviour,
not this document.

---

## 6. Cross-client distribution (falls out of §0 for free)

- **Claude Code (Mac):** live server over local `fs` — full experience.
- **ChatGPT:** reads `_librarian/` markdown via GitHub → inherits the librarian's memory as a read-only
  snapshot (as-of-last-push), **no server hosting needed.**
- **Remote Claude.ai:** reachable by neither path — the only case that would need the (dormant)
  remote-HTTP + OAuth server. Out of scope unless specifically wanted.

Consequence: the entire remote-server / OAuth workstream is **deferrable indefinitely.**

---

## 7. Explicitly deferred / out of scope
- Vector/ANN index (brute-force cosine is enough at this scale until ~10× growth).
- Remote deployment, OAuth wiring, ChatGPT *write-back* (scaffolding only).
- Multi-user / multi-tenant anything (single-user by design).
- Incremental (vs full) reindex — add only when full rebuild exceeds the 60s budget.
- **Future / non-urgent:** decouple from Obsidian conventions behind an adapter if ever generalized
  beyond personal use (keep the coupling deliberate).
