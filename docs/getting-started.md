# Getting started: from zero to your first recall

By the end of this lesson your notes will answer *"what was I working on lately?"* The answer comes from records your Claude Code sessions leave behind on their own, unasked.

We will install rutter, index your notes, and write one memory by hand so you see a result in the first few minutes. Then we will turn on ambient capture and watch a real working session record itself.

Eight steps. Each one ends with something you can check.

## Before you start

- **Node 22 or newer.** Check with `node -v`. npm warns at install time on an older Node — heed it, because the built-in `node:sqlite` this depends on will simply be missing. Verified on Node 26.
- **npm and git.**
- **Claude Code.** The three MCP tools work with any MCP client, but the Stop hook that powers ambient capture is Claude Code specific.
- **A directory of markdown notes.** Obsidian is what rutter was built against — it understands wikilinks and frontmatter — but nothing requires Obsidian itself.
- **No compiler toolchain.** There are zero native dependencies. The index is Node's built-in SQLite, so there is nothing to build and no database to install.

## Step 1 — Clone and install

```bash
git clone https://github.com/shinytoyrobots/rutter.git
cd rutter
npm install
```

Every command in this lesson runs from that repository directory.

## Step 2 — Point it at your notes and build the index

rutter reads one directory of markdown notes. Configure the path to yours right away — before the first index, and before anything else depends on it. Set it, then index:

```bash
export LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes"
npm run reindex
```

You should see your real note count:

```text
[rutter] reindex complete: 1284 notes indexed, 0 skipped, 912ms
  vault: /Users/you/Documents/notes
  index: /Users/you/rutter/data/librarian.db
[rutter] identity pass: 0 dead ref(s) checked, 0 bound, 0 unresolved, 0 ledger entries appended, 3ms
```

*Output shape verified against code; your paths, dates, and counts will differ.*

**If it says `0 notes indexed`, stop here and fix the path.** An unreadable notes directory is not an error — you get a successful-looking reindex over nothing. Everything downstream will install cleanly and then recall nothing at all. Check the `vault:` line against where your notes actually are, re-export, and reindex again.

### Make the path stick

Two things later in this lesson run outside this terminal: the MCP server that Claude Code launches, and the capture hook. Both read `LIBRARIAN_VAULT_PATH`, and neither sees an `export` you typed in one shell session.

Set it once for every Claude Code session, in `~/.claude/settings.json`. Merge this into the file, keeping whatever is already there:

```json
{ "env": { "LIBRARIAN_VAULT_PATH": "/Users/you/path/to/your/notes" } }
```

The top-level `env` object sets environment variables for Claude Code sessions. It covers the MCP server and the Stop hook together, however you launch Claude Code — from the GUI, Raycast, an IDE terminal, or tmux. You will meet this same file again in Step 6, where the hook installer writes to it.

A shell-profile `export` also works, but only when `claude` launches from a shell that re-sourced the edited profile.

