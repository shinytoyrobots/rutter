# Start dogfooding — 3 steps (ring-0 entry actions)

Build + reindex already ran at ship. Remaining user actions:

## 1. Install the Stop hook (the one manual step)

Add to `~/.claude/settings.json` (merge into existing `hooks` if present):

```json
{
  "hooks": {
    "Stop": [ { "hooks": [ { "type": "command",
      "command": "/Users/shinytoyrobots/Development/personal/my-librarian/hooks/librarian-stop.sh" } ] } ]
  }
}
```

The summary-directive convention (how the client marks the one curated line the hook
extracts) is documented in `docs/memory-of-use.md`.

## 2. Restart your Claude Code session

The `my-librarian` MCP server is already registered (`node <repo>/dist/stdio.js`);
a fresh session picks up the newly built `dist/` with all three tools
(`librarian-search` + enrichment, `librarian-get-note`, `librarian-recent`).

## 3. Live with it for two weeks (through ~2026-08-08)

- Work normally. Capture is ambient — that's the point.
- Keep the **wish log** ("what I wished it did") — it picks H2 vs H3 if the gate passes.
- Check `npm run gate` on Fridays; ≥3 stateful uses/week, unprompted, is the bar.
- Records land in `<vault>/_librarian/sessions/` — human-readable, yours, git-committable
  with the vault.
