# The Librarian: how it works and how to use it

A plain-English overview of the Librarian — what it is, how it works, how to set it up, and where it is heading. It reflects what exists **today**: search over your vault, plus the first slice of real memory — the Librarian now quietly remembers what each session decided, can tell you what you were working on lately, and recognizes notes you've engaged before. The larger vision (tracking how your *beliefs* change over time) is designed but not yet built, and is marked clearly as such.

## What the Librarian is

The Librarian is a small program that gives an AI assistant (Claude today, ChatGPT later) fast, reliable access to your Obsidian vault — and a memory of how you've used it. The long-term goal is a research companion that *remembers across time and thinks alongside you* — the "Librarian" from Neal Stephenson's *Snow Crash*.

Today it does two things:

1. **It searches your notes** and hands back the right ones, each tagged with where and when you wrote it.
2. **It remembers your sessions.** At the end of each Claude Code session, one curated line — "what did this session decide or produce?" — is saved into your vault, with links to the notes it touched. From that memory it can answer *"what was I working on lately?"* and quietly flag search results you've engaged before.

An important expectation to set early: for plain searching, you already had a good tool — Claude Code reading your organized vault. The memory is the point. The next two weeks are the test of whether you actually reach for it (the "desirability gate"): if the stateful behaviors don't pull you back at least a few times a week, the project stops here, cheaply, by design.

## How it works

The Librarian has two parts, and — this surprises people — **neither part contains an AI model.**

### Part 1: the index (built ahead of time)

When you run a reindex, the program reads every markdown file in your vault, separates the frontmatter from the body, and stores it in a local database with a full-text search index. FTS5 (the full-text search engine built into SQLite) is what makes searches fast.

This database is a **disposable cache**. Your vault stays the single source of truth. If the database is ever lost, you rebuild it from the vault in about a second.

### Part 2: the server (answers live)

A small always-running process holds that database open and offers three abilities to the AI assistant:

- `librarian-search` — search the vault; return ranked notes with their path, type, status, date, and a matching snippet. If a past session engaged one of the results, it carries a quiet "prior engagement" note with the date — purely additive, never re-ranked, silent otherwise.
- `librarian-get-note` — return one full note by its path.
- `librarian-recent` — *"what was I working on lately?"* — your recent session summaries, newest first, with dates and the notes each touched. Takes an optional day-window or count.

The assistant talks to this server using MCP (Model Context Protocol), the standard way AI tools connect to external data. On your Mac, that conversation is plain messages passed between the two programs.

### Part 3: the memory (written as you work)

Session memory lives **in your vault**, as ordinary markdown you can open in Obsidian: one file per day at `_librarian/sessions/<date>.md`, one curated line per session — not a transcript. Each line records what the session decided or produced and references the notes it touched by path *plus a content fingerprint*, so the record still tells you what you saw even after a note changes later. Records are only ever added to, never deleted — that's a hard rule, not a habit. Because it's plain markdown in your vault, it's yours: readable, editable, and committed to git along with your notes.

### Where the intelligence lives

The server itself does no reasoning. It runs a keyword search and returns text — the same kind of lookup a search box does. **All of the intelligence is the assistant you are already talking to.** In Claude Code, that is Claude. Point it at ChatGPT instead, and ChatGPT plays that role. The Librarian is the memory; the assistant is the brain.

## How the Librarian gets involved in a conversation

For answering questions the Librarian is **reactive**. It does nothing until the assistant calls it. A typical exchange runs like this:

1. You ask a question in plain language.
2. Claude judges whether your vault can answer it. If so, Claude calls `librarian-search` with a query it writes itself.
3. The Librarian runs the search and returns matching notes with their provenance — plus a quiet "you engaged this before, on this date" note on any result your past sessions touched.
4. Claude reads those results, optionally pulls a full note with `librarian-get-note`, then answers you.

You can also ask directly: "search my vault for X" or "what was I working on this week?" The Librarian never speaks to you on its own — it answers the assistant, and the assistant answers you.