Two other variables are optional. `LIBRARIAN_DB_PATH` moves the index, which defaults to `data/librarian.db` inside the repository and is resolved from the module's own location rather than your working directory. `LIBRARIAN_USER_LABEL` is a bare noun — `Robin`, not `Robin's` — used as "<label>'s work" in the descriptions your client receives.

## Step 3 — Capture your first memory by hand

No hook yet. We will write a record directly, so you can see the whole loop working before adding any moving parts.

First confirm you are starting from nothing:

```bash
npm run recent
```

```text
No recent sessions recorded yet.
```

Now write one record:

```bash
echo '{"summary":"Set up rutter and captured this first memory by hand.","refs":[]}' | npm run capture
```

You should see:

```text
[librarian-capture] captured 1 entry into 2026-08-05 session record.
```

*Output shape verified against code; your date will differ.*

That summary is now stored as you wrote it. Nothing rewrites it, shortens it, or judges it — control characters are stripped and runs of whitespace collapsed, and that is the whole of it.

## Step 4 — Recall it

```bash
npm run recent
```

```text
2026-08-05 10:15:00 — Set up rutter and captured this first memory by hand.
```

*Output shape verified against code; your date and time will differ.*

That is your first recall. The bytes you piped in came back unchanged.

Notice there is no project name in brackets. A payload piped in by hand carries no working directory, so there is no project to name. Ambient captures do carry one, and you will see it in Step 8.

Three flags are worth knowing now:

```bash
npm run recent -- 3            # the three most recent sessions
npm run recent -- --days 7     # just the last week
npm run recent -- --project rutter   # one project, case-insensitive
```

## Step 5 — Build and register the MCP server

Compile the TypeScript, then register the server with Claude Code. Run both from the repository root:

```bash
npm run build
claude mcp add rutter --scope user -- node "$PWD/dist/stdio.js"
```

Use `--scope user` and an absolute path. Without the flag the server registers project-local to the repository, which leaves it invisible from the directories where you actually work.

The `env` block from Step 2 already hands the server your vault path. To scope that to this one server instead, pass it at registration:

```bash
claude mcp add rutter --scope user -e LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes" -- node "$PWD/dist/stdio.js"
```

That covers the server alone. The Stop hook in Step 6 still reads the `env` block, so most people want Step 2's route.

**Verify.** Start a fresh Claude Code session and run:

```text
/mcp
```

You should see `rutter` listed with four tools: `librarian-search`, `librarian-get-note`, `librarian-recent`, and `librarian-positions`.

## Step 6 — Install the Stop hook

The hook is the one piece that cannot ship inside the server: MCP has no way to install a client hook.

```bash
npm run install-hook
```

You should see:

```text
[install-hook] registered the Stop hook in /Users/you/.claude/settings.json.
[install-hook] restart Claude Code, then check <vault>/_librarian/sessions/ after your next session.
```

That message is your verification. If you instead see this, the build from Step 5 did not run:

```text
[install-hook] dist/capture-cli.js is missing -- run `npm run build` first.
```

The installer refuses rather than register a hook that would fail on every event. Run `npm run build`, then try again.

The installer is deliberately cautious. It merges into `~/.claude/settings.json` rather than replacing it, and never touches your other Stop hooks. It writes via a temp file and rename, so an interrupted run cannot truncate your client config. Re-running it is safe:

```text
[install-hook] already registered in /Users/you/.claude/settings.json; nothing to do.
```

The registered script always exits 0, so a failure inside capture can never break one of your sessions.

**There is nothing to add to your `CLAUDE.md`.** The whole capture contract ships inside the server as MCP instructions, and reaches every client on connect. That contract covers when to leave a summary, its exact syntax, and how to write it. Setup is the hook, and that is all.

## Step 7 — Restart, and let a real session record itself

Hooks are read at session start, so quit Claude Code and start it again.

Now open a project directory you actually work in and do something small but real: one decision, or one small change. A "hello" will not do, because there is nothing there worth recalling.

As it finishes, your client leaves a directive line of its own accord:

```text
<!-- librarian-session {"summary":"Renamed the archive folder and updated the two notes that linked to it.","refs":["Notes/Archive.md"]} -->
```

You never write that line yourself — the server's instructions teach your client the form. It is shown here only so you recognize one when it goes past. The summary aims for about 40 words and stops by 60. An empty summary, or one still wrapped in `<angle brackets>`, captures nothing.

The Stop event fires at the end of every assistant turn, not at session end. Capture is idempotent per distinct directive, so the same line being re-presented a dozen times appends exactly one record.

**Verify.** A file should now exist for today's UTC day:

```bash
ls "$LIBRARIAN_VAULT_PATH/_librarian/sessions/"
```

```text
2026-08-05.md
```

*Output shape verified against code; your date will differ.*

If nothing appeared, check that Step 6 printed its success line and that the `env` block from Step 2 names the right notes directory. The README documents a `CLAUDE.md` paste-in as a last-resort fallback if captures still refuse to land.

## Step 8 — Recall again, and read the record

This time, ask your client rather than the CLI. In Claude Code:

> What was I working on lately?

Your client should call `librarian-recent` and report back the session you just finished, in plain language. That is the same memory you read in Step 4, now reached through the tool.

Then read the record yourself. It is a markdown file in your own notes directory:

```bash
cat "$LIBRARIAN_VAULT_PATH/_librarian/sessions/$(date -u +%F).md"
```

```markdown
---
collection: librarian.sessions
schema: session-record@1
day: '2026-08-05'
sessions:
  - id: 20260805T101500123Z
    time: '2026-08-05T10:15:00.123Z'
    summary: Set up rutter and captured this first memory by hand.
    refs: []
  - id: 20260805T142233871Z
    session_id: 0b9f2c41-...
    time: '2026-08-05T14:22:33.871Z'
    summary: Renamed the archive folder and updated the two notes that linked to it.
    refs:
      - path: Notes/Archive.md
        hash: 3f1a9c2e7b40d8...
    workspace:
      cwd: /Users/you/Development/notes-cleanup
      project: notes-cleanup
refs:
  - path: Notes/Archive.md
    hash: 3f1a9c2e7b40d8...
---

# Sessions - 2026-08-05

- 10:15:00 - Set up rutter and captured this first memory by hand.
- 14:22:33 [notes-cleanup] - Renamed the archive folder and updated the two notes that linked to it. (refs: Notes/Archive.md@3f1a9c2e7b40d8)
```

*Output shape verified against code; hashes are trimmed here, and your paths, dates, and project names will differ.*

The frontmatter is the source of truth. The regenerated body of the file is for human eyes, and is rewritten each time the day's record grows. Each reference records the note's path *and* its content hash as it was read, which is what lets a rename be followed later.

If your notes directory is a git repository, `_librarian/` will be tracked and committed along with everything else. That is intended: the memory is durable, plain markdown, and travels with your notes.

## What to do next

You now have ambient capture running end-to-end. Three things are worth reading once the records start accumulating:

- **[`docs/memory-of-use.md`](./memory-of-use.md) §2–3** — capture and recall in depth, including the style contract that decides whether these summaries are readable in six months.
- **[`docs/memory-of-use.md`](./memory-of-use.md) §4** — search enrichment, the quiet prior-engagement note on search results.
- **[`docs/memory-of-use.md`](./memory-of-use.md) §6** — note identity, and what happens to a reference when you rename the note it points at.

The project also measures whether any of this actually gets used. `npm run gate` shows the per-ISO-week count; [§5](./memory-of-use.md) explains what it is for.

One habit to keep: re-run `npm run reindex` when your notes change materially. The index is a disposable cache — your files stay the source of truth.
