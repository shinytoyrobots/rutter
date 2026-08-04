# my-librarian

**A record of what your AI coding sessions decided — with references that can tell you they've gone stale.**

An MCP server over a folder of markdown notes. At the end of each session your client leaves one
line about what it decided; the server stores that line, byte-verbatim, alongside content-hashed
references to the notes involved. Weeks later you can ask what you concluded and see whether the
files it was based on have changed since.

There is no AI model inside it. It is code plus storage, so the reasoning stays in your client.

> **This is a personal tool, published as a reference implementation — not a supported product.**
> It is built for one person's workflow and shared because the mechanism might be useful or
> interesting. No roadmap promises, no support commitment, no guarantee the next commit won't
> change something you depend on. Fork it, copy the ideas, file an issue if you like — but
> please don't build anything load-bearing on it.

## How this differs from memory you already have

Worth being direct, because several tools now occupy this space and one of them ships with your
editor:

- **Your harness probably already summarizes sessions.** Claude Code writes session recaps and
  infers preferences into a memory folder, consolidating them over time. Consolidation is the
  difference: merging duplicates and dropping what looks stale is a reasonable default, and it is
  the opposite of what this does. Nothing here ever rewrites a stored line — records are
  append-only, grouped by session at read time, and what you get back is the bytes that went in.
- **Few tools record what a decision was based on.** Architecture decision records usually capture
  the *what* and *why* without pinning the version they applied to. Event-sourced logs timestamp
  events but rarely carry file-level provenance. Supply-chain provenance formats do hash content,
  but are aimed at audit rather than at your next working session. Here every reference carries the
  content hash of the note as it was read, so a decision can be checked against a file that has
  since moved on.
- **The store is yours, in your own files.** Records live in your notes directory as markdown, not
  in a vendor's account or a tool's private directory. Portable, greppable, git-committable, and
  readable if this project disappears.
- **The client writes the summary; the server only stores it.** Capture costs no inference and no
  network call. The trade is that quality depends on your client honoring the style contract, set
  out in *What the server tells the client*.

What this is explicitly *not* competing on is retrieval. A capable agent reading a
well-organized notes directory already retrieves well. The reason this exists is the part an
ephemeral session cannot be: memory across time.

## What it does today

- Indexes the notes directory into a local SQLite FTS5 full-text index (a disposable, regenerable cache — your files stay the source of truth).
- **Captures memory-of-use ambiently:** at session end a Claude Code Stop hook appends **one curated line** per session to `<notes>/_librarian/sessions/<date>.md` — durable, git-committable, referencing touched notes by content-hash. No AI runs in the server; your client writes the line, the server only stores it.
- **Keeps that line readable months later:** summaries carry a **plain-language style contract** — write for a smart reader in a hurry who wasn't in the session: lead with what was decided or produced, common words over session shorthand, no session-invented codenames or version tags, and a stated word budget. The contract is guidance to your *client*, carried in the server's MCP instructions; the server itself stores whatever it is given **verbatim** and never rewrites, truncates, or rejects a summary on style. Over-budget summaries are reported on the capture path and then stored as written.
- **Records which workspace each session came from:** every captured entry also carries the session's working directory, a **project name derived from it automatically**, and the git remote URL when there is one — so a day that spans three efforts reads cleanly. Nothing to name or configure; resolution is pure local file reads (it never runs `git` and never contacts a remote).
- Exposes read-only MCP tools:
  - `librarian-search` — ranked full-text search; every result carries its path, `type`/`status`/`created` provenance, and a matching snippet. Multi-word queries are AND-matched (so "blue man group" finds notes with all three, not any). A result you engaged in a past session also carries a quiet prior-engagement note (additive only — never re-ranks).
  - `librarian-get-note` — return one note's full content by path.
  - `librarian-recent` — *"what was I working on lately?"* — recent session summaries grouped by session, most-recent-first, with dates, **project**, and provenance; optional `project` filter, `window` (days) or `count`.
- **Tells your client when to use it — and how to read it back:** the server ships its own MCP *instructions*, so any connected client is told to reach for `librarian-recent` on recency questions and `librarian-search` on "have I seen this before?" questions before reading files directly. The same instructions carry the summary style contract and ask the client to **report recalled summaries in plain language** — including entries written before the contract existed, which is the only way old, dense records ever read clearly (they are never rewritten on disk). No per-project client configuration required.
- **Instruments its own use:** a local per-ISO-week count of how often the stateful behavior gets reached for.

