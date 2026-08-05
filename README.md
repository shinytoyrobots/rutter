# my-librarian

**A record of what your AI sessions decided — and the receipts behind it.**

An MCP server over a folder of markdown notes. At the end of each session your client leaves one
line about what it decided. The server stores that line byte-verbatim, alongside content-hashed
references to the notes it was based on.

Weeks later you can ask what you concluded. You can also ask whether the files it rested on have
moved since.

There is no model inside it. It is code plus storage, so the reasoning stays in your client.

> **A personal tool, published as a reference implementation — not a supported product.** Built for
> one person's workflow and shared because the mechanism might be useful. No roadmap promises, no
> support commitment, no guarantee the next commit won't move something you depend on. Fork it, take
> the ideas, file an issue if you like. Please don't put anything load-bearing on top of it.

## How this differs from memory you already have

Your harness almost certainly does this already, after a fashion. Claude Code writes session
recaps and infers preferences into a memory folder, then consolidates them over time — merging
duplicates, dropping what looks stale.

Consolidation is a reasonable default. It is also the opposite of what this does.

Nothing here ever rewrites a stored line. Records are append-only, grouped by session when you
read them, and what comes back out is the bytes that went in.

The second difference is the one that matters more. A summary on its own is not a record — it is
an assertion. A summary plus the versioned state of what it was based on is a record, because it
can be checked.

Almost nothing does that second part. Architecture decision records capture the *what* and the
*why* without pinning the version they applied to. Event-sourced logs timestamp events but rarely
carry file-level provenance. Supply-chain provenance formats hash content properly, but they are
built for auditors rather than for your next working session. So decisions drift quietly away from
the code that produced them, and nothing announces it.

Here, every reference carries the content hash of the note as it was read. Drift becomes visible
instead of silent.

Two smaller things follow from the design. The store is yours — markdown in your own notes
directory, not a vendor's account or a tool's private folder, so it stays portable, greppable,
git-committable, and readable if this project disappears. And because your client writes the
summary while its context is still loaded, capture costs no inference and no network call. The
trade is that quality depends on your client honoring the style contract, set out in *What the
server tells the client*.

None of this competes on retrieval. A capable agent reading a well-organized notes directory
already retrieves well. This exists for the part an ephemeral session cannot be: memory across
time.

## What it does today

- Indexes the notes directory into a local SQLite FTS5 full-text index — a disposable, regenerable cache. Your files stay the source of truth.
- **Ambient capture.** As a session decides or produces something, your client leaves a line about it, and a Claude Code Stop hook appends that line to `<notes>/_librarian/sessions/<date>.md`, referencing touched notes by content hash. One line per separable outcome rather than one per session — a working session usually leaves three or four — grouped back into a single account of that session when you read it. Durable, git-committable, written by your client.
- **A style contract on that line.** Write for a smart reader in a hurry who wasn't in the session: outcome first, common words over session shorthand, no invented codenames or version tags, about 40 words. The contract is guidance carried in the server's MCP instructions. The server stores whatever it is given, **verbatim** — over-budget summaries are reported on the capture path and then stored as written.
- **Workspace provenance.** Each entry carries the session's working directory, a project name derived from it, and the git remote URL when there is one, so a day spanning three efforts reads cleanly. Nothing to configure; resolution is pure local file reads — it never runs `git` and never contacts a remote.
- Three read-only MCP tools:
  - `librarian-search` — ranked full-text search. Every result carries its path, `type`/`status`/`created` provenance, and a matching snippet. Multi-word queries are AND-matched, so "blue man group" finds notes with all three rather than any. A result you engaged before also carries a quiet prior-engagement note, additive only, never re-ranking.
  - `librarian-get-note` — one note's full content, by path.
  - `librarian-recent` — *"what was I working on lately?"* Sessions newest-first, with dates, project, and provenance; optional `project` filter, `window` in days, or `count`.
