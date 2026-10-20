---
type: report
status: complete
created: 2026-10-19
domain: capture
---

# Instruction limits by client, October 2026

Section 1.2 of `docs/positions-plan.md`. This report measures how much of an MCP
server's `instructions`, and of a tool's description, each client passes to the model.

**Short answer:** Claude Code 2.1.301 and 2.1.304, and Codex 0.163.0, delivered the full
4,000 characters of both, with no truncation. The 2,048-character cutoff behind
`test/instructions-budget.test.ts` came from an older Claude Code. It's no longer present
in the installed Claude Code. **Grok 1.0.62 now has the tightest limit.** It keeps
2,033 characters of each text and appends "… [truncated]". That's 2,046 characters,
consistent with a 2,048 cap that includes the marker. The limit is the same for
instructions and for tool descriptions. The current rutter instructions (1,940
characters) fit.

## Results

| Client | Version | Date | Instructions | Tool description | Unit | Evidence |
|---|---|---|---|---|---|---|
| Claude Code | 2.1.304 | 2026-10-19 | No cutoff at 4,000 | No cutoff at 4,000 | n/a (none observed) | All 16 nonce markers quoted, ASCII and em dash; no "truncated" line in `--debug` log |
| Claude Code | 2.1.301 | 2026-10-19 | No cutoff at 4,000 | No cutoff at 4,000 | n/a | All 16 nonce markers quoted, ASCII and em dash |
| Claude Code | unknown (≥2.1.84, before 2.1.301) | ≤2026-10-01 | 2,048 | not measured | characters (see L4) | Debug log: "Server instructions truncated from 4260 to 2048 chars" (commit `6e1083e`) |
| Codex CLI | 0.163.0 | 2026-10-19 | No cutoff at 4,000, **but only visible after tool discovery** | No cutoff at 4,000 | n/a | All 16 nonce markers quoted, ASCII and em dash |
| Grok CLI | 1.0.62 | 2026-10-19 | **2,033 kept**, then "… [truncated]" | **2,033 kept**, then "… [truncated]" | characters (UTF-16 units) | Coarse run: M08@2000 seen, M09@2250 not. Fine run (marker every 25): last marker `[M81@2025:…]` with its nonce, then 8 characters, then the truncation marker. Same position with em dash text. The model also said unprompted that both texts were "cut off in what I received" |

## Method

A throwaway stdio MCP server (scratchpad only, not the rutter plugin) returned 4,000
characters of instructions and a 4,000-character tool description. A marker ended at
every 250th character: `[M08@2000:HQNA]` in the instructions and `[T08@2000:KWEK]` in
the description. The four-letter code was random on each server start and logged by the
server. Each client was run headless and asked to list every marker it could see. A
marker counted as seen only if the reply matched its logged code. A model can guess
`@2250` from the pattern but can't guess the code.

- **ASCII text:** 4,000 UTF-16 units and 4,000 bytes.
- **Em dash text:** an em dash every 10 characters. That's 4,000 UTF-16 units and
  4,736 bytes, so a byte limit or a character limit near 4,000 would show up.
- Claude Code: `claude -p --debug --strict-mcp-config --mcp-config <probe>`, model
  Haiku 5.5. The tool description was read after loading the tool through ToolSearch,
  because Claude Code defers MCP tool schemas.
- Codex: `codex exec -s read-only -c mcp_servers.markerprobe.…`.
- Grok: `grok -p --trust --cwd <probe dir>` with the server in `.mcp.json`. Without
  `--trust`, Grok silently skips project-scoped servers in an untrusted folder
  (`grok mcp doctor`: "folder untrusted"). For the exact cutoff, a second server put a
  marker every 25 characters. The model was asked for the last marker and every
  character after it, word for word.
- Capture safety: probe prompts forbade directives. `LIBRARIAN_VAULT_PATH` pointed at a
  scratch folder, and the vault's session file was checked afterward. It had no probe
  content.

## Findings by question