## Known limitations

Stated plainly rather than discovered later:

- **Older records are dense.** The style contract and its word budget arrived after the first
  fortnight of capture, and existing records are never retrofitted. Early entries read like build
  logs. Read-time guidance is the only layer that reaches them.
- **Quality depends on your client.** The server holds no model, so a client that ignores the style
  contract produces summaries the server will faithfully store anyway.
- **Single-user by design.** Nothing here addresses shared records, ratification, or whose version
  of a decision wins. Those are the hard problems at team scale and none of them are solved here.
- **Semantic search is stubbed.** `embeddings.ts` is a port with no implementation; retrieval is
  full-text only.
- **Under active evaluation.** The stateful behavior is behind a usage gate — the project measures
  whether it actually gets reached for, and is prepared to conclude that it doesn't.

## Requirements

- **Node ≥ 22** (uses the built-in `node:sqlite` — no native build step; FTS5 included). Verified on Node 26.
- A directory of markdown notes. Obsidian is what it was built against — wikilinks and frontmatter
  are understood — but nothing requires Obsidian itself.
- Claude Code, for ambient capture. The MCP tools work with any MCP client; the Stop hook is
  Claude Code specific.

## Setup

**Point it at your notes first.** The default is the author's own path, and an unreadable
directory is not an error — you get a successful reindex reporting zero notes, which looks like
a working install until you search and find nothing.

```bash
export LIBRARIAN_VAULT_PATH=/path/to/your/notes   # do this before reindexing
npm install
npm run build          # compile to dist/ (optional; tsx runs the TS directly)
npm run reindex        # expect a non-zero note count; zero means the path is wrong
```

Config via environment variables:

| Var | Default | Meaning |
|-----|---------|---------|
| `LIBRARIAN_VAULT_PATH` | `~/Documents/knowledge-vault` | Notes directory to index (read-only). Set this. |
| `LIBRARIAN_DB_PATH` | `<repo>/data/librarian.db` | Where the derived index lives. Resolved from the installed module's own location, not your working directory. |
| `LIBRARIAN_USER_LABEL` | `the user` | How the server describes whose work this is, in the instructions and tool descriptions your client receives. Set it to your name and the client is told it is looking at *your* work, which reads more naturally than "the user's". |

Memory-of-use (session records, the use log) lives under `<notes>/_librarian/` — inside your notes
directory, never in this code repo. See [`docs/memory-of-use.md`](./docs/memory-of-use.md).

**New here?** Read [`docs/overview.md`](./docs/overview.md) for what the librarian is and how it
works, then [`docs/memory-of-use.md`](./docs/memory-of-use.md) for the capture / recall /
enrichment / gate behaviors in depth. [`docs/roadmap.md`](./docs/roadmap.md) is the current
sequencing, and [`DESIGN.md`](./DESIGN.md) the longer-range storage model.

## Try it from the CLI

```bash
npm run search -- bitemporal forgetting memory   # full-text search
npm run recent                                   # recent session summaries
npm run recent -- --days 7                        # just the last week
npm run recent -- --project my-librarian           # just one project (case-insensitive)
npm run gate                                       # per-ISO-week use count
```

Entries captured before workspace provenance existed simply show no project — there is no
placeholder, and a `--project` filter skips them rather than guessing.

## Enable ambient capture (two steps, one-time)

There is **nothing to add to your `CLAUDE.md`.** The whole capture contract — that a summary
should be left, the exact syntax, and how to write it — ships inside the server as MCP
instructions and reaches every client on connect. Register the hook, restart, done. (Full detail
in [`docs/memory-of-use.md`](./docs/memory-of-use.md).)

**1. Register the Stop hook.** Either run:

```bash
npm run build && npm run install-hook          # adds the hook to ~/.claude/settings.json
```

…or add it to `~/.claude/settings.json` by hand (the hook runs `dist/capture-cli.js`, so
build first):

```json
{
  "hooks": {
    "Stop": [ { "hooks": [ { "type": "command", "command": "/ABSOLUTE/PATH/hooks/librarian-stop.sh" } ] } ]
  }
}
```

**2. Restart Claude Code.** Hooks are read at session start; a fresh session also picks up
the newly built server. Verify with `/mcp` (three tools), then check captures land in
`<notes>/_librarian/sessions/` after your next real session.

### What the server tells the client

