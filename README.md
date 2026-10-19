# rutter

**A personal memory layer for AI agents.** One memory. Multiple agents. Yours.

It recalls past decisions and the notes your AI session cited. It is an MCP (Model Context Protocol) server over a folder of markdown notes. As a session decides
something, your client leaves one line about it. A hook stores that line, without rewriting it for style, in a
dated file inside your notes folder, with the path and a content hash of each note it cited.

Weeks later you ask what you concluded, in the same AI tool or another one you have set up, and get
the line back with its date and its notes. A note renamed without edits is followed by its hash. A
reference rutter cannot place is shown as unresolved rather than dropped. A note changed in place is
not flagged yet.

It suits people who keep markdown notes and are comfortable configuring an AI client. Start with
[`docs/getting-started.md`](./docs/getting-started.md); Claude Code users can [install the
plugin](#install-as-a-claude-plugin) in a few minutes. Everyone else installs from npm, where the
package is [`rutter-memory`](https://www.npmjs.com/package/rutter-memory) (the name `rutter` there
belongs to an unrelated library).

There is no model inside it. It is code plus storage, so the reasoning stays in your client.

The name is from the age of sail: a rutter was the logbook of the routes actually sailed, as
against the map. The map records what is known. The rutter records what you did about it.

> **A personal tool, published as a reference implementation — not a supported product.** Built for
> one person's workflow and shared because the mechanism might be useful. No roadmap promises, no
> support commitment, no guarantee the next commit won't move something you depend on. Fork it, take
> the ideas, file an issue if you like. Please don't put anything load-bearing on top of it.

## One memory across your AI tools

rutter keeps one set of records for Claude Code, Grok, Codex, Copilot CLI, Antigravity, and Muse Code. Each client writes its
session summaries to the same notes folder. Each client reads them back through the same MCP server.

A decision you made in Codex on Tuesday is there when you ask Claude Code on Thursday, provided
Codex wrote a line for it and its hook ran. You copy nothing between clients. This works because the memory is a folder of markdown files you own, not a
feature inside one tool.

| Client | How it captures | Setup |
|--------|-----------------|-------|
| Claude Code | The hook reads the whole session transcript. | [Install the plugin](#install-as-a-claude-plugin) |
| Grok | The hook reads the final reply. | [npm install, then four steps; no Claude Code needed](#grok) |
| Codex | The hook reads the final reply only. | [npm install, then four steps](#codex) |
| GitHub Copilot CLI | The hook reads the current turn from Copilot's transcript. | [npm install, then four steps](#github-copilot-cli) |
| Antigravity CLI (`agy`) | The hook reads the current turn from `agy`'s transcript. | [npm install, then four steps](#antigravity-cli) |
| Muse Code (`muse`) | The hook reads the final reply. | [npm install, then one installer run](./docs/getting-started.md#muse-code-path) |

Every client can read the memory once its MCP server is registered. Writing needs a hook that runs after each turn, and these six
have one. Any other MCP client can read but not write, running the server through `npx`
([recall only, with npx](./docs/getting-started.md#recall-only-with-npx)). The Antigravity row covers the `agy`
command-line tool, not the Antigravity IDE.

Point every client at the same notes folder. Each sets it differently. The Claude Code plugin asks
for it at install. Grok, Codex, and Copilot CLI read `LIBRARIAN_VAULT_PATH` from the shell that launches them.
Antigravity's and Muse Code's installers take `--vault`. Each record notes which client wrote it, when the hook can
tell (see *Known limitations*).

## How this differs from memory you already have

Your harness almost certainly does this already, after a fashion. Claude Code writes session
recaps and infers preferences into a memory folder, then consolidates them over time — merging
duplicates, dropping what looks stale.

Consolidation is a reasonable default. It is also the opposite of what this does.

Nothing here ever rewrites a stored line. Records are append-only, grouped by session when you
read them, and a line is not rewritten for style on the way in: only a one-line normalization and a
2,000-character cut apply.

The second difference is the one that matters more. A summary on its own is not a record — it is
an assertion. A summary plus the versioned state of the notes it cited is a record, because it
gives you a fingerprint to compare against.

Neighboring approaches each do part of that second part. Architecture decision records capture the *what* and the
*why* without pinning the version they applied to. Event-sourced logs timestamp events but rarely
carry file-level provenance. Supply-chain provenance formats hash content properly, but they are
built for auditors rather than for your next working session. So decisions drift quietly away from
the code that produced them, and nothing announces it.

Here, every reference carries the content hash of the note as it stood when the line was captured. A renamed note
is followed by exact hash match, and a note that cannot be placed is shown as unresolved instead of
silently dropped. The stored hash also lets you compare a file against what it was then. Reporting a note
that changed in place is not built yet.

Two smaller things follow from the design. The store is yours — markdown in your own notes
directory, not a vendor's account or a tool's private folder, so it stays portable, greppable,
git-committable, and readable if this project disappears. It is also why every client you use can
write to and read from the same records. And because your client writes the
summary while its context is still loaded, capture needs no second model call and no network
call. The
trade is that quality depends on your client honoring the style contract, set out in *What the
server tells the client*.

None of this competes on retrieval. A capable agent reading a well-organized notes directory
already retrieves well. This exists for the part an ephemeral session cannot be: memory across
time.

## What it does today

- Indexes the notes directory into a local SQLite FTS5 full-text index — a disposable, regenerable cache. Your files stay the source of truth.
- **Ambient capture.** As a session decides or produces something, your client leaves a line about it, and a Claude Code, Grok, Codex, Copilot CLI, Antigravity, or Muse Code Stop hook appends that line to `<notes>/_librarian/sessions/<date>.md`, referencing touched notes by content hash. The client is asked for one line per separable outcome rather than one per session — a working session usually leaves three or four — grouped back into a single account of that session when you read it. A line the same session already recorded is skipped (the exact rule is in [`docs/memory-of-use.md`](./docs/memory-of-use.md#where-rutter-keeps-what-it-remembers)). Durable, git-committable, written by your client.
- **A style contract on that line.** Write for a smart reader in a hurry who wasn't in the session: outcome first, common words over session shorthand, no invented codenames or version tags, about 40 words. The contract is guidance carried in the server's MCP instructions. The server does not rewrite a summary for style — over-budget summaries are reported on the capture path and then stored without edits. It does normalize each line to one line (control characters dropped, whitespace collapsed) and cut it past 2,000 characters; see [the style contract](./docs/memory-of-use.md#the-style-contract).
- **Workspace provenance.** Each entry carries the session's working directory, a project name derived from it, and the git remote URL when there is one, so a day spanning three efforts reads cleanly. Nothing to configure; resolution is pure local file reads — it never runs `git` and never contacts a remote.
- Four read-only MCP tools:
  - `librarian-search` — ranked full-text search. Every result carries its path, `type`/`status`/`created` provenance, and a matching snippet. Multi-word queries are AND-matched, so "blue man group" finds notes with all three rather than any. A result you engaged before also carries a quiet prior-engagement note, additive only, never re-ranking.
  - `librarian-get-note` — one note's full content, by path.
  - `librarian-recent` — *"what was I working on lately?"* Sessions newest-first, with dates, project, and provenance; optional `project` filter, `window` in days, or `count`.
  - `librarian-positions` — *"what do I think about X, and did that change?"* Query one of three ways: `topic` for an exact topic key (one answer or an explicit not-found), `query` for free text matched against your recorded stances, or `note` for the positions that reference a note by path. Each answer is the topic's current stance with the dates it was formed and last revised; add `chain: true` for the whole supersession history.
- **Instructions that travel with the server.** Any connected client is told to reach for `librarian-recent` on recency questions and `librarian-search` on "have I seen this?" questions before reading files directly, and to report recalled summaries in plain language — including entries written before the contract existed, which is the only way dense old records ever read clearly. No per-project client configuration.
- **Instruments its own use.** A local per-ISO-week count of how often the stateful behavior gets reached for.
- **Position capture** *(decision-graph Phase A)*. When your client forms, changes, reaffirms, or retires a stance on a topic, it leaves a second, rarer kind of line — a position directive — appended to `<notes>/_librarian/positions/<YYYY-MM>.md`, a wholly separate append-only stream from session records. The directive's kind (`assert`, `revise`, `reaffirm`, `retire`) selects what the event does; the stance prose is not classified, and only two strings in it are read — a `[[wikilink]]` becomes a versioned reference and `revises: <event-id>` records the event it replaces — with neither removed from the stored text. Not rewritten for style, idempotent per distinct directive.
- **Position recall** *(decision-graph Phase B)*. `librarian-positions` answers "what do I think about X, and how did that change?" from those streams. A topic's **live position** is the stance on its most recent event; where that event is a `retire`, you get a retired stub carrying the retirement's own recorded text — never the stance it withdrew, and nothing is removed from the history to produce it. Every answer states its provenance: the date the position was **formed** (its original `assert`) and, where there is one, the date it was last **revised** — a reaffirmation re-endorses a stance without moving that date. A position nothing has touched in a long while is marked **dormant**, computed fresh on every read from the events' own timestamps and stored nowhere; a retired position is never marked dormant. The whole thing is a projection: three SQLite tables rebuilt wholesale from `<notes>/_librarian/positions/*.md` at every `npm run reindex`, and rebuilt from nothing else. **Reindex is the only trigger** — a position captured since the last reindex is not recalled until the next one runs, which is a disclosed lag rather than a silent gap, and which is what keeps recall from being able to disturb capture at all.
- **Note identity survives a rename.** A reference records the note's path *and* its content hash as captured. "Dead" means the path is missing from disk, full stop, regardless of file type — a reference to any confined vault artifact (a `.gitignore`, an exported `.html`, a file under `_librarian/` itself) is live for as long as that file exists, whether or not it's an indexed markdown note. Rename a referenced note without touching its content and the next `npm run reindex` binds the old reference to its new path automatically — no heuristics, no similarity scoring, just an exact content-hash match — and `librarian-recent` / search enrichment quietly resolve through it. If reindex can't tell (the note was also edited, so no current note's hash matches; or more than one current note shares the hash), the reference renders explicitly as unresolved with its candidates on `librarian-recent`, and on search enrichment against any candidate note that happens to be a search result, and stays that way until you confirm it with `npm run identity-confirm`. A reference with no candidates at all (renamed *and* edited) is visible on `librarian-recent` only — that listing is the complete discovery surface for unresolved references; enrichment is candidate-anchored and cannot mention what has no candidate. On the search surface, a mere candidate is never annotated as if it had been engaged with; the unresolved state and its candidates render as a separate, explicit note instead. A confirmed binding is sticky: if the vault later changes such that automatic exact-hash matching would point somewhere else, the confirmed binding still wins, and the disagreement is surfaced ("confirmed X; the hash now matches Y") rather than silently overridden — only re-running `npm run identity-confirm` moves it. The stored session record is never rewritten either way.

## Known limitations

Stated here rather than discovered later:

- **Older records are dense.** The style contract and its word budget arrived after the first
  fortnight of capture, and existing records are never retrofitted. Early entries read like build
  logs. Read-time guidance is the only layer that reaches them.
- **Quality depends on your client.** The server holds no model, so a client that ignores the style
  contract produces summaries the server will faithfully store anyway.
- **Shared across your tools, not across people.** One person's tools share one memory. Nothing
  here addresses records shared between people, ratification, or whose version of a decision wins.
  Those are the hard problems at team scale and none of them are solved here.
- **Records name the client, not the model.** A session entry or position event carries a `client`
  label (`claude`, `grok`, `codex`, or `agy`) when the hook can establish it, so you can see which
  client stopped writing summaries. It is the host, not the model: `agy` runs Gemini and Claude
  models, and no hook payload says which. A label is left off rather than guessed, so records from
  before the label existed, hand-registered hooks, and ambiguous turns show none. You cannot filter
  or search by client yet.
- **Capture depends on each tool's model following the instructions.** The hook only lifts a line the
  model wrote. Claude Code, Grok, Codex, and Antigravity were each checked with a real session. A model
  that skips the line leaves nothing to capture.
- **A rebuild can briefly overlap another session.** The server rebuilds its index when it starts
  and finds changes, which drops and recreates the tables for about a second per few thousand notes.
  A search from another open session at that instant can come back empty. It is rare, because an
  unchanged index is never rebuilt, and it clears on the next call.
- **A reference shows what was captured, not what was read.** The client chooses which paths to
  list, and the hash is taken when capture runs, after the turn. rutter cannot establish that the
  model read a file, that a file produced the conclusion, that capture is complete, or that a note at
  an unchanged path has not changed since (that report is not built). Append-only is a rule the
  server follows, not tamper-proof auditing. See [what rutter can and cannot
  establish](./docs/memory-of-use.md#what-rutter-can-and-cannot-establish).
- **Semantic search is stubbed.** `embeddings.ts` is a port with no implementation; retrieval is
  full-text only.
- **Under active evaluation.** The stateful behavior is behind a usage gate — the project measures
  whether it actually gets reached for, and is prepared to conclude that it doesn't.

## Requirements

- **Node ≥ 22** (uses the built-in `node:sqlite` — no native build step; FTS5 included). Verified on Node 26.
- A directory of markdown notes. Obsidian is what it was built against — wikilinks and frontmatter
  are understood — but nothing requires Obsidian itself.
- Claude Code, Grok, Codex, Copilot CLI, Antigravity, or Muse Code, for ambient capture. The MCP tools work with any MCP client.
  The table in *One memory across your AI tools* shows how each of the six captures and links to its setup. Claude Code
  lifts the directive from the transcript, and so do Copilot CLI and Antigravity (from the current turn). Grok, Codex, and Muse Code
  use the Stop event's final assistant message, so with Codex and Muse Code the directive must be in the final reply.

## Setup

**Point it at your notes first.** The default is the author's own path, and an unreadable
directory is not an error — you get a successful reindex reporting zero notes, which looks like
a working install until you search and find nothing.

From npm:

```bash
export LIBRARIAN_VAULT_PATH=/path/to/your/notes   # do this before reindexing
npm install -g rutter-memory
rutter-memory reindex  # expect a non-zero note count; zero means the path is wrong
```

The `rutter-memory` command starts the MCP server when run with no arguments, which is how a
client launches it. It also takes `reindex [--force]`, `recent`, and `install-hook`;
`rutter-memory help` lists them. Installing `rutter-memory` also gives you a `rutter` command,
the same program under a shorter name; that is unrelated to the `rutter` package on npm.

From a clone, to work on the code:

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
| `LIBRARIAN_DB_PATH` | npm install: `~/.local/share/rutter/<id>/librarian.db`, one per notes folder. Clone: `<repo>/data/librarian.db` | Where the derived index lives. An npm install honors `$XDG_DATA_HOME` in place of `~/.local/share`. An index serves only the notes folder that built it; a second folder pointed at the same file is refused, and `reindex --force` hands the file over. |
| `LIBRARIAN_USER_LABEL` | `the user` | How the server describes whose work this is, in the instructions and tool descriptions your client receives. Set it to your name and the client is told it is looking at *your* work, which reads more naturally than "the user's". |

Memory-of-use (session records, the use log) lives under `<notes>/_librarian/` — inside your notes
directory, never in this code repo. See [`docs/memory-of-use.md`](./docs/memory-of-use.md).

**New here?** Read [`docs/overview.md`](./docs/overview.md) for what the librarian is and how it
works, then [`docs/memory-of-use.md`](./docs/memory-of-use.md) for the capture / recall /
enrichment / gate behaviors in depth. The same docs are published readable at
[shinytoyrobots.github.io/rutter](https://shinytoyrobots.github.io/rutter/) —
`npm run site-drift` reports when that site has drifted from these files. [`docs/roadmap.md`](./docs/roadmap.md) is the current
sequencing.
[`docs/decision-graph.md`](./docs/decision-graph.md) is the design behind positions — why a position is a
projection over the append-only event log rather than a second thing you maintain — and
[`docs/decision-graph-plan.md`](./docs/decision-graph-plan.md) is the build plan that split it into phases.

## Try it from the CLI

From an npm install, `rutter-memory recent` takes the same arguments as `npm run recent` below.
Search, the usage gate, and `identity-confirm` run only from a clone:

```bash
npm run search -- bitemporal forgetting memory   # full-text search
npm run recent                                   # recent session summaries
npm run recent -- --days 7                        # just the last week
npm run recent -- --project rutter           # just one project (case-insensitive)
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
instructions, which the server sends to every client on connect. Register the hook, restart, done.
Antigravity and Copilot CLI are the exceptions. Antigravity saves those instructions as a file instead
of putting them in the prompt, and Copilot loads them only once a rutter tool is called, so both
installers also write an instructions file. (Full detail in
[`docs/memory-of-use.md`](./docs/memory-of-use.md).)

**1. Register the Stop hook.** From an npm install, run:

```bash
rutter-memory install-hook                       # adds the hook to ~/.claude/settings.json
rutter-memory install-hook --client codex        # Codex: ~/.codex/hooks.json (then trust it via /hooks)
rutter-memory install-hook --client antigravity  # Antigravity: ~/.gemini/config/hooks.json
rutter-memory install-hook --client copilot      # Copilot CLI: ~/.copilot/hooks/rutter.json
```

Install globally (`npm install -g`), not through `npx`: the hook is registered by absolute path, and
the `npx` cache can be cleared at any time. After switching Node versions, reinstall and re-run the
same line; it moves the existing hook to the new path rather than adding a second one.

From a clone, either run:

```bash
npm run build && npm run install-hook          # adds the hook to ~/.claude/settings.json
npm run build && npm run install-hook -- --client codex   # Codex: ~/.codex/hooks.json (then trust it via /hooks)
npm run build && npm run install-hook -- --client antigravity   # Antigravity: ~/.gemini/config/hooks.json
npm run build && npm run install-hook -- --client copilot       # Copilot CLI: ~/.copilot/hooks/rutter.json
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
the newly built server. Verify with `/mcp` (four tools), then check captures land in
`<notes>/_librarian/sessions/` after your next real session.

### What the server tells the client

The hook captures nothing if the client never leaves a summary, and the server contains no
AI to write one — so the server *asks* for it. The contract block here is quoted verbatim from
`SERVER_INSTRUCTIONS` in [`src/server.ts`](./src/server.ts), which is the single source of
the contract; a test (COR-R-030) fails if this copy drifts from it.

<!-- BEGIN capture-contract -->
> When a session decides or produces something worth recalling later, leave a session summary -- emit one directive line, in this form:
>
> <!-- librarian-session {"summary":"<one plain-English line>","refs":["<paths touched, relative to the knowledge base>"]} -->
>
> Emit a line for each separable thing as you finish it, rather than saving everything for one line at the end; omit trivial work entirely. A capture hook lifts the newest such line after each turn; nothing else is needed, and no tool call records it. A later line describes ONLY what is new since your previous one.
>
> Write each line for a smart reader in a hurry who was not in this session: lead with what was decided or produced, prefer common words to this session's shorthand, and expand or avoid codenames, version tags and abbreviations this session invented (terms the vault itself uses are fine). Aim for about 40 words and stop by 60 -- one line, not a build log; it is stored verbatim.
>
> When you form, change, reaffirm, or retire a stance on a topic, leave a position line too: `<!-- librarian-position POSITION assert|revise|reaffirm|retire <topic-key>: <stance> -->` -- stored separately, byte-verbatim, and rare (most sessions emit none).
<!-- END capture-contract -->

The paragraph beginning "Write each line" is the **style contract** (see
[the style contract](./docs/memory-of-use.md#the-style-contract)) — the only thing standing between you
and a directory full of summaries you can't read in six months. The server will not help here:
it does not rewrite what it is given, whatever style it is in. An unfilled template is the
one exception: a summary still wrapped in `<angle brackets>` is treated as "no directive"
rather than stored, so copying the directive line without filling it in captures nothing.

The working directory arrives with the Stop event, so the project on each entry needs no
setup either.

**If captures stop landing**, the fallback is to paste that contract block into your global
`~/.claude/CLAUDE.md` as a standing rule. That is belt-and-braces, not a required step — and if
you need it, that is a bug worth reporting, because the server is meant to carry this on its own.

## Install as a Claude plugin

The plugin bundles the server and the capture hook, so there is nothing to build, register or
edit by hand. Once it is installed as a plugin, Claude Code asks for one thing — the
folder of notes to search — and starts the server and the Stop hook on its own.

rutter is listed in the Anthropic Directory, for Claude Code and Cowork. Claude Code has the
directory built in: find rutter under `/plugin` → Discover, or run

```
/plugin install rutter@anthropic-plugin-directory
```

The directory serves the version Anthropic last reviewed, which can trail this repository. To
track the repository directly, install from its own marketplace instead:

```
/plugin marketplace add shinytoyrobots/rutter
/plugin install rutter@rutter
```

Pick one route, not both: two installs register two servers and two capture hooks.

Choose your notes folder when asked, then run `/reload-plugins`. If you install from a shell
instead (`claude plugin install rutter@anthropic-plugin-directory`, or `rutter@rutter` after adding
the marketplace), pass `--config vault_path=/path/to/notes` or run `/plugin configure` with the same
plugin name afterwards; without a notes folder the server has nothing to read.

Ambient capture has been checked in Claude Code, Codex, and Antigravity, in Grok 1.0.62 and Muse Code 1.4.10 through the installer (Grok on a machine that never had Claude Code), and in one Copilot CLI
session, which was captured and then recalled from Claude Code. The directory also
lists rutter for Cowork; capture there has not been checked.

- **What it runs.** A local MCP server (`node dist/stdio.js`) and a Stop hook
  (`hooks/librarian-stop.sh`). Both are plain Node and shell that you can read in this repository;
  `dist/` is the committed TypeScript build, so the code that runs is the code on GitHub.
- **Where it keeps things.** The search index lives in the plugin's own data folder
  (`~/.claude/plugins/data/…`) and survives updates. Session records go in `_librarian/` inside
  your notes folder.
- **The index looks after itself.** The server builds it the first time it starts, and rebuilds it
  when it next starts after your notes, session records or position streams have changed. Start a
  new session to pick up changes made mid-session.
- **If you already registered the hook by hand** (`rutter-memory install-hook` or `npm run install-hook`), remove that entry from
  `~/.claude/settings.json` when you add the plugin, or captures are attempted twice. The duplicate
  is detected and not stored twice, but it is wasted work.
- **Maintainers:** `dist/` is committed so the plugin works straight from a clone. Run
  `npm run build` and commit the result whenever `src/` changes.

## Set up Grok, Codex, Copilot CLI, Antigravity, and Muse Code

Claude Code has the one-command plugin. The other four take a few more steps. Whichever you use,
point it at the same notes folder as your other clients, or each one keeps its own memory.

### Grok

Grok needs no Claude Code. Install rutter from npm, then run the installer:

```bash
npm install -g rutter-memory
rutter-memory install-hook --client grok
```

The installer writes `~/.grok/hooks/rutter.json` (or `$GROK_HOME/hooks/rutter.json`) and prints a
`grok mcp add` line with your notes folder in it. You run that line yourself; the installer never
does. Grok reads `LIBRARIAN_VAULT_PATH` from the shell that launches it, so set it there if your
notes are not in `~/Documents/knowledge-vault`. If Grok already runs rutter's hook from the Claude Code
plugin, the installer says so and writes nothing.

The hook reads only Grok's final assistant message, so put the summary line at the end of the final
reply. Grok clips that message at 32,768 characters, so on a very long turn a trailing line can be
lost. If the final message holds two lines, only the last is kept. The [Grok
path](./docs/getting-started.md#grok-path) has the full sequence.

### Codex

Codex cannot use the plugin. It fills in none of a plugin's variables and installs no hook.
Verified with Codex 0.160.0. Install rutter with `npm install -g rutter-memory`, then:

1. Export `LIBRARIAN_VAULT_PATH` in the shell that launches Codex. Its hooks see only that
   environment, not `~/.claude/settings.json`. Without it they write captures to the default folder.
2. Register the server with `codex mcp add rutter … -- rutter-memory`, passing your notes path with
   `--env LIBRARIAN_VAULT_PATH=…`. See the [Codex path](./docs/getting-started.md#codex-path) in `docs/getting-started.md`.
3. Install the hook with `rutter-memory install-hook --client codex`. Then trust it in Codex with
   `/hooks`. Installing does not grant trust, and an untrusted hook never runs.
4. Expect the summary line in Codex's final reply, because that is where its hook looks for it.
   If the final reply holds two lines, only the last is kept.

### GitHub Copilot CLI

Verified with Copilot CLI 1.0.98. Install rutter with `npm install -g rutter-memory`, then:

1. Export `LIBRARIAN_VAULT_PATH` in the shell that launches Copilot. The hook inherits that
   environment. Without it, captures go to the default folder.
2. Run `rutter-memory install-hook --client copilot`. It writes `hooks/rutter.json` and
   `instructions/rutter.instructions.md` under `~/.copilot` (or `$COPILOT_HOME`), and refuses to
   replace either file if it didn't write it. Your other hook files and your own
   `copilot-instructions.md` are never touched.
3. Run the `copilot mcp add` line the installer prints. It carries `LIBRARIAN_VAULT_PATH`
   explicitly, because Copilot passes only `PATH` to an MCP server.
4. Keep the instructions file. Copilot loads a server's instructions only when one of its tools is
   called, so most sessions would never see the capture contract. In testing, the server's contract
   alone wasn't enough: the model wrote the line only once the file led with a Copilot-specific line
   saying when the line applies, which the installer writes.

Copilot's screen hides the summary line, since it is an HTML comment. The hook reads the current
turn's assistant messages from `~/.copilot/session-state/<session>/events.jsonl`. Copilot writes
that file a moment after the hook starts, so the hook waits up to three seconds for the turn to land.
If the turn holds two lines, only the last is kept.

### Antigravity CLI

This covers the `agy` command-line tool, verified with `agy` 1.3.2. It does not cover the Antigravity
IDE. Install rutter with `npm install -g rutter-memory`, then set it up by hand:

1. Run `rutter-memory install-hook --client antigravity --vault <your notes folder>`.
   It registers the Stop hook in `~/.gemini/config/hooks.json` and writes the capture rule to
   `~/.gemini/config/rules/rutter-capture.md`. Without `--vault` it keeps the folder an existing
   rutter hook already uses, then tries `LIBRARIAN_VAULT_PATH` from your shell, then the default
   folder, and says which.
2. Run the `agy mcp add` line the installer prints. It carries the same notes folder as the hook,
   so writes and reads use one folder. The installer decides the folder once because the two sides
   learn it differently. The MCP server's folder is stored config. A hook has no config of its own
   and inherits the shell that launched `agy`. Left to the environment, a decision once went to the
   real vault while `agy` could read only a test one. An exported `LIBRARIAN_VAULT_PATH` still
   overrides the hook's default.
3. Keep the rule file. `agy` saves an MCP server's instructions as a file instead of putting them in
   the prompt. In testing, the model wrote no summary lines from those, nor from the same text in
   an `AGENTS.md`. A global `trigger: always_on` rule is injected every turn. With it, Gemini Flash,
   Gemini Pro, and Claude Sonnet each wrote the line after a decision and none after a trivial
   question. Re-run the installer to refresh the rule.
4. Expect the line anywhere in the turn. The Stop event carries no reply text, so the hook reads the
   current turn's assistant messages from `agy`'s transcript. If the turn holds two lines, only the
   last is kept. An earlier turn's directive is never read again.

To move to another notes folder, re-run the installer with a new `--vault`, then re-run
`agy mcp add`. Each capture prints `in vault <path>` on stderr, visible in `agy`'s log under
`~/.gemini/antigravity-cli/log/`. It says so when the default was used.


### Muse Code

Verified with Muse Code 1.4.10 (`muse`, Meta's terminal agent). Install rutter with
`npm install -g rutter-memory`, then run `rutter-memory install-hook --client muse --vault <your notes folder>`.
It adds the Stop hook and an optional `rutter` server entry to `~/.config/muse/settings.json`, and a marked
block to `~/.config/muse/AGENTS.md`, because Muse's model wrote no summary lines from the server's
instructions alone. Muse runs hooks with a cleared environment, so the notes folder is baked into the hook. The
installer refuses a symlinked or unparseable file and never changes text outside its own block. Start a new
Muse session afterward. Details, and what was and wasn't verified, are in the
[Muse Code path](./docs/getting-started.md#muse-code-path).

## Wire it into Claude Code

New to the project? [`docs/getting-started.md`](./docs/getting-started.md) has a setup path for
each client, from install to first recall.

After `npm run build`, from the repository root:

```bash
claude mcp add rutter --scope user -- node "$PWD/dist/stdio.js"
```

`--scope user` registers the server for every Claude Code session, in any directory.
Without it the server is project-local to this repository — invisible from the
directories where you actually work.

The server refreshes its index when it starts, so a new session picks up changes on its own; run `npm run reindex` to refresh without restarting. Ask things like
*"search my notes for the thing I did about X"* and the client will call `librarian-search`.

## Project layout

```
src/
  config.ts          notes + db + _librarian paths, ignore list
  vault.ts           markdown walk + frontmatter parse
  db.ts              node:sqlite open + FTS5 schema
  indexer.ts         full reindex (notes -> cache)
  startup-index.ts   build the index at start if missing, rebuild only if notes or records changed
  search.ts          FTS5 query + get-note
  embeddings.ts      stubbed port (not implemented)
  server.ts          MCP tool registration (search, get-note, recent, positions) + server instructions
  stdio.ts           stdio entry point (local Claude Code)
  # memory-of-use:
  fs-safe.ts         write choke point: path confinement + atomic, append-only writes
  sanitize.ts        untrusted summary -> one inert line
  refs.ts            versioned identity (path + content-hash)
  workspace.ts       workspace provenance (cwd -> project + git remote, local reads only)
  session-record.ts  typed record format + append-preserving persistence
  capture.ts         ambient capture orchestration
  directive.ts       parse the client's session-summary directive (no inference)
  positions.ts       position-event stream format + append-preserving persistence (decision-graph Phase A)
  position.ts        position capture orchestration
  position-directive.ts  parse the client's position directive (no inference)
  position-fold.ts   fold the position streams into the rebuildable projection (reindex only, Phase B)
  position-recall.ts librarian-positions' three query modes + what is computed rather than stored
  position-render.ts how a recalled position is worded (attribution, retired stub, inert rendering)
  recent.ts          librarian-recent (grouping / project / window / count / empty-state)
  enrichment.ts      additive prior-engagement annotation on search results
  instrumentation.ts append-only use log + per-ISO-week counts
  identity.ts        note identity: exact-hash rename binding + the rebuildable projection
  app.ts             application seam (domain + instrumentation), used by server + tests
  reindex.ts / search-cli.ts / recent-cli.ts / gate-cli.ts / capture-cli.ts / identity-confirm-cli.ts   CLIs
hooks/
  librarian-stop.sh  Claude Code / Grok / Codex / Copilot CLI / Antigravity / Muse Code Stop hook -> capture-cli
  hooks.json         registers that hook when installed as a Claude plugin
.claude-plugin/      plugin manifest (name, version, how it starts the server, notes-folder option, listing links) and marketplace
dist/                committed build, so the plugin runs straight from a clone
spec/                the executable spec — scenarios, requirements, conformance mapping
test/                node:test suite (temp fixture directories; never touches your real notes)
```

## How this is built

Behavior is specified before it is written. [`spec/spec.md`](./spec/spec.md) holds Given-When-Then
scenarios and the requirements derived from them, each mapped to the tests that grade it, and every
amendment records what was rejected and why.

If you want to understand a decision here, that file is the honest account. This README is the
summary; the spec is the detail.

## Privacy Policy

rutter runs entirely on your machine. This section is the whole policy.

**What it collects.** Nothing is collected by the author or by any third party. The server reads
the notes folder you point it at, and never changes your notes. It writes five kinds of local
file, all of which you can open and read. Four live in a `_librarian/` folder inside your notes
folder; the fifth lives with the plugin:

- **Session records** in `_librarian/sessions/`: the one-line summaries your AI client writes as a
  session decides or produces something, stored without rewriting (normalized to one line), together with the paths and content
  hashes of the notes it cited, the working directory, the project name derived from it, the
  session ID, which client wrote it (one of four fixed names, never the model), and the git remote URL of that directory if it has one (read from `.git/config`;
  never contacted, and any token, password or query string in it is removed before it is stored).
- **Position records** in `_librarian/positions/`: the stances your client records on a topic, when
  you form, change or retire one, stored the same way with their dates.
- **A note-identity ledger** (`_librarian/note-identity.md`): when a note you referenced has been
  renamed, which path the reference now points to, as the old and new paths with a content hash.
  It is written when the index is rebuilt or when you confirm a match.
- **A usage log** (`_librarian/stateful-use.jsonl`): a timestamp and the name of the recall tool
  each time you used one, so you can tell whether they are worth keeping.
- **A search index** (a SQLite file in the plugin's own data folder, in
  `~/.local/share/rutter/` for an npm install, in `data/` in a clone, or wherever
  `LIBRARIAN_DB_PATH` points), built
  from your notes and the records above so searches are fast. It is a cache and can be deleted and
  rebuilt at any time.

**How it is used and stored.** Only to answer your own searches and recall questions, on your own
computer. Nothing is sent anywhere: the code makes no network requests and has no analytics or
telemetry. Two things of rutter's own run: the local server, which spawns no other programs, and a
capture hook, `hooks/librarian-stop.sh`, which runs the local `dist/capture-cli.js` after each
turn to write the records above. Neither reads credentials or API keys. The AI client you use (for
example Claude) sees whatever the tools return to it, under that client's own privacy terms, which
rutter does not control.

**Third-party sharing.** None.

**Retention.** For as long as you keep the files. Session records, position records, the identity
ledger and the usage log are append-only by design; to remove them, delete the `_librarian/` folder
in your notes folder. To remove the index, delete the plugin's data folder (uninstalling the plugin
does this), the `data/` folder of a clone, or for an npm install `~/.local/share/rutter/`
(uninstalling the package does not remove it). If you set `XDG_DATA_HOME`, that install's index is
in `$XDG_DATA_HOME/rutter/` instead, and if you set `LIBRARIAN_DB_PATH`, it is the file that names
along with its `-wal` and `-shm` files. Quit the clients using it first. Nothing is held anywhere else.

**Contact.** Questions or concerns: [open an issue](https://github.com/shinytoyrobots/rutter/issues)
or email robin@shinytoyrobots.com.

## License

MIT. See [`LICENSE`](./LICENSE).

---

The index is a cache. The notes are yours. The record is the point.
