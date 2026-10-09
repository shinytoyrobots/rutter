# Getting started: from zero to your first recall

By the end of this lesson your notes will answer *"what was I working on lately?"* The answer comes from records your AI coding sessions (Claude Code, Grok, Codex, or Antigravity) leave behind on their own, unasked. Every tool you set up writes to the same records, so each one can recall what the others decided.

We will install rutter, index your notes, and write one memory by hand so you see a result in the first few minutes. Then we will turn on ambient capture and watch a real working session record itself.

Eight steps. Each one ends with something you can check.

## Before you start

- **Node 22 or newer.** Check with `node -v`. npm warns at install time on an older Node — heed it, because the built-in `node:sqlite` this depends on will simply be missing. Verified on Node 26.
- **npm and git.**
- **Claude Code, Grok, Codex, or Antigravity.** The four MCP tools work with any MCP client; the Stop hook that powers ambient capture runs in all four of these. Claude Code and Grok read it from `~/.claude/settings.json`; Codex reads it from `~/.codex/hooks.json` (or `$CODEX_HOME/hooks.json`); Antigravity reads it from `~/.gemini/config/hooks.json`.
- **A directory of markdown notes.** Obsidian is what rutter was built against — it understands wikilinks and frontmatter — but nothing requires Obsidian itself.
- **No compiler toolchain.** There are zero native dependencies. The index is Node's built-in SQLite, so there is nothing to build and no database to install.

**Using Codex? It takes a few extra steps.** Codex cannot use rutter's one-command plugin install: it fills in none of a plugin's variables and installs no hook. So you set it up by hand from this clone, and the differences are easy to miss:

1. Register the server with `codex mcp add`, passing your notes path at registration (Step 5).
2. Install the Stop hook with `npm run install-hook -- --client codex`, then trust it with `/hooks` (Step 6). Installing does not grant trust, and an untrusted hook never runs.
3. Export `LIBRARIAN_VAULT_PATH` in the shell that launches Codex, because its hooks see only that environment, not `~/.claude/settings.json` (Step 2).
4. Expect the summary line in Codex's final reply, since that is where its hook looks for it.

Verified with Codex 0.160.0 (October 2026).

**Using Antigravity (`agy`)? It also takes a few extra steps.** This covers the `agy` command-line tool, not the Antigravity IDE. It has no one-command plugin install either, so you set it up by hand from this clone:

1. Build, then register the server with `agy mcp add`, passing your notes path at registration (Step 5).
2. Install the Stop hook and a capture rule file with `npm run install-hook -- --client antigravity --vault /path/to/your/notes` (Step 6). Use the same notes path as in the first step. The rule file is needed: `agy` does not put the server's instructions in the prompt, and without the rule its model did not leave summaries on its own.
3. Expect `agy` to leave the summary line anywhere in the current turn. The hook reads the turn from `agy`'s transcript file.

Verified with `agy` 1.3.2 (October 2026).

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

You can skip this step in day-to-day use: the server builds its index the first time it starts and refreshes it whenever it next starts after your notes have changed. Running it by hand is the quickest way to confirm your path is right.

**If it says `0 notes indexed`, stop here and fix the path.** An unreadable notes directory is not an error — you get a successful-looking reindex over nothing. Everything downstream will install cleanly and then recall nothing at all. Check the `vault:` line against where your notes actually are, re-export, and reindex again.

### Make the path stick

Two things later in this lesson run outside this terminal: the MCP server that your client launches, and the capture hook. Both read `LIBRARIAN_VAULT_PATH`, and neither sees an `export` you typed in one shell session.

Set it once for every Claude Code session, in `~/.claude/settings.json`. Grok and Codex are different; see below. Merge this into the file, keeping whatever is already there:

```json
{ "env": { "LIBRARIAN_VAULT_PATH": "/Users/you/path/to/your/notes" } }
```

The top-level `env` object sets environment variables for Claude Code sessions. It covers the MCP server and the Stop hook together, however you launch Claude Code — from the GUI, Raycast, an IDE terminal, or tmux. You will meet this same file again in Step 6, where the hook installer writes to it.

A shell-profile `export` also works, but only when `claude` launches from a shell that re-sourced the edited profile.

**Grok does not fill in the plugin's notes-folder option.** If your notes are not in the default `~/Documents/knowledge-vault`, export `LIBRARIAN_VAULT_PATH` in the shell profile that launches Grok.

