# From source: set up Claude Code from a clone

This page is for contributors. It sets up Claude Code from a clone of the repository instead of the plugin, which is the route to take if you want to change rutter's code. Everyone else should use a path on [Getting started](./getting-started.md#choose-your-path).

The steps are numbered M1 to M8 so they never collide with the numbered steps on the per-client paths. They start with a record written by hand, so you can see storage and recall work before adding the hook (a script the client runs after each turn), then turn on ambient capture. A record written by hand shows that storage and recall work. It does not show ambient capture, which needs a real session and a hook.

*Output shape verified against code. The sample output on this page is illustrative, not a recorded run: your paths, dates, counts, and version strings will differ.*

Every command on this page runs from the repository directory. You need Node 22 or newer, npm, and git; [Before you start](./getting-started.md#before-you-start) has the details. Other MCP (Model Context Protocol) clients are better served by [Recall only, with npx](./getting-started.md#recall-only-with-npx).

## M1 — Clone and install

```bash
git clone https://github.com/shinytoyrobots/rutter.git
cd rutter
npm install
```

Every command on this page runs from that repository directory.

## M2 — Point it at your notes and build the index

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


You can skip this step in day-to-day use: the server builds its index the first time it starts and refreshes it whenever it next starts after your notes have changed. Running it by hand is the quickest way to confirm your path is right.

**If it says `0 notes indexed`, stop here and fix the path.** An unreadable notes directory is not an error — you get a successful-looking reindex over nothing. Everything downstream will install cleanly and then recall nothing at all. Check the `vault:` line against where your notes actually are, re-export, and reindex again.

### Make the path stick

Two things later on this page run outside this terminal: the MCP server that your client launches, and the capture hook. Both read `LIBRARIAN_VAULT_PATH`, and neither sees an `export` you typed in one shell session.

Set it once for every Claude Code session, in `~/.claude/settings.json`. Merge this into the file, keeping whatever is already there:

```json
{ "env": { "LIBRARIAN_VAULT_PATH": "/Users/you/path/to/your/notes" } }
```

The top-level `env` object sets environment variables for Claude Code sessions. It covers the MCP server and the Stop hook together, however you launch Claude Code — from the GUI, Raycast, an IDE terminal, or tmux. You will meet this same file again in M6, where the hook installer writes to it.

A shell-profile `export` also works, but only when `claude` launches from a shell that re-sourced the edited profile.

Grok, Codex, Copilot CLI, Antigravity, and Muse Code get the path differently: see the [Grok](./getting-started.md#grok-path), [Codex](./getting-started.md#codex-path), [Copilot CLI](./getting-started.md#copilot-cli-path), [Antigravity](./getting-started.md#antigravity-path), and [Muse Code](./getting-started.md#muse-code-path) paths.

Two other variables are optional. `LIBRARIAN_DB_PATH` moves the index. In a clone it defaults to `data/librarian.db` inside the repository, resolved from the module's own location rather than your working directory. An npm install keeps it out of the package folder, in `~/.local/share/rutter/<id>/librarian.db` (under `$XDG_DATA_HOME` if you set that), with a separate index for each notes folder. An index serves only the notes folder that built it: point two folders at one `LIBRARIAN_DB_PATH` and the second is refused, with a message saying how to fix it. `LIBRARIAN_USER_LABEL` is a bare noun — `Robin`, not `Robin's` — used as `<label>'s work` in the descriptions your client receives.

## M3 — Capture your first memory by hand

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
[librarian-capture] captured 1 entry into 2026-08-05 session record in vault /Users/you/Documents/notes (rutter <version>).
```


That summary is now stored. Nothing judges it or rewrites it for style. It is normalized to sit in the record as one line: control characters are stripped, runs of whitespace collapse, and newlines fold into spaces. A line past 2,000 characters is cut. [The style contract](./memory-of-use.md#the-style-contract) has the full rule.

## M4 — Recall it

```bash
npm run recent
```

```text
2026-08-05 10:15:00 — Set up rutter and captured this first memory by hand.
```


That is your first recall. A plain one-line summary like this one comes back exactly as you piped it in.

Notice there is no project name in brackets. A payload piped in by hand carries no working directory, so there is no project to name. Ambient captures do carry one, and you will see it in M8.

Three flags are worth knowing now:

```bash
npm run recent -- 3            # the three most recent sessions
npm run recent -- --days 7     # just the last week
npm run recent -- --project rutter   # one project, case-insensitive
```

## M5 — Build and register the MCP server

Compile the TypeScript, then register the server with your client. Run these from the repository root. These commands are for Claude Code; the [Codex](./getting-started.md#codex-path), [Copilot CLI](./getting-started.md#copilot-cli-path), and [Antigravity](./getting-started.md#antigravity-path) paths have their own.

```bash
npm run build
claude mcp add rutter --scope user -- node "$PWD/dist/stdio.js"
```

Use `--scope user` and an absolute path. Without the flag the server registers project-local to the repository, which leaves it invisible from the directories where you actually work.

The `env` block from M2 already hands the server your notes folder. To scope that to this one server instead, pass it at registration:

```bash
claude mcp add rutter --scope user -e LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes" -- node "$PWD/dist/stdio.js"
```

That covers the server alone. The Stop hook in M6 still reads the `env` block, so most people want M2's route.

Any other MCP client works too: register `node "$PWD/dist/stdio.js"` as a stdio server and give it `LIBRARIAN_VAULT_PATH`.

**Verify.** In Claude Code, start a fresh session and run this:

```text
/mcp
```

You should see `rutter` listed with four tools: `librarian-search`, `librarian-get-note`, `librarian-recent`, and `librarian-positions`.

## M6 — Install the Stop hook

The hook is the one piece that cannot ship inside the server: MCP has no way to install a client hook.

```bash
npm run install-hook
```

You should see:

```text
[install-hook] registered the Stop hook in /Users/you/.claude/settings.json.
[install-hook] restart Claude Code, then check <vault>/_librarian/sessions/ after your next session.
```

That message is your verification. If you instead see this, the build from M5 did not run:

```text
[install-hook] dist/capture-cli.js is missing -- run `npm run build` first.
```

The installer refuses rather than register a hook that would fail on every event. Run `npm run build`, then try again.

The installer is deliberately cautious. It merges into `~/.claude/settings.json` rather than replacing it, and never touches your other Stop hooks. It writes via a temp file and rename, so an interrupted run cannot truncate your client config. Re-running it is safe:

```text
[install-hook] already registered in /Users/you/.claude/settings.json; nothing to do.
```

The registered script always exits 0, so a failure inside capture can never break one of your sessions.

**There is nothing to add to your `CLAUDE.md`.** The whole capture contract ships inside the server as MCP instructions, and the server sends it to every client on connect. Antigravity does not put those instructions in the model's prompt, and Copilot CLI loads them only once a rutter tool is called, which is why their installers write an instructions file. That contract covers when to leave a summary, its exact syntax, and how to write it. Setup is the hook, and that is all.

## M7 — Restart, and let a real session record itself

Hooks are read at session start, so quit your client and start it again.

Now open a project directory you actually work in and do something small but real: one decision, or one small change. A "hello" will not do, because there is nothing there worth recalling.

As it finishes, your client leaves a directive line of its own accord:

```text
<!-- librarian-session {"summary":"Renamed the archive folder and updated the two notes that linked to it.","refs":["Notes/Archive.md"]} -->
```

You never write that line yourself — the server's instructions teach your client the form. It is shown here only so you recognize one when it goes past. The summary aims for about 40 words and stops by 60. That aim is guidance for the client; the server does not enforce it. An empty summary, or one still wrapped in `<angle brackets>`, captures nothing.

The Stop event fires at the end of every assistant turn, not at session end. Capture is idempotent within a session, so the same line being re-presented a dozen times appends exactly one record. [The duplicate rule](./memory-of-use.md#where-rutter-keeps-what-it-remembers) says exactly what counts as the same line.

**Verify.** A file should now exist for today's UTC day:

```bash
ls "$LIBRARIAN_VAULT_PATH/_librarian/sessions/"
```

```text
2026-08-05.md
```


If nothing appeared, check that M6 printed its success line and that the `env` block from M2 names the right notes folder; [If something goes wrong](./getting-started.md#if-something-goes-wrong) has the full list. The README documents a `CLAUDE.md` paste-in as a last-resort fallback if captures still refuse to land.

## M8 — Recall again, and read the record

This time, ask your client rather than the CLI. In Claude Code, Grok, Codex, Copilot CLI, Antigravity, or Muse Code:

> What was I working on lately?

Your client should call `librarian-recent` and report back the session you just finished, in plain language. That is the same memory you read in M4, now reached through the tool.

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
    client: claude
refs:
  - path: Notes/Archive.md
    hash: 3f1a9c2e7b40d8...
---

# Sessions - 2026-08-05

- 10:15:00 - Set up rutter and captured this first memory by hand.
- 14:22:33 [notes-cleanup] - Renamed the archive folder and updated the two notes that linked to it. (refs: Notes/Archive.md@3f1a9c2e7b40d8)
```


The `client` field names the host that wrote the entry. The hand-written first entry has none, because a hand-piped payload carries no host identity.

The frontmatter is the source of truth. The regenerated body of the file is for human eyes, and is rewritten each time the day's record grows. Each reference records the note's path *and* its content hash as the file stood when capture ran, which is what lets a rename be followed later.

If your notes directory is a git repository, `_librarian/` will be tracked and committed along with everything else. That is intended: the memory is durable, plain markdown, and travels with your notes.

## Next

Capture is running end to end. [Getting started](./getting-started.md#upgrading) covers upgrading and [troubleshooting](./getting-started.md#if-something-goes-wrong). To pause or remove capture, or to see what leaves your machine, read [Pause, remove, and privacy](./manage-and-privacy.md).
