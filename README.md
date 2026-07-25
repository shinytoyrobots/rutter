# my-librarian

A stateful, discursive personal context **librarian** — an MCP server over an Obsidian vault.
Modelled on the *Snow Crash* Librarian: it surfaces, connects, and (later) *weighs openly, never
silently* — remembering across time and thinking alongside you over your own collection.

> **Status: S1 walking skeleton.** Source-only retrieval over the vault. No memory-over-time, no
> conflict marks, no ingestion yet — those are the stateful layer described in [`DESIGN.md`](./DESIGN.md).
> This skeleton exists to answer one question: **do you reach for it?**

**New here?** Read [`docs/overview.md`](./docs/overview.md) — a plain-English explanation of what the
Librarian is, how it works (there is no AI model inside it), and how to set it up.

## What it does today

- Indexes the vault into a local SQLite FTS5 full-text index (a disposable, regenerable cache — the vault stays the source of truth).
- Exposes two read-only MCP tools:
  - `librarian-search` — ranked full-text search; every result carries its path, `type`/`status`/`created` provenance, and a matching snippet. Multi-word queries are AND-matched (so "blue man group" finds notes with all three, not any).
  - `librarian-get-note` — return one note's full content by path.

## Requirements

- **Node ≥ 22** (uses the built-in `node:sqlite` — no native build step; FTS5 included). Verified on Node 26.
- An Obsidian vault of markdown files.

## Setup

```bash
npm install
npm run build          # compile to dist/ (optional; tsx runs the TS directly)
npm run reindex        # build the search index from the vault (~1s for ~2.3k notes)
```

Config via environment variables (sensible defaults):

| Var | Default | Meaning |
|-----|---------|---------|
| `LIBRARIAN_VAULT_PATH` | `~/Documents/knowledge-vault` | Vault to index (read-only) |
| `LIBRARIAN_DB_PATH` | `./data/librarian.db` | Where the derived index lives |

## Try it from the CLI

```bash
npm run search -- bitemporal forgetting memory
```

## Wire it into Claude Code

After `npm run build`:

```bash
claude mcp add my-librarian -- node /Users/shinytoyrobots/Development/personal/my-librarian/dist/stdio.js
```

Then reindex whenever the vault changes materially (`npm run reindex`). Ask things like
*"search my vault for the thing I did about X"* and Claude will call `librarian-search`.

## Project layout

```
src/
  config.ts      vault + db paths, ignore list
  vault.ts       markdown walk + frontmatter parse
  db.ts          node:sqlite open + FTS5 schema
  indexer.ts     full reindex (vault -> cache)
  search.ts      FTS5 query + get-note
  embeddings.ts  stubbed port (Ollama wired at H2 — see DESIGN.md)
  server.ts      MCP tool registration
  stdio.ts       stdio entry point (local Claude Code)
  reindex.ts     `npm run reindex`
  search-cli.ts  `npm run search`
```

## What's next

The retrieval layer above is deliberately *not* the differentiator — your Claude Code + `obs-`
setup already retrieves well. The reason this project exists is the **stateful, discursive layer**
(memory across time, belief-lifecycle, visible reversible judgment) that an ephemeral agent can't
be. That roadmap — storage model and capabilities — is in [`DESIGN.md`](./DESIGN.md).