**Remembering, by contrast, is ambient.** You do nothing. During a session, Claude drops a small hidden marker into the conversation — one line summarizing what the session decided, plus the notes it touched. When the session ends, a hook fires automatically, lifts that marker out of the transcript, and files it into your vault. No summary marker, nothing worth remembering — no entry, no empty file. The server never writes the summary itself (that would require it to think; it doesn't) — Claude authors the line, the Librarian just stores it faithfully.

## What model it uses

- **Inside the Librarian: none.** It is ordinary code plus a search index. No language model, and — for now — no embeddings either.
- **The assistant supplies the intelligence.** In Claude Code that is Claude; the model interprets your question, writes the search, and reasons over the results.
- **Search is by keyword, not meaning (yet).** Multiple words are matched together, so "blue man group" finds notes containing all three, not any one of them. It cannot yet match by meaning alone. That capability (semantic search) arrives with a small, local embedding model in a later phase.

## Set it up

### Before you start

- Node version 22 or newer. The Librarian uses Node's built-in SQLite, so there is no separate database to install. Check your version with `node -v`.
- An Obsidian vault of markdown files.

### Steps

1. Install and build:

   ```bash
   cd ~/Development/personal/my-librarian
   npm install
   npm run build
   ```

2. Build the search index from your vault:

   ```bash
   npm run reindex
   ```

   This reads `~/Documents/knowledge-vault` and finishes in about a second for a few thousand notes.

3. Check it works without Claude:

   ```bash
   npm run search -- pinakes tier forgetting
   ```

4. Register it with Claude Code so every session can use it:

   ```bash
   claude mcp add my-librarian --scope user -- node /Users/shinytoyrobots/Development/personal/my-librarian/dist/stdio.js
   ```

   The `--scope user` flag makes the Librarian available in every Claude Code session, in any directory.

5. Open a new Claude Code session and confirm the connection with the `/mcp` command. You should see `my-librarian` with three tools.

6. **Turn on remembering** (one-time): register the Stop hook in `~/.claude/settings.json` so session summaries are captured automatically at session end:

   ```json
   {
     "hooks": {
       "Stop": [ { "hooks": [ { "type": "command",
         "command": "/Users/shinytoyrobots/Development/personal/my-librarian/hooks/librarian-stop.sh" } ] } ]
     }
   }
   ```

   Then start a fresh Claude Code session (hooks are read at session start). The marker convention Claude uses to hand the hook its one-line summary is described in [`memory-of-use.md`](./memory-of-use.md) §2.

## Use it

Ask in plain language, and let Claude decide when to search:

> Search my vault for what I decided about forgetting in the Librarian design.

To read a specific result in full, ask Claude to open it — Claude calls `librarian-get-note` for you.

Ask about your own recent work and Claude calls `librarian-recent`:

> What was I working on this past week?

And check whether the memory is earning its keep (the two-week gate readout):

```bash
cd ~/Development/personal/my-librarian && npm run gate
```

## Keep the index current

The index is a snapshot, and it does not update on its own yet. After you add or edit a batch of notes, rebuild it:

```bash
cd ~/Development/personal/my-librarian && npm run reindex
```

Automatic updates are a planned convenience, deliberately left out of this first version.

## Where the Librarian is heading

**Continuity shipped** — "what was I working on?" and "have I seen this before?" work today. What remains is the deeper memory an ordinary assistant cannot have:

- **Belief over time** — it tracks that you thought X in March and Y in June, and shows both with dates rather than silently overwriting one.
- **Honest judgment** — when notes conflict, it marks the disagreement openly and reversibly, and never decides for you.
- **Safe forgetting** — pruning demotes a note to a small durable record rather than deleting it.

Which of those comes next is decided by *your behavior*, not a plan: during the two-week trial, keep a running "wish log" of what you wished it did. The full roadmap lives in [`DESIGN.md`](../DESIGN.md). These capabilities also explain a design choice you can see already: the assistant is always the brain, and the Librarian is the memory. Keeping that split is what will let the same Librarian serve both Claude and ChatGPT.

## Honest limitations today

- Search is keyword-based, so vague "the thing that was sort of like…" questions may still be answered better by Claude reasoning over your vault directly.
- The index must be rebuilt by hand after vault changes.
- It runs locally for Claude Code only. ChatGPT support is intentionally deferred.
- **Remembering depends on Claude leaving the marker.** If a session ends without one (or the hook isn't installed), that session simply isn't recorded. One line per session is deliberate — it keeps the memory curated rather than a transcript dump — but it also means the memory is only as good as the summaries.
- Session days use UTC, so a late-night session can file under the next day's date.
- Memory is per-session summaries only. Belief-tracking, conflict marks, and semantic search are designed but not built — and only get built if the two-week test says the memory is worth reaching for.

## Further reading

- [`README.md`](../README.md) — project overview and quick setup.
- [`memory-of-use.md`](./memory-of-use.md) — the memory in detail: record format, capture setup, the marker convention, and the gate readout.
- [`DESIGN.md`](../DESIGN.md) — the roadmap for memory and storage.