**L1. Is the limit documented?** No. The Claude Code MCP docs
(<https://code.claude.com/docs/en/mcp>) document only `MAX_MCP_OUTPUT_TOKENS` (tool
output). The MCP specification (2025-06-18 lifecycle) sets no length on `instructions`.
Secondhand sources say the 2 KB cap started in Claude Code v2.1.84. These are
third-party mirrors of anthropics/claude-code issues #39106, #43474 and #81268, and they
quote a changelog line: "MCP tool descriptions and server instructions are now capped
at 2KB". An unconfirmed blog post mentions a `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`
setting in v2.1.280. Neither this setting nor any MCP setting is present in this
machine's settings or environment. Nothing documented was found for Codex or Grok.

**L2. Does the installed Claude Code still truncate?** No. Versions 2.1.301 and 2.1.304
pass all 4,000 characters, and the debug log has no truncation line. When the cap was
lifted isn't known. Last seen in use on or before 2026-10-01; gone by 2.1.301.

**L3. Characters, bytes or tokens?** For Grok, characters (UTF-16 units). The em dash
text was cut at exactly the same position as ASCII (`fghi—abc` after the 2,025 marker
in both). A byte limit would have cut the em dash text about 400 characters earlier.
For Claude Code and Codex the unit can't be measured, because no cutoff was observed.
The em dash run (4,736 bytes) passed in full there, which rules out a byte limit below
about 4,700.

**L4. Why 4,260 rather than 4,245?** Because of the user label. At `6e1083e^` the label
appeared 5 times in the instructions. With the default label "the user" the text is
4,260 characters. With "Robin" it's 4,245. So the client that logged the line was
running with the default label. The plugin install didn't set
`LIBRARIAN_USER_LABEL`, and our own count used a configured label. Line endings play
no part: with CRLF the count would be 4,285. Characters, UTF-16 units and bytes are
equal for that text, so the old log line can't tell the units apart either.

**L5. Codex and Grok.** Codex 0.163.0 shows no cutoff at 4,000. One behavior matters
more than the limit, though. In a run where the model was told not to use tools, it
reported seeing **no** server instructions (`M: NONE`). After tool discovery, it saw
them through the discovered tool's metadata. Two more runs with all tools forbidden
confirmed this. The probe server started (its code file was written), but the model saw
no markers and named no server whose instructions it could see. **In Codex, the rutter
capture instruction doesn't reach the model until it loads a rutter tool.** A session
that never touches rutter never sees the session or position directive. The installer
writes no Codex rules file, and `docs/getting-started.md` relies on the server
instructions for Codex. So in those sessions Codex has no capture instruction at all.
That fits the low count of Codex records (part of the 8 non-Claude records in the
plan's background). It's a capture gap outside this plan's scope and needs its own fix.
Grok 1.0.62 truncates both instructions and tool descriptions at 2,033 characters plus a
"… [truncated]" marker.

**L6. Are tool descriptions cut off?** In Grok, yes, at the same 2,033 characters as the
instructions. Not in Claude Code 2.1.301/2.1.304 or Codex 0.163.0, up to 4,000
characters. In Claude Code they're deferred: the model sees them
only after a ToolSearch load. Read-time guidance in a tool description arrives when the
tool is loaded, not at session start.

## What this means for the plan

- The budget is still about 2,048, but the binding client is now **Grok**, not Claude
  Code. The usable limit is 2,033 characters, slightly under the test's 2,048. Section
  2.0 should set `CLIENT_LIMIT` to 2,033, name Grok 1.0.62, and cite this report. The
  current instructions (1,940) fit, with about 90 characters to spare.
- The same limit applies to tool descriptions in Grok. Option C's plan to move more
  guidance into the `librarian-positions` description has to fit 2,033 characters too.
  The budget test doesn't currently check tool descriptions.
- Options A and B get no extra room. Any rewrite must still fit about 2,033 characters,
  or accept that Grok loses the tail.

## Exit status

Met for every client that reads the server instructions: Claude Code, Codex and Grok
each have a measured limit (or "none found at 4,000") with a version and date. The
Codex "instructions only after discovery" behavior is confirmed over three runs.

The budget test now uses Grok's limit: `CLIENT_LIMIT = 2033`. It counts how many times
the user label appears instead of assuming 3 (it's 2 now). Worst case with a
40-character name: 2,004.
