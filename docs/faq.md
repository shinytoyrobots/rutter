# Frequently asked questions

These answers are for someone who has not read the rest of the docs. They cover how rutter behaves with more than one AI client, how to add a client to a working setup, and where to look when a record does not appear. [Known issues](#known-issues) is at the end.

rutter's tools (`librarian-*`), environment variables (`LIBRARIAN_*`), and the `_librarian/` folder keep the project's earlier name, *librarian*. They are all parts of rutter.

## How the pieces fit

### Do my clients share one memory?

Yes, if they all point at the same notes folder. Each client's capture hook writes to `_librarian/sessions/<date>.md` inside that folder. Each client reads those files back through its own rutter server. A decision captured in Grok is recalled in Codex.

If two clients point at different folders, each has its own memory. Nothing merges them.

"Shared" means one person's tools. It does not mean sharing with other people.

### What is shared, and what belongs to one client?

Shared, in the notes folder under `_librarian/`:

- `sessions/<UTC date>.md`: one line per captured session
- `positions/<YYYY-MM>.md`: stances you have formed or changed
- `stateful-use.jsonl`: which notes your sessions touched

Per client:

| Client | Hook file | Extra instructions file |
|--------|-----------|-------------------------|
| Claude Code | the plugin's `hooks/hooks.json`, or `~/.claude/settings.json` | none |
| Grok | `~/.grok/hooks/rutter.json` | none; Grok shows the model the server's instructions |
| Codex | `~/.codex/hooks.json` | none |
| Copilot CLI | `~/.copilot/hooks/rutter.json` | `~/.copilot/instructions/rutter.instructions.md` |
| Antigravity CLI (`agy`) | `~/.gemini/config/hooks.json` | `~/.gemini/config/rules/rutter-capture.md` |
| Muse Code | the `hooks` block of `~/.config/muse/settings.json` | a marked block in `~/.config/muse/AGENTS.md` |

Each client also has its own MCP registration. `$CODEX_HOME`, `$COPILOT_HOME`, and `$GROK_HOME` move those clients' locations.

### Is there one rutter server or several?

Each client starts its own server from its own registration. Nothing connects the servers to each other. The notes folder is the shared state.

The search index is a rebuildable cache, so servers can keep separate index files. The Claude Code plugin keeps its index in the plugin's data folder. An npm install keeps one under `~/.local/share/rutter/`, or under `$XDG_DATA_HOME` if you set it. A source clone uses `data/librarian.db`. All are rebuilt from your notes.

### How do I tell which client wrote a record?

Each record carries a `client` label in its frontmatter: `claude`, `grok`, `codex`, `agy`, `copilot`, or `muse`. The label names the host, not the model. The hook leaves it off when it cannot tell. You cannot yet filter or search by client.

### Do I need Claude Code to use rutter?

Not for Grok. The [Grok path](./getting-started.md#grok-path) installs from npm and was verified on a machine that has never had Claude Code.

For Codex, Copilot CLI, Antigravity, Muse Code, and the recall-only route, the docs describe npm-only installs. Those were tested only on a machine that also had Claude Code. See [Known issues](#known-issues).

## Adding a client

### I have Claude Code with the plugin and want to add Grok. What do I do?

Grok already runs the plugin's capture hook through its Claude Code compatibility layer. You have two routes. Pick one.

1. **Use what you have.** Set `LIBRARIAN_VAULT_PATH` in the shell that launches Grok to your notes folder. Grok does not fill in the plugin's notes-folder option. Without the variable, rutter uses its default folder, `~/Documents/knowledge-vault`.
2. **Use the Grok installer.** Run the following, then follow the [Grok path](./getting-started.md#grok-path). Skip its `grok mcp add` step if the plugin already supplies the server:

   ```bash
   rutter-memory install-hook --client grok
   ```

   If the installer finds the plugin's hook, it writes nothing and names the route it found. It still prints a `grok mcp add` line. The plugin may already supply a server, so skip that line unless you want a native registration. See the [two servers issue](#grok-may-load-two-rutter-servers).

Check what Grok loaded with `grok inspect`, or open `/hooks` inside Grok.

### I use Grok and have no Claude Code. What do I do?

Follow the [Grok path](./getting-started.md#grok-path). In short:

1. Install with `npm install -g rutter-memory`.
2. Export `LIBRARIAN_VAULT_PATH` in your shell profile.
3. Run `rutter-memory install-hook --client grok`.
4. Run the `grok mcp add` line the installer prints. The installer never runs it for you.
5. Start a new Grok session, do some real work, and check `_librarian/sessions/`.

This route was verified on Linux with Grok 1.0.62 only. See [Known issues](#known-issues) for macOS and Windows.

### I have Codex, Copilot CLI, Antigravity, or Muse Code. Does adding Grok disturb it?

No. Each installer writes only its own client's files and never edits another client's. All of them write records to the same notes folder, so the new client can recall what the others captured.

### Can a client that has no hook still recall?

Yes. Any MCP client can search and recall with one `npx` entry. Nothing is captured from that client, because it has no hook. See [Recall only, with npx](./getting-started.md#recall-only-with-npx).

### What do I re-run after changing Node versions?

Re-run the installer for each client. The hook is registered by absolute path, so a new Node or npm prefix can leave it pointing at nothing. See [Upgrading](./getting-started.md#upgrading).

## Double capture

### How can the same hook fire twice?

Grok loads hooks from several routes: the Claude Code plugin, `~/.claude/settings.json`, and `~/.grok/hooks/`. A rutter hook on more than one of them runs more than once. A hand-registered Claude Code hook beside the Claude Code plugin does the same.

Grok runs an identical command in two routes once. A different command, such as `--client claude` in one place and `--client grok` in another, runs twice.

### Does it store the record twice?

No. rutter ignores a record whose session ID, summary text, and reference paths match one already stored. The second run is wasted work. It adds nothing.

The match works within one session. Two different sessions that say the same thing are two records. A record with no session ID is always stored. Two firings at the same instant can, rarely, both write.

### How do I avoid it?

Use one route per client.

- **Claude Code:** the plugin, or `install-hook`. Not both.
- **Grok:** `install-hook --client grok`, or the Claude Code plugin. Not both. The installer checks for the other routes before it writes.
- **To see what Grok loaded:** run `grok inspect`.

`GROK_CLAUDE_HOOKS_ENABLED=false` turns off the `~/.claude/settings.json` route in Grok. It does not turn off hooks that come from a plugin.

## When a record does not appear

### My captures landed in `~/Documents/knowledge-vault`. Why?

The hook did not see `LIBRARIAN_VAULT_PATH`, so it used the default. This usually happens when you launch a client from the desktop, for example the Dock. Those launches do not carry exports from your shell profile.

Start the client from a terminal that has the variable set. Antigravity and Muse Code take the folder from the installer's `--vault` flag instead.

### Something I decided in one client is missing from another. What do I check?

Check in this order:

1. The model wrote the summary line. The hook captures only what the model wrote.
2. The hook ran. Look for today's file in `_librarian/sessions/`.
3. Both clients use the same notes folder.
4. For a position, restart the server or reindex. Positions are recalled from the index.

[If something goes wrong](./getting-started.md#if-something-goes-wrong) has the full checklist.

### Can I run two clients at once?

The record files are rewritten whole through a temporary file and a rename, so two clients should not corrupt one. The documented effect is smaller. When a server rebuilds its index, its tables are briefly empty, and a search from another open session at that moment can return nothing. Repeat the search.

## Stopping, upgrading, and privacy

### How do I stop capture for one client?

rutter has no pause switch or uninstall command. You delete the client's hook. The list for every client is in [Pause capture](./getting-started.md#pause-capture).

### What leaves my machine?

rutter makes no network calls and runs no model. What its tools return becomes part of your client's context and goes to that client's model provider. With several clients, a record captured in one is sent to whichever provider serves the client you ask in. See [What leaves your machine](./getting-started.md#what-leaves-your-machine).

## Known issues

Issues are listed as what you see, why, and what to do. Each is either **confirmed**, meaning the docs, tests, or a recorded run show it, or **not tested**. Not tested means it follows from reading the code and nobody has run it. rutter is a personal tool with no support commitment.

### Confirmed

#### The Grok install was tested on Linux only

**What you see:** nothing yet. This is a coverage gap.

**Why:** the Grok route without Claude Code was verified in a Linux environment. The macOS recheck is still open. Windows was never tried.

**What to do:** on macOS, follow the Grok path and report what differs. See also the [not tested](#not-tested) issues.

#### A long Grok turn can lose the summary line

**What you see:** no record from a Grok session whose final reply was very long.

**Why:** Grok truncates the final message it gives the hook at 32,768 characters, and the summary line is at the end.

**What to do:** keep the final reply well under that length, so the summary line stays in the part Grok passes on.

#### Capture depends on the model

**What you see:** a session with real work and no record.

**Why:** the hook only lifts a line the model wrote. Models skipped it in tests. Muse Code wrote it on four of five ordinary tasks. In the Copilot CLI trial it wrote the line only with a Copilot-specific lead line. `agy` models wrote none without the always-on rule file.

**What to do:** keep each client's instructions file in place. Do not delete it as clutter.

#### Two summary lines collapse to one

**What you see:** only the last of two lines in a final reply is stored.

**Why:** the hook keeps the last directive it finds in what it reads.

**What to do:** write one line per turn.

#### Muse Code, Codex, and Copilot CLI have client-specific limits

- **Muse Code:** a project `AGENTS.md` in an untrusted workspace may suppress the user-level rule. The `muse` command name can also collide with a cmux binary.
- **Codex:** the hook never runs until you trust it in `/hooks`. It needs Node on `PATH`, which a Dock launch may not provide.
- **Copilot CLI:** the server receives only `PATH`, so the notes folder must be in the `copilot mcp add` line.

#### Some labels are missing

**What you see:** a record with no `client` label.

**Why:** hand-registered hooks from before the label existed, and turns the hook cannot attribute, get none. There is no filter by client yet.

**What to do:** none needed. A label is left off rather than guessed.

#### There is no pause or uninstall command

**What you see:** you cannot turn capture off with a command.

**Why:** the installers only add files.

**What to do:** delete the hook file, as described in [Pause capture](./getting-started.md#pause-capture).

#### The default notes folder is the author's

**What you see:** zero notes found, and no error.

**Why:** an unreadable or wrong folder produces a successful empty index. The default is `~/Documents/knowledge-vault`.

**What to do:** set `LIBRARIAN_VAULT_PATH`, then check that `/mcp` or `rutter-memory recent` shows your notes.

#### A new position is not recalled at once

**What you see:** a position you just captured is not found.

**Why:** positions are recalled from the index, which updates when a server starts or you reindex.

**What to do:** restart the client, or reindex.

#### References show what the session listed

**What you see:** a reference that matches a note whose text has since changed.

**Why:** a reference records which notes the session cited, not which it read. A note edited in place at the same path is not flagged.

**What to do:** compare the stored hash with the note when it matters.

#### Some clients are not covered

Capture is not checked in Cowork. The Antigravity IDE is not covered, only the `agy` command-line tool.

### Not tested

These come from reading the code and the docs, not from running them.

#### Grok may load two rutter servers

**What you see:** the Claude Code plugin and a native `grok mcp add rutter` registration are both present.

**Why:** the plugin may supply a server, and the installer prints the registration line even when it finds the plugin. Only hook double-firing was probed. Whether Grok then shows two servers is not confirmed.

**What to do:** register one route. If you use the plugin, skip the printed `grok mcp add` line. Fixing this is on the [roadmap](./roadmap.md#phase-7--grok-without-claude-code-proposal).

#### macOS and Windows

The Grok installer, the hook, and the instructions-file writers assume a POSIX shell and home-directory layout. Most of the next entries follow from that.

#### Launching a client from the desktop on macOS

**What you might see:** captures in the default folder, or a hook that cannot find `node`.

**Why:** desktop launches do not carry your shell exports. The docs report this for Codex and the `npx` route. The same likely applies to Grok.

**What to do:** launch from a terminal, or follow the [Grok path](./getting-started.md#grok-path) checks.

#### Native Windows

**What you might see:** the hook never runs, or the installer registers a second entry on every run.

**Why:** the hook is a bash script. Native Windows has no bash unless you use WSL or Git Bash. The installer recognizes its own entries only by forward-slash paths, and its quoting is POSIX-style. Muse Code's installer rejects vault paths that contain a backslash.

**What to do:** use WSL, where the Linux behavior applies. This is also untested.

#### Symlinked configuration files

**What you might see:** the installer refuses to continue.

**Why:** it will not replace a symlinked `rutter.json` or Muse Code settings file. Dotfile managers can create such links.

**What to do:** replace the link with a real file, then re-run.

#### Newer client versions

**What you might see:** a hook that stops firing after a client update.

**Why:** the Grok route was verified on Grok 1.0.62. Hook formats and compatibility behavior can change.

**What to do:** re-run the installer after updating, and check for a new record.

## See also

- [Getting started](./getting-started.md#choose-your-path): one path per client
- [Memory of use](./memory-of-use.md): how capture and records work
- [Overview](./overview.md): why rutter is built this way
