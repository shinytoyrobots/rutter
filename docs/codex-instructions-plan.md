---
type: plan
status: proposed
created: 2026-10-19
updated: 2026-10-19
domain: capture
---

# Codex: get rutter's instructions to the model

## The problem

In Codex 0.163.0, rutter does nothing unless the user names it. Codex hides an MCP
server's instructions from the model until the model loads one of that server's tools.
Those instructions are the only thing that tells the model rutter exists, when to call
it, and how to write the session line. So in practice the model never loads a rutter
tool and never sees the instructions.

Two real sessions on 2026-10-19, with rutter fully installed (server connected to the
right vault, Stop hook trusted and firing after each turn):

- **Capture fails.** In a chat that settled a preference ("My favorite is a cubano"),
  no rutter text reached the model, no directive was written, and nothing was captured.
- **Recall fails.** Asked "what have I been working on recently?", the model ran
  `git log` and `git diff` and answered from this repo's history. It never searched
  for, loaded or called a rutter tool. The answer was reasonable only because the
  question was asked inside the rutter repo. From any other folder, it would miss the
  vault, other projects and other clients.

The marker probe (`docs/instruction-limits-2026-10.md`, L5) found the same thing three
times. The probe server started, but the model saw none of its instructions until tool
discovery loaded the tool.

**Not in scope:** the positions investigation (`docs/positions-plan.md`), and changing
the server instructions themselves.

## Why the existing fix covers only part of this

Copilot and Muse had the same problem, and the installer fixes it with a rules file the
client always loads:

- **Copilot:** `prepareCopilotInstructions`, `hooks/install-hook.mjs:235`. rutter owns
  its own file at `instructions/rutter.instructions.md`.
- **Muse:** `installMuse`, `hooks/install-hook.mjs:490`. A marked block goes in the
  user's shared `~/.config/muse/AGENTS.md`.

Both files carry a short lead plus `captureContract()` (`:267`). That's the **capture**
part of `SERVER_INSTRUCTIONS` only, from "When a session decides" up to "Everything
these tools return". The routing lines ("Recency questions -- call librarian-recent",
and so on) are left out. Session B shows Codex needs those too. Capture alone would
leave recall broken.

## Step 1: Probe before building (no code changes)

Prove the fix by hand on Codex 0.163.0 before changing the installer.

1. **Back up first.** `~/.codex/AGENTS.md` doesn't exist on this machine today. Record
   that, so the probe can delete the file afterward rather than restore one.
2. Write `~/.codex/AGENTS.md` by hand, with:
   - a lead like the Muse one, plus one sentence on recall: rutter holds the user's
     memory across projects and AI tools, so recency, prior-work and "what do I think"
     questions go to rutter's tools first, even when the user doesn't mention rutter;
   - the full `SERVER_INSTRUCTIONS` text (routing plus capture), with the user label
     filled in.
3. Run four fresh Codex sessions from a new shell. Start each from a folder **other
   than** the rutter repo (for example `~`), so git history can't stand in for memory:

   | # | What to do | Pass if |
   |---|---|---|
   | P1 | Small talk, then settle a preference | A `client: codex` record lands in today's session file |
   | P2 | "What have I been working on recently?" | The model loads and calls `librarian-recent`, and answers from records, not git |
   | P3 | "What do my notes say about X?" (X is a real vault topic) | It calls `librarian-search` |
   | P4 | A real small coding task that ends in a decision | A record lands, and the directive is in the final reply |

4. For each, check the session log (`~/.codex/sessions/…/rollout-*.jsonl`) for the
   `agents_md` world-state slot, any `tool_search` call and any `mcp__rutter` call. Check
   the vault too. Same method as the session A and B checks.
5. **Repeat P2 inside the rutter repo.** This is the hard case: git history competes
   with rutter, and the repo has no project `AGENTS.md`. Then repeat P2 again in a
   scratch git repo that has its own `AGENTS.md`. That checks Codex still loads the
   global file next to a project one.
