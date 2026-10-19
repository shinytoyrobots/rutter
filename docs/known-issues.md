# Known issues

This page lists problems that have been seen or are likely. For how rutter behaves with several clients, see the [FAQ](./faq.md). Issues are listed as what you see, why, and what to do. Each is either **confirmed**, meaning the docs, tests, or a recorded run show it, or **not tested**. Not tested means it follows from reading the code and nobody has run it. rutter is a personal tool with no support commitment. Version numbers in these entries are the client versions the checks ran on.

## Confirmed

### The Grok install was tested on Linux only

**What you see:** nothing yet. This is a coverage gap.

**Why:** the Grok route without Claude Code was verified in a Linux environment. The macOS recheck is still open. Windows was never tried.

**What to do:** on macOS, follow the Grok path and report what differs. See also the [not tested](#not-tested) issues.

### A long Grok turn can lose the summary line

**What you see:** no record from a Grok session whose final reply was very long.

**Why:** Grok truncates the final message it gives the hook at 32,768 characters, and the summary line is at the end.

**What to do:** keep the final reply well under that length, so the summary line stays in the part Grok passes on.

### Capture depends on the model

**What you see:** a session with real work and no record.

**Why:** the hook only lifts a line the model wrote. Models skipped it in tests. These were small trials run by one person, so read the numbers as anecdotes. Muse Code wrote it on four of five ordinary tasks. In the Copilot CLI trial, the model wrote the line only when the instructions file began with a line written for Copilot. `agy` models wrote none without the always-on rule file.

**What to do:** keep each client's instructions file in place. Do not delete it as clutter.

### Two summary lines collapse to one

**What you see:** only the last of two lines in a final reply is stored.

**Why:** the hook keeps the last directive it finds in what it reads.

**What to do:** write one line per turn.

### Muse Code, Codex, and Copilot CLI have client-specific limits

- **Muse Code:** a project `AGENTS.md` in an untrusted workspace may suppress the user-level rule. The `muse` command name can also collide with a cmux binary.
- **Codex:** the hook never runs until you trust it in `/hooks`. It needs Node on `PATH`, which a Dock launch may not provide.
- **Copilot CLI:** the server receives only `PATH`, so the notes folder must be in the `copilot mcp add` line.

### Some labels are missing

**What you see:** a record with no `client` label.

**Why:** hand-registered hooks from before the label existed, and turns the hook cannot attribute, get none. There is no filter by client yet.

**What to do:** none needed. A label is left off rather than guessed.

### There is no pause or uninstall command

**What you see:** you cannot turn capture off with a command.

**Why:** the installers only add files.

**What to do:** delete the hook file, as described in [Pause capture](./manage-and-privacy.md#pause-capture).

### The default notes folder is the author's

**What you see:** zero notes found, and no error.

**Why:** an unreadable or wrong folder produces a successful empty index. The default is `~/Documents/knowledge-vault`.

**What to do:** set `LIBRARIAN_VAULT_PATH`, then check that `/mcp` or `rutter-memory recent` shows your notes.

### A new position is not recalled at once

**What you see:** a position (a stance you formed or changed, recorded as its own entry) you just captured is not found.

**Why:** positions are recalled from the index, which updates when a server starts or you reindex.

**What to do:** restart the client, or reindex.

### References show what the session listed

**What you see:** a reference that matches a note whose text has since changed.

**Why:** a reference records which notes the session cited, not which it read. A note edited in place at the same path is not flagged.

**What to do:** compare the stored hash with the note when it matters.

### Some clients are not covered

Capture is not checked in Cowork. The Antigravity IDE is not covered, only the `agy` command-line tool.

## Not tested

These come from reading the code and the docs, not from running them.

### Grok may load two rutter servers

**What you see:** the Claude Code plugin and a native `grok mcp add rutter` registration are both present.

**Why:** the plugin may supply a server, and the installer prints the registration line even when it finds the plugin. Only hook double-firing was probed. Whether Grok then shows two servers is not confirmed.

**What to do:** register one route. If you use the plugin, skip the printed `grok mcp add` line. Fixing this is on the [roadmap](./roadmap.md#phase-7--grok-without-claude-code-proposal).

### Codex, Copilot CLI, Antigravity, and Muse Code without Claude Code

**What you see:** nothing known. These installs use npm and do not need the Claude Code plugin.

**Why:** they were tested only on a machine that also had Claude Code, so a problem on a clean machine is possible.

**What to do:** if one fails on a machine without Claude Code, please [open an issue](https://github.com/shinytoyrobots/rutter/issues).

### macOS and Windows

The Grok installer, the hook, and the instructions-file writers assume a POSIX shell and home-directory layout. Most of the next entries follow from that.

### Launching a client from the desktop on macOS

**What you might see:** captures in the default folder, or a hook that cannot find `node`.

**Why:** desktop launches do not carry your shell exports. The docs report this for Codex and the `npx` route. The same likely applies to Grok.

**What to do:** launch from a terminal, or follow the [Grok path](./getting-started.md#grok-path) checks.

### Native Windows

**What you might see:** the hook never runs, or the installer registers a second entry on every run.

**Why:** the hook is a bash script. Native Windows has no bash unless you use WSL or Git Bash. The installer recognizes its own entries only by forward-slash paths, and its quoting is POSIX-style. Muse Code's installer rejects notes-folder paths that contain a backslash.

**What to do:** use WSL, where the Linux behavior applies. This is also untested.

### Symlinked configuration files

**What you might see:** the installer refuses to continue.

**Why:** it will not replace a symlinked `rutter.json` or Muse Code settings file. Dotfile managers can create such links.

**What to do:** replace the link with a real file, then re-run.

### Newer client versions

**What you might see:** a hook that stops firing after a client update.

**Why:** the Grok route was verified on Grok 1.0.62. Hook formats and compatibility behavior can change.

**What to do:** re-run the installer after updating, and check for a new record.

## See also

- [Getting started](./getting-started.md#if-something-goes-wrong): troubleshooting for the setup paths
- [FAQ](./faq.md): how several clients share one memory
- [Pause, remove, and privacy](./manage-and-privacy.md): pause or remove capture
