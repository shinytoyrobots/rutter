#!/usr/bin/env bash
# Stop hook for rutter ambient capture (SCN-001): Claude Code, Grok, Codex.
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
node "$DIR/dist/capture-cli.js" || true
exit 0
