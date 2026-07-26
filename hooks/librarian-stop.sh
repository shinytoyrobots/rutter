#!/usr/bin/env bash
# Claude Code Stop hook for my-librarian ambient capture (SCN-001).
#
# Claude Code pipes the Stop event JSON (incl. `transcript_path` and
# `session_id`) to this script on stdin at session end. We hand it straight to
# the capture CLI, which lifts the last `librarian-session` directive out of the
# transcript and appends one session entry. No inference, no network (INV-6/1);
# a failure here must never break the session, so we always exit 0.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$DIR/dist/capture-cli.js" || true
exit 0
