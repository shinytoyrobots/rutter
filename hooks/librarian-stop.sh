#!/usr/bin/env bash
# Stop hook for rutter ambient capture (SCN-001): Claude Code, Grok, Codex, Antigravity, Copilot CLI, Muse Code.
#
# The host pipes the Stop event JSON (incl. `session_id`, `cwd`, and a
# transcript path or `last_assistant_message`) to this script on stdin after
# each turn. We hand it straight to
# the capture CLI, which lifts the last `librarian-session` directive out of the
# transcript or final reply and appends one session entry. No inference, no network (INV-6/1);
# a failure here must never break the session, so we always exit 0 with empty
# stdout (Codex 0.160.0 accepts that; verified against a real turn).
#
# A hang must not break it either. Muse Code waits for a Stop hook for as long as it runs (a
# 300 s sleep held a turn for 307 s, probed 2026-10-18), so the capture child gets a bounded
# lifetime (LIBRARIAN_CAPTURE_TIMEOUT_SEC, default 20) and is killed past it.
set -uo pipefail
# `dirname`, `sleep` and `pkill` must resolve even if the host hands us a bare PATH.
PATH="${PATH:-}:/usr/bin:/bin:/usr/sbin:/sbin"
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
# Muse Code clears the hook environment (no shell PATH, no nvm), so its installer bakes in an
# absolute node path. Every other host leaves this unset and gets the `node` on PATH.
NODE="${LIBRARIAN_NODE:-node}"
TIMEOUT="${LIBRARIAN_CAPTURE_TIMEOUT_SEC:-20}"
case "$TIMEOUT" in '' | *[!0-9]* | 0) TIMEOUT=20 ;; esac

# The child runs in the background so a watchdog can bound it. A background job in a
# non-interactive shell would lose stdin, so hand it the hook's own.
exec 3<&0
# Arguments (e.g. `--client codex`, set by install-hook) pass through to the CLI, which labels the
# record with the host client. An argument survives every host's hook runner where an environment
# prefix might not.
"$NODE" "$DIR/dist/capture-cli.js" "$@" <&3 &
child=$!
exec 3<&-
# The watchdog's output goes nowhere, so it never holds the host's pipes open after the hook returns.
(
  sleep "$TIMEOUT"
  kill -TERM "$child" 2>/dev/null
  sleep 2
  kill -KILL "$child" 2>/dev/null
) >/dev/null 2>&1 &
watchdog=$!
wait "$child" 2>/dev/null
# Stop the watchdog and its sleep; a killed subshell would otherwise leave the sleep running.
pkill -P "$watchdog" 2>/dev/null
kill "$watchdog" 2>/dev/null
wait "$watchdog" 2>/dev/null
exit 0
