# Getting started: from zero to your first recall

By the end of this lesson your notes will answer *"what was I working on lately?"* The answer comes from records your AI sessions (in Claude Code, Grok, Codex, or Antigravity) leave behind on their own, unasked, whether the session was research, drafting, planning, or reading over your notes. Every tool you set up writes to the same records, so each one can recall what the others decided.

This lesson is for people who keep their notes as markdown files and are comfortable configuring an AI client: editing a settings file, registering an MCP server, running a few `npm` commands. The tools (`librarian-*`), the environment variables (`LIBRARIAN_*`), and the `_librarian/` folder kept the project's earlier name, *librarian*; they are all parts of rutter.

## Choose your path

Pick the path for your client. Each one is a single sequence, and each ends with something you can check.

| You use | Follow | What it takes |
|---------|--------|---------------|
| Claude Code | [Fast path for Claude Code](#fast-path-for-claude-code) | A few minutes; nothing to clone |
| Grok | [Grok path](#grok-path) | The Claude Code plugin, plus one environment variable |
| Codex | [Codex path](#codex-path) | A clone, and a hook you trust |
| Antigravity CLI (`agy`) | [Antigravity path](#antigravity-path) | A clone, a hook, and a rule file |
| Claude Code, from a clone | [The manual route](#the-manual-route-step-by-step) | Eight steps, starting with a record written by hand |
| Any other MCP client | [Steps 1, 2, and 5](#step-1--clone-and-install) | Search and recall only: with no hook, nothing is captured |

Every path ends in two checks, kept separate on purpose. **Capture:** a new line landed in today's file under `_librarian/sessions/`. **Recall:** your client can answer from it. A record written by hand ([Step 3](#step-3--capture-your-first-memory-by-hand)) shows that storage and recall work. It does not show ambient capture, which needs a real session and a hook.

## Fast path for Claude Code

If you use Claude Code, the plugin is the shortest route. It bundles the server and the capture hook, so you skip Steps 1 to 6 below. Steps 2 to 4 also use `npm run` scripts from a clone you will not have. Running those steps on top of the plugin registers a second server and a second hook.

**1. Install.** rutter is listed in the Anthropic Directory, which Claude Code has built in. In Claude Code, find it under `/plugin` → Discover, or run:

```text
/plugin install rutter@anthropic-plugin-directory
```

The directory serves the version Anthropic last reviewed, which can trail this repository. To track the repository directly, install from its own marketplace instead:

```text
/plugin marketplace add shinytoyrobots/rutter
/plugin install rutter@rutter
```

Pick one route, not both. Two installs register two servers and two capture hooks. The rest of this lesson writes `rutter@rutter`; if you installed from the directory, use `rutter@anthropic-plugin-directory` wherever a command names the plugin.

Choose your notes folder when asked, then run `/reload-plugins`. If you install from a shell (`claude plugin install rutter@anthropic-plugin-directory`, or `rutter@rutter` after adding the marketplace), pass `--config vault_path=/path/to/notes` or run `/plugin configure` with the same plugin name afterward. Without a notes folder the server has nothing to read.

**2. Check the server.** Run this in Claude Code:

```text
/mcp
```

You should see `rutter` listed with four tools: `librarian-search`, `librarian-get-note`, `librarian-recent`, and `librarian-positions`.

**3. Do one small real task.** Open a project directory you work in and make one decision or one small change. A "hello" leaves nothing worth recalling. As the work finishes, your client leaves a one-line summary on its own. You never write it yourself.

**4. Confirm it was captured.** A file for today's UTC day should now exist in your notes folder:

```bash
ls "/path/to/your/notes/_librarian/sessions/"
```

```text
2026-08-05.md
```

*Output shape verified against code; your date will differ.*

**5. Recall it.** Ask your client:

> What was I working on lately?

Your client calls `librarian-recent` and reports the session you just finished, in plain language. The stored line looks like this:

```text
2026-08-05 14:22:33 [notes-cleanup] — Renamed the archive folder and updated the two notes that linked to it.
```

*Output shape verified against code; your date, project name, and wording will differ.*

**If you ever ran `npm run install-hook` by hand,** remove that Stop hook entry from `~/.claude/settings.json` when you add the plugin. Otherwise capture is attempted twice. The duplicate is detected and stored once, but it is wasted work. To see the hooks Claude Code has active, run `/hooks`.


## Before you start

- **Node 22 or newer.** Check with `node -v`. npm warns at install time on an older Node — heed it, because the built-in `node:sqlite` this depends on will simply be missing. Verified on Node 26.
- **npm and git.**
- **Claude Code, Grok, Codex, or Antigravity.** The four MCP tools work with any MCP client; the Stop hook that powers ambient capture runs in all four of these. Where each finds the hook: Claude Code runs the plugin's hook or one registered in `~/.claude/settings.json`, and Grok runs those same Claude Code hooks; Codex reads `~/.codex/hooks.json` (or `$CODEX_HOME/hooks.json`); Antigravity reads `~/.gemini/config/hooks.json`. Where each finds your notes folder is a separate question, answered in [Make the path stick](#make-the-path-stick): Grok and Codex take it from the shell that launched them, not from `~/.claude/settings.json`.
- **A directory of markdown notes.** Obsidian is what rutter was built against — it understands wikilinks and frontmatter — but nothing requires Obsidian itself.
- **No compiler toolchain.** There are zero native dependencies. The index is Node's built-in SQLite, so there is nothing to build and no database to install.

## Grok path

Grok picks up the rutter plugin from your Claude Code install, server and hook included. There is no separate Grok registration step, and no `grok mcp add`.

**1. Install the Claude Code plugin.** Follow item 1 of the [fast path](#fast-path-for-claude-code).

**2. Give Grok your notes folder.** Grok does not fill in the plugin's notes-folder option. If your notes are not in the default `~/Documents/knowledge-vault`, add this to the shell profile that launches Grok, then re-source it:

```bash
export LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes"
```

A line on stderr says when the default folder was used for that reason.

**3. Do one small real task.** Start Grok from that shell and make one decision or one small change. The summary line belongs at the end of Grok's final reply. The hook reads only the final assistant message, and Grok clips that message at 32,768 characters, so on a very long turn a trailing line can be cut off and lost. If the final message holds two lines, only the last is kept.

**4. Check capture.** A file for today's UTC day should exist, and its new entry should carry `client: grok`:

```bash
ls "$LIBRARIAN_VAULT_PATH/_librarian/sessions/"
```

**5. Check recall.** Ask Grok *"What was I working on lately?"* It should call `librarian-recent` and report the session you just finished.

## Codex path

Codex cannot use the plugin: it fills in none of a plugin's variables and installs no hook. You set it up from a clone. Check [Before you start](#before-you-start) first. Verified with Codex 0.160.0 (October 2026).

**1. Clone, install, and build.**

```bash
git clone https://github.com/shinytoyrobots/rutter.git
cd rutter
npm install
npm run build
```

**2. Set your notes folder where Codex starts.** A Codex hook inherits only the environment Codex itself was launched with. It does not read `~/.claude/settings.json`, and a `shell_environment_policy` entry in `~/.codex/config.toml` does not reach it. Add this to the shell profile that launches Codex, then re-source it:

```bash
export LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes"
```

Without it, the hook writes captures to the default `~/Documents/knowledge-vault`, and its stderr line says the default was used. Run `npm run reindex` to check the path: a non-zero note count means it is right, and [Step 2](#step-2--point-it-at-your-notes-and-build-the-index) shows the full output.

**3. Register the server,** passing the notes path at registration:

```bash
codex mcp add rutter --env LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes" -- node "$PWD/dist/stdio.js"
```

Check it with `codex mcp list`: `rutter` should appear as `enabled`. An `Auth` column reading `Unsupported` is normal for a local stdio server. This sets the path for the server only. The hook gets it from step 2.

**4. Install the hook, then trust it.**

```bash
npm run install-hook -- --client codex
```

This merges into `~/.codex/hooks.json` (or `$CODEX_HOME/hooks.json`). If an equivalent hook is already registered inline in `~/.codex/config.toml`, the installer stops and tells you rather than stacking a second one. Codex will not run a new hook until you trust it: start Codex, run `/hooks`, review the Librarian Stop hook, and trust it. Installing does not grant trust, and an untrusted hook never runs.

**5. Do one small real task.** Restart Codex from the shell in step 2 and make one decision or one small change. The summary line must be in Codex's final reply. The hook reads only the final assistant message, so a line left in earlier commentary is not captured, and if the final reply holds two lines, only the last is kept. The server's instructions tell the client to put it there.

**6. Check capture.** A file for today's UTC day should exist, and its new entry should carry `client: codex`:

```bash
ls "$LIBRARIAN_VAULT_PATH/_librarian/sessions/"
```

**7. Check recall.** Ask Codex *"What was I working on lately?"* It should call `librarian-recent` and report the session you just finished. If step 6 found the file but Codex says no sessions are recorded, the server is reading a different folder from the one the hook writes to: compare the paths in steps 2 and 3.

## Antigravity path

This covers the `agy` command-line tool, not the Antigravity IDE. It has no plugin install either, so you set it up from a clone. Check [Before you start](#before-you-start) first. Verified with `agy` 1.3.2 (October 2026).

**1. Clone, install, and build.**

```bash
git clone https://github.com/shinytoyrobots/rutter.git
cd rutter
npm install
npm run build
```

**2. Install the hook and the capture rule,** passing your notes folder:

```bash
npm run install-hook -- --client antigravity --vault /path/to/your/notes
```

This adds a `librarian-capture` hook to `~/.gemini/config/hooks.json` and writes `~/.gemini/config/rules/rutter-capture.md`. The rule file is needed: `agy` does not put the server's instructions in the prompt, and without the rule its model did not leave summaries on its own. The installer prints which notes folder it chose and where that came from; without `--vault` it uses `LIBRARIAN_VAULT_PATH` from your shell, then the default. The hook uses that folder as its default no matter which shell launches `agy`, and an exported `LIBRARIAN_VAULT_PATH` still overrides it. Re-running with a different `--vault` updates the hook in place. It refuses to overwrite a rule file it did not write.

**3. Register the server** with the `agy mcp add` line the installer printed. It has this shape, with flags before the server name:

```bash
agy mcp add --env LIBRARIAN_VAULT_PATH="$HOME/path/to/your/notes" --env LIBRARIAN_DB_PATH="$PWD/data/librarian.db" rutter "$(which node)" "$PWD/dist/stdio.js"
```

Check it with `agy mcp list`: `rutter` should appear as `enabled`. The `LIBRARIAN_DB_PATH` value is where the index lives, and any writable path works. The notes path must match step 2, or captures go to one folder and reads come from another.

**4. Do one small real task.** Restart `agy`, run `/hooks` to review the hook, then make one decision or one small change. The summary line can be anywhere in the current turn: the hook reads the turn's assistant messages from `agy`'s transcript file. If the turn holds two lines, only the last is kept. A turn that ended in an error captures nothing.

**5. Check capture.** A file for today's UTC day should exist, and its new entry should carry `client: agy`. Each capture also prints the vault it wrote to in `agy`'s log, under `~/.gemini/antigravity-cli/log/`.

```bash
ls /path/to/your/notes/_librarian/sessions/
```

**6. Check recall.** Ask `agy` *"What was I working on lately?"* It should call `librarian-recent` and report the session you just finished.

## The manual route, step by step

Steps 1 to 8 set up Claude Code from a clone instead of the plugin. They start with a record written by hand, so you can see storage and recall work before adding the hook, then turn on ambient capture. Any other MCP client can follow Steps 1, 2, and 5 for search and recall; without a hook it captures nothing. The Codex and Antigravity paths above link here where the output needs explaining.

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

Set it once for every Claude Code session, in `~/.claude/settings.json`. Merge this into the file, keeping whatever is already there:

```json
{ "env": { "LIBRARIAN_VAULT_PATH": "/Users/you/path/to/your/notes" } }
```

The top-level `env` object sets environment variables for Claude Code sessions. It covers the MCP server and the Stop hook together, however you launch Claude Code — from the GUI, Raycast, an IDE terminal, or tmux. You will meet this same file again in Step 6, where the hook installer writes to it.

A shell-profile `export` also works, but only when `claude` launches from a shell that re-sourced the edited profile.

Grok, Codex, and Antigravity get the path differently: see the [Grok](#grok-path), [Codex](#codex-path), and [Antigravity](#antigravity-path) paths.

Two other variables are optional. `LIBRARIAN_DB_PATH` moves the index, which defaults to `data/librarian.db` inside the repository and is resolved from the module's own location rather than your working directory. `LIBRARIAN_USER_LABEL` is a bare noun — `Robin`, not `Robin's` — used as `<label>'s work` in the descriptions your client receives.

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
[librarian-capture] captured 1 entry into 2026-08-05 session record in vault /Users/you/Documents/notes (rutter 0.5.0).
```

*Output shape verified against code; your date will differ.*

That summary is now stored. Nothing judges it or rewrites it for style. It is normalized to sit in the record as one line: control characters are stripped, runs of whitespace collapse, and newlines fold into spaces. A line past 2,000 characters is cut. [The style contract](./memory-of-use.md#the-style-contract) has the full rule.

## Step 4 — Recall it

```bash
npm run recent
```

```text
2026-08-05 10:15:00 — Set up rutter and captured this first memory by hand.
```

*Output shape verified against code; your date and time will differ.*

That is your first recall. A plain one-line summary like this one comes back exactly as you piped it in.

Notice there is no project name in brackets. A payload piped in by hand carries no working directory, so there is no project to name. Ambient captures do carry one, and you will see it in Step 8.

Three flags are worth knowing now:

```bash
npm run recent -- 3            # the three most recent sessions
npm run recent -- --days 7     # just the last week
npm run recent -- --project rutter   # one project, case-insensitive
```

## Step 5 — Build and register the MCP server

Compile the TypeScript, then register the server with your client. Run these from the repository root. These commands are for Claude Code; the [Codex](#codex-path) and [Antigravity](#antigravity-path) paths have their own.

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

Any other MCP client works too: register `node "$PWD/dist/stdio.js"` as a stdio server and give it `LIBRARIAN_VAULT_PATH`.

**Verify.** In Claude Code, start a fresh session and run this:

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

**There is nothing to add to your `CLAUDE.md`.** The whole capture contract ships inside the server as MCP instructions, and the server sends it to every client on connect. Antigravity does not put those instructions in the model's prompt, which is why its installer writes a rule file. That contract covers when to leave a summary, its exact syntax, and how to write it. Setup is the hook, and that is all.

## Step 7 — Restart, and let a real session record itself

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

*Output shape verified against code; your date will differ.*

If nothing appeared, check that Step 6 printed its success line and that the `env` block from Step 2 names the right notes directory; [If something goes wrong](#if-something-goes-wrong) has the full list. The README documents a `CLAUDE.md` paste-in as a last-resort fallback if captures still refuse to land.

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
    client: claude
refs:
  - path: Notes/Archive.md
    hash: 3f1a9c2e7b40d8...
---

# Sessions - 2026-08-05

- 10:15:00 - Set up rutter and captured this first memory by hand.
- 14:22:33 [notes-cleanup] - Renamed the archive folder and updated the two notes that linked to it. (refs: Notes/Archive.md@3f1a9c2e7b40d8)
```

*Output shape verified against code; hashes are trimmed here, and your paths, dates, and project names will differ.*

The `client` field names the host that wrote the entry. The hand-written first entry has none, because a hand-piped payload carries no host identity.

The frontmatter is the source of truth. The regenerated body of the file is for human eyes, and is rewritten each time the day's record grows. Each reference records the note's path *and* its content hash as the file stood when capture ran, which is what lets a rename be followed later.

If your notes directory is a git repository, `_librarian/` will be tracked and committed along with everything else. That is intended: the memory is durable, plain markdown, and travels with your notes.

## Check, pause, or remove capture

Capture runs without asking, so it helps to know how to see it, stop it, and undo it. This section describes what exists today. Where rutter has no feature for something, it says so.

### Notice when capture stops

- **Look for the line.** After a session that decided something, today's file in `_librarian/sessions/` should have a new entry, and `npm run recent` (or asking your client) should show it. A session with no new line was not captured.
- **Read the hook's status line.** After each turn the hook writes one line to stderr, for example `no session directive found; nothing captured.` or `captured 1 entry into 2026-08-05 session record in vault /Users/you/Documents/notes (rutter 0.5.0).` When `LIBRARIAN_VAULT_PATH` was not set for the hook, the line says the default folder was used. Where a client shows hook output varies; `agy` keeps it in its log under `~/.gemini/antigravity-cli/log/`.
- **Check the `client` label.** Each entry names the client that wrote it, when the hook can tell. If one client's entries stop appearing while others continue, that client has stopped capturing.

The usage count from `npm run gate` measures recall, not capture. It is not a capture monitor.

### Pause capture

rutter has no pause switch. A line is captured whenever the hook runs and the model has left one. To stop capture, stop the hook:

- **Claude Code plugin:** `/plugin disable rutter@rutter` turns off the plugin's server and hook together.
- **Grok:** Grok loads the hook from your Claude Code plugin install, and it does not honor the plugin being disabled in Claude Code. Setting `GROK_CLAUDE_HOOKS_ENABLED=false` does not reach plugin hooks either. Two things do: turn the hook off in Grok's `/hooks` tab (select it and press Space), or uninstall the plugin from Claude Code with `/plugin uninstall rutter@rutter`, which removes it from Grok as well. The disable and uninstall behavior was checked with `grok inspect` on Grok 1.0.50; the `/hooks` toggle is from Grok's own documentation.
- **A hook added by `npm run install-hook`:** delete its entry from the hook file named in [Before you start](#before-you-start). There is no uninstall command.
- **Codex:** remove the entry from `~/.codex/hooks.json`. A hook you have not trusted in `/hooks` never runs, so an untrusted hook is already paused.
- **Antigravity:** remove the hook entry, and delete `~/.gemini/config/rules/rutter-capture.md` so the model stops writing lines.

Hooks are read at session start, so restart the client after a change. Asking the model not to leave a line in one session usually works, but nothing enforces it.

### Remove a record you don't want

The server only appends; it has no delete command. The records are your markdown, so you remove an entry by hand:

- **A session line:** open `_librarian/sessions/<day>.md` and delete the entry from the `sessions:` list in the frontmatter. The frontmatter is the record. The body below it is regenerated from the frontmatter the next time that day's file grows, so delete the matching body line too if you want it gone now. The day's top-level `refs:` list is also rebuilt on the next write. Recall reads these files directly, so the entry disappears from recall at once.
- **A position:** delete the event from `_librarian/positions/<YYYY-MM>.md`, then run `npm run reindex` or restart the server, because positions are recalled from the index.
- **Keep the YAML valid.** If a file stops parsing, recall skips it, and capture refuses to write into it rather than overwrite it.
- **Mind your history.** If your notes folder is a git repository, the line stays in its history until you rewrite that history.

A hand edit is outside the append-only rule, which binds only the server, and nothing detects it.

## What leaves your machine

rutter's server and hook make no network calls and run no model. Your records and index stay in your notes folder and the index file.

That does not settle what your AI client sends. Whatever rutter's tools return becomes part of the client's context: search snippets, a full note from `librarian-get-note`, recalled summaries, and positions. The client sends its context to its model provider under the client's own terms. rutter cannot see or change that, and makes no promise about how a provider handles it. Point rutter at a folder you are content for your client to read.

## What to do next

You now have ambient capture running end-to-end. These are worth reading once the records start accumulating:

- **[Capturing session summaries](./memory-of-use.md#capturing-session-summaries) and [Recalling recent work](./memory-of-use.md#recalling-recent-work)** — capture and recall in depth, including [the style contract](./memory-of-use.md#the-style-contract) that decides whether these summaries are readable in six months.
- **[Search enrichment](./memory-of-use.md#search-enrichment)** — the quiet prior-engagement note on search results.
- **[Note identity](./memory-of-use.md#note-identity)** — what happens to a reference when you rename the note it points at.
- **[What rutter can and cannot establish](./memory-of-use.md#what-rutter-can-and-cannot-establish)** — what a recorded reference proves, and what it does not.

The project also measures whether any of this actually gets used. `npm run gate` shows the per-ISO-week count; [Measuring whether it gets used](./memory-of-use.md#measuring-whether-it-gets-used) explains what it is for.

The server refreshes its index each time it starts, so a new session picks up changes to your notes on its own. Run `npm run reindex` when you want a refresh without restarting. The index is a disposable cache — your files stay the source of truth.

## If something goes wrong

Each entry starts with what you see, then the usual cause, then the fix.

**`0 notes indexed` after `npm run reindex`.** The notes path is wrong, and an unreadable directory is not an error. Check the `vault:` line against where your notes actually are, re-export `LIBRARIAN_VAULT_PATH`, and reindex again (Step 2).

**`rutter` is missing from `/mcp`.** Either the server registered project-local, because `--scope user` was left off, or the plugin has not reloaded. Re-run the `claude mcp add` line from Step 5 with `--scope user`, or run `/reload-plugins` if you installed the plugin.

**No file appears in `_librarian/sessions/`.** Work through these in order:

1. Hooks are read at session start. Quit your client and start it again.
2. Step 6 should have printed `registered the Stop hook` (or `already registered`). If it printed `dist/capture-cli.js is missing`, run `npm run build` and install again.
3. Check that the notes path your client sees is the one you meant. The `env` block in `~/.claude/settings.json` covers Claude Code. Grok and Codex read the shell that launched them.
4. Do real work first. An empty summary, or one still wrapped in `<angle brackets>`, captures nothing.
5. If captures still refuse to land, the README documents a `CLAUDE.md` paste-in as a last-resort fallback.

**Captures land in `~/Documents/knowledge-vault` instead of your notes.** The hook did not see `LIBRARIAN_VAULT_PATH`, so it used the default. For Codex and Grok, export it in the shell profile that launches the client, then re-source the profile. Codex hooks do not read `~/.claude/settings.json`.

**Codex captures nothing.** The hook may be untrusted: start Codex, run `/hooks`, review the Librarian Stop hook, and trust it ([Codex path](#codex-path), step 4). Also check that the summary line is in Codex's final reply. The hook reads only the final message.

**Antigravity leaves no summaries.** The rule file `~/.gemini/config/rules/rutter-capture.md` should exist, and the model may never read the server's instructions without it. Re-run the installer from the [Antigravity path](#antigravity-path), step 2, if it is missing. A turn that ended in an error captures nothing.

**A long Grok turn loses its summary.** Grok clips its final message at 32,768 characters, so a directive near the end of a very long turn can be dropped. The [Grok path](#grok-path) has the full Grok setup.

**Every capture appears to be attempted twice.** You have both the plugin's hook and a hand-registered one. Remove the `npm run install-hook` entry from `~/.claude/settings.json`. The duplicate is detected and stored once, but it is wasted work.

**`node:sqlite` is missing.** Your Node is older than 22. Check with `node -v` and upgrade.