6. Remove the hand-written file when done, unless step 2 goes ahead the same day.

**Exit:** P1 to P4 all pass from a non-rutter folder. If capture passes but recall
doesn't, try a stronger routing sentence once. If recall still fails, record it, and
ship the capture half alone (step 2), with recall listed as a known issue.

**Output:** add a "Codex rules file" section to `docs/instruction-limits-2026-10.md`,
with Codex version, date, the four results and the session ids.

## Step 2: Build (only after step 1 passes)

1. **`install-hook --client codex` writes a marked block** into `$CODEX_HOME/AGENTS.md`
   (default `~/.codex/AGENTS.md`). Use Muse's block logic rather than Copilot's
   own-file approach, because Codex reads one global file that the user may already
   use. Reuse Muse's handling as is: BEGIN/END markers on their own lines, markers
   ignored inside code fences, refuse ambiguous files and change nothing, write
   atomically. Factor that code into a shared helper rather than copying it.
2. **Content:** a Codex lead, then the routing and capture text. Pull both from
   `SERVER_INSTRUCTIONS` so SR-027's single-source rule holds. Add a sibling to
   `captureContract()` (for example `routingAndCaptureContract()`) rather than
   restating the text.
3. **Order of operations:** prepare the block before touching `hooks.json`, so a refused
   `AGENTS.md` leaves both files unchanged. This matches the Copilot deferred write.
4. **Installer messages:** say which file was written or updated, or that it's already
   current.
5. **Copilot and Muse recall:** their files have the same routing gap. Don't change them
   in this plan. Record the question in `docs/known-issues.md`, and add it to the probe
   list for those clients.

## Tests

- A new `AGENTS.md` gets exactly one block. Rerunning makes no change. A file with
  other content keeps that content byte for byte. A stale block is replaced.
- A file with two BEGIN markers, or a marker inside a code fence, is refused and
  nothing is written, `hooks.json` included.
- `CODEX_HOME` is respected.
- The block's text matches `SERVER_INSTRUCTIONS` (an anchor test, like the Copilot and
  Muse ones), so a later instruction change can't leave Codex stale without a failing
  test.
- Rerun the existing Codex installer tests: a `config.toml` inline hook still stops the
  install.

## Docs

- `docs/getting-started.md`, Codex path: step 4 also writes `~/.codex/AGENTS.md`. Say
  what it contains and how to remove it. Replace "The server's instructions tell the
  client to put it there" with the rules file. Update the "Verified with Codex 0.160.0"
  line to the version step 1 tested.
- `docs/manage-and-privacy.md`: removing rutter from Codex now also means deleting the
  block from `~/.codex/AGENTS.md`.
- `docs/known-issues.md`: under Codex, note that without the rules file Codex never
  sees rutter's instructions (0.163.0). Note any recall shortfall from step 1.
- `CHANGELOG.md`: an entry in the release that ships this.

## Measure (registered before shipping)

Over the 14 days after the release, on this machine:
- **Success:** 5 or more `client: codex` records from ordinary sessions where the user
  never named rutter, and at least one recency question answered through
  `librarian-recent` from a folder other than the rutter repo.
- **Otherwise:** check the Codex session logs for whether `agents_md` was loaded and
  what the model did instead. Then revisit the lead wording.

## Open questions

1. Did Codex 0.160.0 and 0.162.0 show server instructions straight away? The getting-
   started guide says Codex was verified on 0.160.0, which suggests the behavior
   changed. Not needed for the fix, but it decides whether the docs say "since 0.163.0"
   or "always".
2. Does Codex limit `AGENTS.md` size? Codex has a byte limit for project docs, reportedly
   `project_doc_max_bytes`, 32 KiB by default. That's not verified. The block is about
   2.2 KB, so a limit only matters if the user's own file is close to it.
3. Is one global `AGENTS.md` block too much for users who don't want rutter in every
   Codex session? The same trade-off was accepted for Muse.
