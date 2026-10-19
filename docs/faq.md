# Frequently asked questions

These answers are for someone who has not read the rest of the docs. They cover how rutter behaves with more than one AI client, how to add a client to a working setup, and where to look when a record does not appear. [Known issues](./known-issues.md) has its own page.

rutter's tools (`librarian-*`), environment variables (`LIBRARIAN_*`), and the `_librarian/` folder keep the project's earlier name, *librarian*. They are all parts of rutter.

## How the pieces fit

### Do my clients share one memory?

Yes, if they all point at the same notes folder. Each client's capture hook (a script the client runs after each turn) writes to `_librarian/sessions/<date>.md` inside that folder. Each client reads those files back through its own rutter server. A decision captured in Grok is recalled in Codex.

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

Each client also has its own MCP (Model Context Protocol) registration. `$CODEX_HOME`, `$COPILOT_HOME`, and `$GROK_HOME` move those clients' locations.

### Is there one rutter server or several?

Each client starts its own server from its own registration. Nothing connects the servers to each other. The notes folder is the shared state.

The search index is a rebuildable cache, so servers can keep separate index files. The Claude Code plugin keeps its index in the plugin's data folder. An npm install keeps one under `~/.local/share/rutter/`, or under `$XDG_DATA_HOME` if you set it. A source clone uses `data/librarian.db`. All are rebuilt from your notes.

### How do I tell which client wrote a record?

Each record carries a `client` label in its frontmatter: `claude`, `grok`, `codex`, `agy`, `copilot`, or `muse`. The label names the host, not the model. The hook leaves it off when it cannot tell. You cannot yet filter or search by client.

## Adding a client

### I have Claude Code with the plugin and want to add Grok. What do I do?

Grok already runs the plugin's capture hook through its Claude Code compatibility layer. You have two routes. Pick one.

1. **Use what you have.** Set `LIBRARIAN_VAULT_PATH` in the shell that launches Grok to your notes folder. Grok does not fill in the plugin's notes-folder option. Without the variable, rutter uses its default folder, `~/Documents/knowledge-vault`.
2. **Use the Grok installer.** Run the following, then follow the [Grok path](./getting-started.md#grok-path). Skip its `grok mcp add` step if the plugin already supplies the server:

   ```bash
   rutter-memory install-hook --client grok
   ```

   If the installer finds the plugin's hook, it writes nothing and names the route it found. It still prints a `grok mcp add` line. The plugin may already supply a server, so skip that line unless you want a native registration. See the [two servers issue](./known-issues.md#grok-may-load-two-rutter-servers).

Check what Grok loaded with `grok inspect`, or open `/hooks` inside Grok.

### I use Grok and have no Claude Code. What do I do?

Follow the [Grok path](./getting-started.md#grok-path). In short:

1. Install with `npm install -g rutter-memory`.
2. Export `LIBRARIAN_VAULT_PATH` in your shell profile.
3. Run `rutter-memory install-hook --client grok`.
4. Run the `grok mcp add` line the installer prints. The installer never runs it for you.
5. Start a new Grok session, do some real work, and check `_librarian/sessions/`.

This route was verified on Linux with Grok 1.0.62 only. See [Known issues](./known-issues.md) for macOS and Windows.

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

rutter has no pause switch or uninstall command. You delete the client's hook. The list for every client is in [Pause capture](./manage-and-privacy.md#pause-capture).

### What leaves my machine?

rutter makes no network calls and runs no model. What its tools return becomes part of your client's context and goes to that client's model provider. With several clients, a record captured in one is sent to whichever provider serves the client you ask in. See [What leaves your machine](./manage-and-privacy.md#what-leaves-your-machine).

## Known issues

Known issues now have their own page: [Known issues](./known-issues.md). It lists what is confirmed, such as the Grok install being tested on Linux only, and what is not tested yet.

The entries that used to be on this page, each linking to its new home:

- [Confirmed](./known-issues.md#confirmed): now on the Known issues page.
- [The Grok install was tested on Linux only](./known-issues.md#the-grok-install-was-tested-on-linux-only): now on the Known issues page.
- [A long Grok turn can lose the summary line](./known-issues.md#a-long-grok-turn-can-lose-the-summary-line): now on the Known issues page.
- [Capture depends on the model](./known-issues.md#capture-depends-on-the-model): now on the Known issues page.
- [Two summary lines collapse to one](./known-issues.md#two-summary-lines-collapse-to-one): now on the Known issues page.
- [Muse Code, Codex, and Copilot CLI have client-specific limits](./known-issues.md#muse-code-codex-and-copilot-cli-have-client-specific-limits): now on the Known issues page.
- [Some labels are missing](./known-issues.md#some-labels-are-missing): now on the Known issues page.
- [There is no pause or uninstall command](./known-issues.md#there-is-no-pause-or-uninstall-command): now on the Known issues page.
- [The default notes folder is the author's](./known-issues.md#the-default-notes-folder-is-the-authors): now on the Known issues page.
- [A new position is not recalled at once](./known-issues.md#a-new-position-is-not-recalled-at-once): now on the Known issues page.
- [References show what the session listed](./known-issues.md#references-show-what-the-session-listed): now on the Known issues page.
- [Some clients are not covered](./known-issues.md#some-clients-are-not-covered): now on the Known issues page.
- [Not tested](./known-issues.md#not-tested): now on the Known issues page.
- [Grok may load two rutter servers](./known-issues.md#grok-may-load-two-rutter-servers): now on the Known issues page.
- [Codex, Copilot CLI, Antigravity, and Muse Code without Claude Code](./known-issues.md#codex-copilot-cli-antigravity-and-muse-code-without-claude-code): now on the Known issues page.
- [macOS and Windows](./known-issues.md#macos-and-windows): now on the Known issues page.
- [Launching a client from the desktop on macOS](./known-issues.md#launching-a-client-from-the-desktop-on-macos): now on the Known issues page.
- [Native Windows](./known-issues.md#native-windows): now on the Known issues page.
- [Symlinked configuration files](./known-issues.md#symlinked-configuration-files): now on the Known issues page.
- [Newer client versions](./known-issues.md#newer-client-versions): now on the Known issues page.
- [Do I need Claude Code to use rutter?](./known-issues.md#codex-copilot-cli-antigravity-and-muse-code-without-claude-code): answered in the known issues entry on running without Claude Code.

## See also

- [Getting started](./getting-started.md#choose-your-path): one path per client
- [How it works](./memory-of-use.md): how capture and records work (memory-of-use)
- [Why is it built this way?](./overview.md): the design, and what each choice costs
- [Known issues](./known-issues.md)
