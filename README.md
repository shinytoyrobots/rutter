# my-librarian

A stateful, discursive personal context **librarian** — an MCP server over an Obsidian vault.
Modelled on the *Snow Crash* Librarian: it surfaces, connects, and (later) *weighs openly, never
silently* — remembering across time and thinking alongside you over your own collection.

> **Status: S1.5 — ambient memory-of-use capture.** The first *stateful* slice: the librarian now
> quietly records what each Claude Code session decided, lets you recall recent work, and enriches
> search with prior-engagement signals — behind a kill gate that measures **do you reach for it?**
> The roadmap beyond this is in [`DESIGN.md`](./DESIGN.md).

**New here?** Read [`docs/overview.md`](./docs/overview.md) for what the Librarian is and how it works
(there is no AI model inside it), then [`docs/memory-of-use.md`](./docs/memory-of-use.md) for the S1.5
capture / recall / enrichment / gate behaviors in depth.

## What it does today

- Indexes the vault into a local SQLite FTS5 full-text index (a disposable, regenerable cache — the vault stays the source of truth).
- **Captures memory-of-use ambiently:** at session end a Claude Code Stop hook appends **one curated line** per session to `<vault>/_librarian/sessions/<date>.md` — durable, git-committable, referencing touched notes by content-hash. No AI runs in the server; your client writes the line, the server only stores it.
- **Records which workspace each session came from:** every captured entry also carries the session's working directory, a **project name derived from it automatically**, and the git remote URL when there is one — so a day that spans three efforts reads cleanly. Nothing to name or configure; resolution is pure local file reads (it never runs `git` and never contacts a remote).
- Exposes read-only MCP tools:
  - `librarian-search` — ranked full-text search; every result carries its path, `type`/`status`/`created` provenance, and a matching snippet. Multi-word queries are AND-matched (so "blue man group" finds notes with all three, not any). A result you engaged in a past session also carries a quiet prior-engagement note (additive only — never re-ranks).
  - `librarian-get-note` — return one note's full content by path.
  - `librarian-recent` — *"what was I working on lately?"* — recent session summaries, most-recent-first, with dates, **project**, and provenance; optional `project` filter, `window` (days) or `count`.
- **Tells your client when to use it:** the server ships its own MCP *instructions*, so any connected client is told to reach for `librarian-recent` on recency questions and `librarian-search` on "have I seen this before?" questions before reading files directly. No per-project client configuration required.
- **Instruments stateful use** for the desirability gate: a local per-ISO-week count of how often you reach for recent/enriched behavior.

See [`docs/memory-of-use.md`](./docs/memory-of-use.md) for setup (incl. the Stop-hook install),
usage, and the gate readout.

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

Memory-of-use (session records, stateful-use log) lives under `<vault>/_librarian/` — inside the
vault, never in this code repo. See [`docs/memory-of-use.md`](./docs/memory-of-use.md).

## Try it from the CLI

```bash
npm run search -- bitemporal forgetting memory   # full-text search
npm run recent                                   # recent session summaries
npm run recent -- --days 7                        # just the last week
npm run recent -- --project my-librarian           # just one project (case-insensitive)
npm run gate                                       # per-ISO-week stateful-use count (the gate)
```

Entries captured before workspace provenance existed simply show no project — there is no
placeholder, and a `--project` filter skips them rather than guessing.

## Enable ambient capture (three steps, one-time)

Remembering needs all three of these — the hook alone captures nothing if Claude never
leaves a summary. (Full detail in [`docs/memory-of-use.md`](./docs/memory-of-use.md).)

**1. Register the Stop hook** in `~/.claude/settings.json` (build first — the hook runs
`dist/capture-cli.js`):

```json
{
  "hooks": {
    "Stop": [ { "hooks": [ { "type": "command", "command": "/ABSOLUTE/PATH/hooks/librarian-stop.sh" } ] } ]
  }
}
```

**2. Tell Claude to leave the summary.** The server never summarizes (no AI in it) — the
hook lifts a directive Claude writes during the session. Add a standing rule to your
global `~/.claude/CLAUDE.md` so this happens every session without asking:

```markdown
- Librarian memory: at the end of any session that decided or produced something, emit
  one directive line `<!-- librarian-session {"summary":"<one plain-English line>","refs":["<vault-relative paths touched>"]} -->`
  (last one wins; omit for trivial sessions — a Stop hook captures it into the vault).
```

**3. Restart Claude Code.** Hooks and CLAUDE.md are read at session start; a fresh
session also picks up the newly built server. Verify with `/mcp` (three tools), then
check captures land in `<vault>/_librarian/sessions/` after your next real session.

Only step 2 needs your `~/.claude/CLAUDE.md` — and only because the *summary* must come
from the client (the server runs no AI). Knowing **when to call the tools** is not your
job to configure: that guidance ships inside the server as MCP instructions and reaches
every client on connect. The working directory arrives with the Stop event, so the
project on each entry needs no setup either.

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
  config.ts          vault + db + _librarian paths, ignore list
  vault.ts           markdown walk + frontmatter parse
  db.ts              node:sqlite open + FTS5 schema
  indexer.ts         full reindex (vault -> cache)
  search.ts          FTS5 query + get-note
  embeddings.ts      stubbed port (Ollama wired at H2 — see DESIGN.md)
  server.ts          MCP tool registration (search, get-note, recent) + server instructions
  stdio.ts           stdio entry point (local Claude Code)
  # S1.5 memory-of-use:
  fs-safe.ts         write choke point: path confinement + atomic, append-only writes
  sanitize.ts        untrusted summary -> one inert line (SR-101)
  refs.ts            versioned identity (path + content-hash)
  workspace.ts       workspace provenance (cwd -> project + git remote, local reads only)
  session-record.ts  typed, mdbase-shaped record format + append-preserving persistence
  capture.ts         ambient capture orchestration
  directive.ts       parse the client's session-summary directive (no inference)
  recent.ts          librarian-recent (order / project / window / count / empty-state)
  enrichment.ts      additive prior-engagement annotation on search results
  instrumentation.ts append-only stateful-use log + per-ISO-week counts
  app.ts             application seam (domain + instrumentation), used by server + tests
  reindex.ts / search-cli.ts / recent-cli.ts / gate-cli.ts / capture-cli.ts   CLIs
hooks/
  librarian-stop.sh  Claude Code Stop hook -> capture-cli
test/                node:test suite (temp fixture vaults; never touches your real vault)
```

## What's next

The retrieval layer above is deliberately *not* the differentiator — your Claude Code + `obs-`
setup already retrieves well. The reason this project exists is the **stateful, discursive layer**
(memory across time, belief-lifecycle, visible reversible judgment) that an ephemeral agent can't
be. That roadmap — storage model and capabilities — is in [`DESIGN.md`](./DESIGN.md).
