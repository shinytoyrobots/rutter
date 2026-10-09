#!/usr/bin/env bash
# Stop hook for rutter ambient capture (SCN-001): Claude Code, Grok, Codex, Antigravity.
#
# The host pipes the Stop event JSON (incl. `session_id`, `cwd`, and a
# transcript path or `last_assistant_message`) to this script on stdin after
# each turn. We hand it straight to
# the capture CLI, which lifts the last `librarian-session` directive out of the
# transcript or final reply and appends one session entry. No inference, no network (INV-6/1);
# a failure here must never break the session, so we always exit 0 with empty
# stdout (Codex 0.160.0 accepts that; verified against a real turn).
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Installed as a plugin, the host passes the notes folder and data dir as plugin
# options rather than LIBRARIAN_* variables; map them across, never overriding a
# value the user set explicitly.
if [ -z "${LIBRARIAN_VAULT_PATH:-}" ] && [ -n "${CLAUDE_PLUGIN_OPTION_VAULT_PATH:-}" ]; then
  export LIBRARIAN_VAULT_PATH="$CLAUDE_PLUGIN_OPTION_VAULT_PATH"
fi
if [ -z "${LIBRARIAN_DB_PATH:-}" ] && [ -n "${CLAUDE_PLUGIN_DATA:-}" ]; then
  export LIBRARIAN_DB_PATH="$CLAUDE_PLUGIN_DATA/librarian.db"
fi
# Arguments (e.g. `--client codex`, set by install-hook) pass through to the CLI, which labels the
# record with the host client. An argument survives every host's hook runner where an environment
# prefix might not.
node "$DIR/dist/capture-cli.js" "$@" || true
exit 0