**Codex does not read that file.** A Codex hook inherits only the environment Codex itself was launched with; a `shell_environment_policy` entry in `~/.codex/config.toml` does not reach it. If your notes are not in the default `~/Documents/knowledge-vault`, export `LIBRARIAN_VAULT_PATH` in the shell profile that launches Codex (and re-source it), or the hook will quietly write captures to the default location instead.

**Antigravity needs neither.** Its installer takes `--vault` and builds that path into the hook as a default (Step 6). The server gets the same path from the `agy mcp add` line (Step 5).

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

Compile the TypeScript, then register the server with your client. Run these from the repository root. The first commands are for Claude Code. Codex and Antigravity have their own, each in a labeled paragraph.

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

**Codex.** Register the server with Codex instead, passing the vault path at registration (Codex does not read the `env` block from `~/.claude/settings.json`):

```bash
npm run build
codex mcp add rutter --env LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes" -- node "$PWD/dist/stdio.js"
```

Check it with `codex mcp list`: `rutter` should appear as `enabled`. An `Auth` column reading `Unsupported` is normal for a local stdio server. This sets the path for the server only; the Codex Stop hook in Step 6 reads it from Codex's own launch environment.

**Antigravity.** Register the server with `agy mcp add`. Flags go before the server name, and the vault path is passed at registration:

```bash
npm run build
agy mcp add --env LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes" --env LIBRARIAN_DB_PATH="$PWD/data/librarian.db" rutter "$(which node)" "$PWD/dist/stdio.js"
```

Check it with `agy mcp list`: `rutter` should appear as `enabled`. The `LIBRARIAN_DB_PATH` value is where the index lives, and any writable path works. The Stop hook in Step 6 needs the same notes path. If the two differ, captures go to one folder and reads come from another. The Step 6 installer prints this same command, so you can compare.

Any other MCP client works too: register `node "$PWD/dist/stdio.js"` as a stdio server and give it `LIBRARIAN_VAULT_PATH`.

**Verify.** In Claude Code, start a fresh session and run this. For Codex use `codex mcp list` instead, and for Antigravity use `agy mcp list`:

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

**Codex.** Codex reads hooks from its own config, so install there explicitly:

```bash
npm run install-hook -- --client codex
```

This merges into `~/.codex/hooks.json` (or `$CODEX_HOME/hooks.json`). The hook finds your notes through `LIBRARIAN_VAULT_PATH` in Codex's own environment (see Step 2), so export it before launching Codex. Codex will not run a new hook until you trust it: start Codex, run `/hooks`, review the Librarian Stop hook, and trust it. The installer does not grant trust. If an equivalent hook is already registered inline in `~/.codex/config.toml`, the installer stops and tells you rather than stacking a second one. Codex hands the hook only the final assistant message of each turn, so a directive left in earlier commentary is not captured; the server's instructions teach the client to put it in the final reply.

**Antigravity.** Install the hook and the capture rule in one command, passing your notes folder:

```bash
npm run install-hook -- --client antigravity --vault /path/to/your/notes
```

This adds a `librarian-capture` hook to `~/.gemini/config/hooks.json` and writes `~/.gemini/config/rules/rutter-capture.md`. The installer prints which notes folder it chose and where that came from. The hook uses that folder as its default no matter which shell launches `agy`; an exported `LIBRARIAN_VAULT_PATH` still overrides it. Re-running with a different `--vault` updates the hook in place. It refuses to overwrite a rule file it did not write. Use the same notes path you gave `agy mcp add` in Step 5. Run `/hooks` in `agy` to review the hook. Each capture prints the vault it wrote to in `agy`'s log, under `~/.gemini/antigravity-cli/log/`.

**There is nothing to add to your `CLAUDE.md`.** The whole capture contract ships inside the server as MCP instructions, and the server sends it to every client on connect. Antigravity does not put those instructions in the model's prompt, which is why its installer writes a rule file. That contract covers when to leave a summary, its exact syntax, and how to write it. Setup is the hook, and that is all.

## Step 7 — Restart, and let a real session record itself

Hooks are read at session start, so quit your client and start it again.

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

This time, ask your client rather than the CLI. In Claude Code, Grok, Codex, or Antigravity:

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

The server refreshes its index each time it starts, so a new session picks up changes to your notes on its own. Run `npm run reindex` when you want a refresh without restarting. The index is a disposable cache — your files stay the source of truth.