The hook captures nothing if the client never leaves a summary, and the server contains no
AI to write one — so the server *asks* for it. The contract block here is quoted verbatim from
`SERVER_INSTRUCTIONS` in [`src/server.ts`](./src/server.ts), which is the single source of
the contract; a test (COR-R-030) fails if this copy drifts from it.

<!-- BEGIN capture-contract -->
> At the end of any session that decided or produced something, leave a session summary so the next session can recall it -- emit exactly one directive line, in this form:
>
> `<!-- librarian-session {"summary":"<one plain-English line>","refs":["<paths touched, relative to the knowledge base>"]} -->`
>
> Omit it entirely for trivial sessions. A capture hook lifts the last such line out of the session; nothing else is needed, and no tool call records it.
>
> If you emit another directive later in the same session, describe ONLY what is new since your previous one -- do not restate or re-summarize earlier lines. A session's lines are stored as its successive steps and shown to the reader together, so restating produces near-identical duplicates.
>
> Write each line for a smart reader in a hurry who was not in this session: lead with what was decided or produced, prefer common words to this session's shorthand, and expand or avoid codenames, version tags and abbreviations this session invented (terms the vault itself uses are fine). Aim for about 40 words and stop by 60 -- one line, not a build log; it is stored verbatim, so nothing downstream will clarify it later. If this session did several separable things, emit a line for each as you finish it rather than one long line at the end.
<!-- END capture-contract -->

The last paragraph is the **style contract** (see
[`docs/memory-of-use.md`](./docs/memory-of-use.md) §2) — the only thing standing between you
and a directory full of summaries you can't read in six months. The server will not help here:
it stores what it is given, verbatim, whatever style it is in. An unfilled template is the
one exception: a summary still wrapped in `<angle brackets>` is treated as "no directive"
rather than stored, so copying the directive line without filling it in captures nothing.

The working directory arrives with the Stop event, so the project on each entry needs no
setup either.

**If captures stop landing**, the fallback is to paste that contract block into your global
`~/.claude/CLAUDE.md` as a standing rule. That is belt-and-braces, not a required step — and if
you need it, that is a bug worth reporting, because the server is meant to carry this on its own.

## Wire it into Claude Code

After `npm run build`, from the repository root:

```bash
claude mcp add my-librarian -- node "$PWD/dist/stdio.js"
```

Then reindex whenever your notes change materially (`npm run reindex`). Ask things like
*"search my notes for the thing I did about X"* and the client will call `librarian-search`.

## Project layout

```
src/
  config.ts          notes + db + _librarian paths, ignore list
  vault.ts           markdown walk + frontmatter parse
  db.ts              node:sqlite open + FTS5 schema
  indexer.ts         full reindex (notes -> cache)
  search.ts          FTS5 query + get-note
  embeddings.ts      stubbed port (not implemented — see DESIGN.md)
  server.ts          MCP tool registration (search, get-note, recent) + server instructions
  stdio.ts           stdio entry point (local Claude Code)
  # memory-of-use:
  fs-safe.ts         write choke point: path confinement + atomic, append-only writes
  sanitize.ts        untrusted summary -> one inert line
  refs.ts            versioned identity (path + content-hash)
  workspace.ts       workspace provenance (cwd -> project + git remote, local reads only)
  session-record.ts  typed record format + append-preserving persistence
  capture.ts         ambient capture orchestration
  directive.ts       parse the client's session-summary directive (no inference)
  recent.ts          librarian-recent (grouping / project / window / count / empty-state)
  enrichment.ts      additive prior-engagement annotation on search results
  instrumentation.ts append-only use log + per-ISO-week counts
  app.ts             application seam (domain + instrumentation), used by server + tests
  reindex.ts / search-cli.ts / recent-cli.ts / gate-cli.ts / capture-cli.ts   CLIs
hooks/
  librarian-stop.sh  Claude Code Stop hook -> capture-cli
spec/                the executable spec — scenarios, requirements, conformance mapping
test/                node:test suite (temp fixture directories; never touches your real notes)
```

## How this is built

Behavior is specified before it is written. [`spec/spec.md`](./spec/spec.md) holds
Given-When-Then scenarios and the requirements derived from them, each mapped to the tests that
grade it, and every amendment records what was rejected and why. If you want to understand a
design decision, that file is the honest account — not this README.

## License

MIT. See [`LICENSE`](./LICENSE).
