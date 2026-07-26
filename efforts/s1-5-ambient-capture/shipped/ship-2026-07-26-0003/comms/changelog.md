# my-librarian 0.3.0 — session records know where they happened

**Records are now legible across projects.** Every captured session line records which
workspace it came from — the folder, an automatically derived project name, and the git
repository it belongs to. Nothing to configure, nothing to type: the Stop hook already
knew where you were working; now it writes it down. Records captured before this update
stay exactly as they were, and remain valid.

**Ask about one project at a time.** `librarian-recent` shows each entry's project and
accepts a `project` filter — "what was I working on *in the novel*?" now has an answer
even after a three-project day. Matching is exact on the project name, case- and
accent-spelling-insensitive, and never guesses for old entries that predate provenance.

**Your AI client now knows when to use the librarian.** The server ships its own usage
guidance over MCP: any connected client is told to reach for `librarian-recent` on
"what was I working on?" and `librarian-search` on "have I seen this?" — before it goes
spelunking through files. No CLAUDE.md edits, in any repo, on any client.

## How-to

Nothing new to install. After updating: `npm run build` in the repo — the new capture
behavior is live from your next Claude Code session's first turn. Filter from the CLI
with `npm run recent -- --project <name>`, or just ask your client.

Security note: repository identity is read from `.git/config` by plain file reads only
(never a `git` subprocess, never the network), and `.git` redirect files are followed
only into real git metadata — a crafted redirect can't steer the reader elsewhere.
