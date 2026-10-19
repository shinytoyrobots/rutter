# Manage capture, and what leaves your machine

*Output shape verified against code. The sample line below is illustrative, not a recorded run: your dates, paths, and version string will differ.*

Capture runs without asking, so it helps to know how to see it, stop it, and undo it. This page describes what exists today. Where rutter has no feature for something, it says so.

## Notice when capture stops

- **Look for the line.** After a session that decided something, today's file in `_librarian/sessions/` should have a new entry, and `rutter-memory recent` (`npm run recent` from a [clone](./from-source.md)), or asking your client, should show it. A session with no new line was not captured.
- **Read the hook's status line.** After each turn the hook writes one line to stderr, for example `no session directive found; nothing captured.` or `captured 1 entry into 2026-08-05 session record in vault /Users/you/Documents/notes (rutter <version>).` When `LIBRARIAN_VAULT_PATH` was not set for the hook, the line says the default folder was used. Where a client shows hook output varies; `agy` keeps it in its log under `~/.gemini/antigravity-cli/log/`.
- **Check the `client` label.** Each entry names the client that wrote it, when the hook can tell. If one client's entries stop appearing while others continue, that client has stopped capturing.

The usage count from `npm run gate` (from a clone) measures recall, not capture. It is not a capture monitor.

## Pause capture

rutter has no pause switch. A line is captured whenever the hook runs and the model has left one. To stop capture, stop the hook:

- **Claude Code plugin:** `/plugin disable rutter@rutter` turns off the plugin's server and hook together.
- **Grok, installed with `install-hook --client grok`:** delete `~/.grok/hooks/rutter.json` (or turn the hook off in Grok's `/hooks` tab).
- **Grok, through the Claude Code plugin:** Grok loads the hook from your Claude Code plugin install, and it does not honor the plugin being disabled in Claude Code. Setting `GROK_CLAUDE_HOOKS_ENABLED=false` does not reach plugin hooks either. Two things do: turn the hook off in Grok's `/hooks` tab (select it and press Space), or uninstall the plugin from Claude Code with `/plugin uninstall rutter@rutter`, which removes it from Grok as well. The disable and uninstall behavior was checked with `grok inspect` on Grok 1.0.50; the `/hooks` toggle is from Grok's own documentation.
- **A hook added by `install-hook`** (`rutter-memory install-hook` or `npm run install-hook`): delete its entry from the hook file named in [Before you start](./getting-started.md#before-you-start). There is no uninstall command.
- **Codex:** remove the entry from `~/.codex/hooks.json`. A hook you have not trusted in `/hooks` never runs, so an untrusted hook is already paused.
- **Antigravity:** remove the hook entry, and delete `~/.gemini/config/rules/rutter-capture.md` so the model stops writing lines.
- **Copilot CLI:** delete `~/.copilot/hooks/rutter.json`, and delete `~/.copilot/instructions/rutter.instructions.md` so the model stops writing lines.
- **Muse Code:** delete the hook and `rutter` entries from `~/.config/muse/settings.json`, and the marked block from `~/.config/muse/AGENTS.md`.

Hooks are read at session start, so restart the client after a change. Asking the model not to leave a line in one session usually works, but nothing enforces it.

## Remove a record you don't want

The server only appends; it has no delete command. The records are your markdown, so you remove an entry by hand:

- **A session line:** open `_librarian/sessions/<day>.md` and delete the entry from the `sessions:` list in the frontmatter. The frontmatter is the record. The body below it is regenerated from the frontmatter the next time that day's file grows, so delete the matching body line too if you want it gone now. The day's top-level `refs:` list is also rebuilt on the next write. Recall reads these files directly, so the entry disappears from recall at once.
- **A position:** delete the event from `_librarian/positions/<YYYY-MM>.md`, then run `rutter-memory reindex` (`npm run reindex` from a clone) or restart the server, because positions are recalled from the index.
- **Keep the YAML valid.** If a file stops parsing, recall skips it, and capture refuses to write into it rather than overwrite it.
- **Mind your history.** If your notes folder is a git repository, the line stays in its history until you rewrite that history.

A hand edit is outside the append-only rule, which binds only the server, and nothing detects it.

## What leaves your machine

rutter's server and hook make no network calls and run no model. Your records and index stay in your notes folder and the index file.

That does not settle what your AI client sends. Whatever rutter's tools return becomes part of the client's context: search snippets, a full note from `librarian-get-note`, recalled summaries, and positions. The client sends its context to its model provider under the client's own terms. rutter cannot see or change that, and makes no promise about how a provider handles it. Point rutter at a folder you are content for your client to read.
