#!/usr/bin/env bash
# Temporary Stop-hook wrapper. Dumps Grok/Claude stdin, then forwards to
# capture-cli unchanged. Always exit 0. Not the adapter — probe only.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${RUTTER_GROK_PROBE_DIR:-/tmp/rutter-grok-stop-probe}"
mkdir -p "$OUT"

input=$(cat)
printf '%s' "$input" > "$OUT/stdin.json"
{
  echo "ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "GROK_HOOK_EVENT=${GROK_HOOK_EVENT-}"
  echo "GROK_SESSION_ID=${GROK_SESSION_ID-}"
  echo "GROK_WORKSPACE_ROOT=${GROK_WORKSPACE_ROOT-}"
  echo "GROK_HOME=${GROK_HOME-}"
  echo "CLAUDE_PROJECT_DIR=${CLAUDE_PROJECT_DIR-}"
} > "$OUT/env.txt"

python3 - "$OUT" <<'PY' || true
import json, sys
from pathlib import Path
out = Path(sys.argv[1])
raw = (out / "stdin.json").read_text()
try:
    p = json.loads(raw) if raw.strip() else {}
except json.JSONDecodeError as e:
    (out / "summary.txt").write_text(f"stdin is not JSON: {e}\nlen={len(raw)}\n")
    sys.exit(0)
if not isinstance(p, dict):
    (out / "summary.txt").write_text(f"stdin JSON is {type(p).__name__}, not object\n")
    sys.exit(0)

lam = p.get("lastAssistantMessage") or p.get("last_assistant_message") or ""
if not isinstance(lam, str):
    lam = ""
token = "grok-capture-probe-2026-08-31"
keys = sorted(p.keys())
lines = [
    f"keys: {keys}",
    f"hookEventName: {p.get('hookEventName')}",
    f"reason: {p.get('reason')}",
    f"transcript_path: {p.get('transcript_path')!r}",
    f"transcriptPath: {p.get('transcriptPath')!r}",
    f"session_id: {p.get('session_id')!r}",
    f"sessionId: {p.get('sessionId')!r}",
    f"cwd: {p.get('cwd')!r}",
    f"lastAssistantMessage len: {len(lam)}",
    f"last_assistant_message present: {'last_assistant_message' in p}",
    f"token in lastAssistantMessage: {token in lam}",
    f"librarian-session in lastAssistantMessage: {'librarian-session' in lam}",
]
(out / "summary.txt").write_text("\n".join(lines) + "\n")
if lam:
    (out / "lastAssistantMessage.txt").write_text(lam)
PY

printf '%s' "$input" | node "$DIR/dist/capture-cli.js" || true
exit 0