- **Instructions that travel with the server.** Any connected client is told to reach for `librarian-recent` on recency questions and `librarian-search` on "have I seen this?" questions before reading files directly, and to report recalled summaries in plain language — including entries written before the contract existed, which is the only way dense old records ever read clearly. No per-project client configuration.
- **Instruments its own use.** A local per-ISO-week count of how often the stateful behavior gets reached for.
- **Note identity survives a rename.** A reference records the note's path *and* its content hash as read. "Dead" means the path is missing from disk, full stop, regardless of file type — a reference to any confined vault artifact (a `.gitignore`, an exported `.html`, a file under `_librarian/` itself) is live for as long as that file exists, whether or not it's an indexed markdown note. Rename a referenced note without touching its content and the next `npm run reindex` binds the old reference to its new path automatically — no heuristics, no similarity scoring, just an exact content-hash match — and `librarian-recent` / search enrichment quietly resolve through it. If reindex can't tell (the note was also edited, so no current note's hash matches; or more than one current note shares the hash), the reference renders explicitly as unresolved with its candidates on `librarian-recent`, and on search enrichment against any candidate note that happens to be a search result, and stays that way until you confirm it with `npm run identity-confirm`. A reference with no candidates at all (renamed *and* edited) is visible on `librarian-recent` only — that listing is the complete discovery surface for unresolved references; enrichment is candidate-anchored and cannot mention what has no candidate. On the search surface, a mere candidate is never annotated as if it had been engaged with; the unresolved state and its candidates render as a separate, explicit note instead. A confirmed binding is sticky: if the vault later changes such that automatic exact-hash matching would point somewhere else, the confirmed binding still wins, and the disagreement is surfaced ("confirmed X; the hash now matches Y") rather than silently overridden — only re-running `npm run identity-confirm` moves it. The stored session record is never rewritten either way.

## Known limitations

Stated here rather than discovered later:

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
enrichment / gate behaviors in depth. The same docs are published readable at
[shinytoyrobots.github.io/my-librarian](https://shinytoyrobots.github.io/my-librarian/) —
`npm run site-drift` reports when that site has drifted from these files. [`docs/roadmap.md`](./docs/roadmap.md) is the current
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

If `npm run recent` shows a ref as `[UNRESOLVED -- candidates: ...]` after a rename that also
changed the note's content (or landed on duplicate content), confirm the right target by hand —
this is a local-only command, never an MCP tool, so an agent can't rewrite what a dead reference
means on its own:

```bash
npm run identity-confirm -- Notes/old-name.md Notes/new-name.md
```

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
> When a session decides or produces something worth recalling later, leave a session summary -- emit one directive line, in this form:
>
> `<!-- librarian-session {"summary":"<one plain-English line>","refs":["<paths touched, relative to the knowledge base>"]} -->`
>
> Emit a line for each separable thing as you finish it, rather than saving everything for one line at the end; omit trivial work entirely. A capture hook lifts the newest such line after each turn; nothing else is needed, and no tool call records it.
>
> If you emit another directive later in the same session, describe ONLY what is new since your previous one -- do not restate or re-summarize earlier lines. A session's lines are stored as its successive steps and shown to the reader together, so restating produces near-identical duplicates.
>
> Write each line for a smart reader in a hurry who was not in this session: lead with what was decided or produced, prefer common words to this session's shorthand, and expand or avoid codenames, version tags and abbreviations this session invented (terms the vault itself uses are fine). Aim for about 40 words and stop by 60 -- one line, not a build log; it is stored verbatim, so nothing downstream will clarify it later.
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

New to the project? [`docs/getting-started.md`](./docs/getting-started.md) walks from
clone to first recall in eight verified steps.

After `npm run build`, from the repository root:

```bash
claude mcp add my-librarian --scope user -- node "$PWD/dist/stdio.js"
```

`--scope user` registers the server for every Claude Code session, in any directory.
Without it the server is project-local to this repository — invisible from the
directories where you actually work.

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
  identity.ts        note identity: exact-hash rename binding + the rebuildable projection
  app.ts             application seam (domain + instrumentation), used by server + tests
  reindex.ts / search-cli.ts / recent-cli.ts / gate-cli.ts / capture-cli.ts / identity-confirm-cli.ts   CLIs
hooks/
  librarian-stop.sh  Claude Code Stop hook -> capture-cli
spec/                the executable spec — scenarios, requirements, conformance mapping
test/                node:test suite (temp fixture directories; never touches your real notes)
```

## How this is built

Behavior is specified before it is written. [`spec/spec.md`](./spec/spec.md) holds Given-When-Then
scenarios and the requirements derived from them, each mapped to the tests that grade it, and every
amendment records what was rejected and why.

If you want to understand a decision here, that file is the honest account. This README is the
summary; the spec is the receipts.

## License

MIT. See [`LICENSE`](./LICENSE).

---

The index is a cache. The notes are yours. The record is the point.
