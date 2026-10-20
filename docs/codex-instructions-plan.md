---
type: plan
status: built (v0.8.4, awaiting release)
created: 2026-10-19
updated: 2026-10-20
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

## Step 1: Probe before building (partly done 2026-10-19, Codex 0.163.0)

Done, via `codex exec` from `~` with a hand-made `~/.codex/AGENTS.md` (full `SERVER_INSTRUCTIONS`
plus the Codex lead, 2,481 bytes, since removed):

| # | Result |
|---|---|
| P1 settle a preference | Pass. The model wrote the session and position lines; the hook recorded them. |
| P2 "what have I been working on?" | Pass. `librarian_recent` called, answer from records. |
| P3 "what do my notes say about X?" | Pass. `librarian_search` and `librarian_get_note` called. |
| P4 small coding task | Pass. Directive in the final reply; the hook recorded it. |
| Baseline, no `AGENTS.md` | **Capture fails**: the model confirmed a settled preference and wrote no line (342 tokens, no rutter text). **Recall passed** in `codex exec`: the model searched its tool list and found `librarian_recent` on its own. Session B (interactive) failed, so recall without the file is unreliable, not broken everywhere. |

The rules file is therefore needed for capture. Whether it is needed for recall in interactive
sessions is still to be shown.

Found along the way: the Codex hook wrote to `~/Documents/knowledge-vault` because Codex gives its
MCP server the vault from `config.toml` but hooks only the shell's environment. Fixed and shipped in
v0.8.3 (the installer bakes the vault into the hook command); verified on the live hook.

Probe 1 (interactive, v0.8.3, no `AGENTS.md`, started in the rutter repo; 2026-10-20 run by the user):
**recall passed.** The model checked git first, then called `librarian-recent` twice and answered from
records. So recall without the rules file is not broken in 0.163.0 (one interactive pass, one `exec`
pass, against the earlier session B failure). Capture is the real gap. This favors shipping the
full routing-and-capture text that passed P1 to P4, rather than a capture-only fallback, because it is
the content with evidence behind it and costs only the routing lines.

Still to run, from a normal install (v0.8.3):

1. ~~Interactive recall without the file.~~ Done, see above. Not yet run from a folder other than
   the rutter repo.
Override precedence (item 3 below) was run 2026-10-20: a nonempty `AGENTS.override.md` replaces
`AGENTS.md`, an empty one is ignored. Step 3b is therefore needed. Step 2 is built (v0.8.4) with the
full routing-and-capture block, `--no-rules`, and the override policy; its tests are in
`test/codex-rules.test.ts`.

2. **P2 inside the rutter repo**, with the file in place: git history competes with rutter there.
   Then P2 in a scratch git repo with its own `AGENTS.md`, to check Codex loads the global file next
   to a project one.
3. **Override precedence.** In an isolated `CODEX_HOME` (a temp directory with a copy of `auth.json`
   and `config.toml`), write `AGENTS.md` plus a nonempty `AGENTS.override.md`, run P1, and check
   whether the `agents_md` slot still carries the `AGENTS.md` content. Discard the directory. This
   decides whether step 3b below is needed.
4. **Capture-only fallback**, only if recall fails with the file in place: the Codex lead without the
   recall sentence, plus `captureContract()` only. Re-run P1 and P4 with that exact text before
   shipping it.

**Output:** add a "Codex rules file" section to `docs/instruction-limits-2026-10.md` with the Codex
version, date, the results above and the session ids.

## Step 2: Build (after the remaining probes above)

1. **`install-hook --client codex` writes a marked block** into `$CODEX_HOME/AGENTS.md`
   (default `~/.codex/AGENTS.md`). Use Muse's block logic rather than Copilot's
   own-file approach, because Codex reads one global file that the user may already
   use. Reuse Muse's handling as is: BEGIN/END markers on their own lines, markers
   ignored inside code fences, refuse ambiguous files and change nothing, write
   atomically. Factor that code into a shared helper rather than copying it.
2. **Content:** a Codex lead, then the routing and capture text (or the capture-only
   fallback if step 1 ended there, using exactly the text that passed P1 and P4). Pull both from
   `SERVER_INSTRUCTIONS` so SR-027's single-source rule holds. Add a sibling to
   `captureContract()` (for example `routingAndCaptureContract()`) rather than
   restating the text.
3. **Order of operations:** prepare the block before touching `hooks.json`, so a refused
   `AGENTS.md` leaves both files unchanged. This matches the Copilot deferred write.
3a. **Run on every successful Codex path, not just a fresh install.** The installer
   exits early when the hook is already registered unchanged, is custom, or is updated
   in place (`hooks/install-hook.mjs:1023`, `:1031`, `:1047`). Preparing a deferred write
   isn't enough, because those exits skip it. Restructure so each of those paths applies
   the `AGENTS.md` block (install if missing, refresh if stale, no-op if current) before
   exiting. Existing users, who are the ones hitting this, get the fix by rerunning
   the installer. The `config.toml` inline-hook refusal still stops everything first.
3b. **Global override file.** Codex loads a nonempty `$CODEX_HOME/AGENTS.override.md`
   *instead of* `AGENTS.md` (per the official instruction-loading guide). If it exists
   and is nonempty, a block in `AGENTS.md` is invisible while the installer reports
   success. Policy, in order:
   - If the override already holds a rutter block (markers present), manage the block
     there with the same install, refresh or no-op logic, and leave `AGENTS.md` alone.
   - Otherwise refuse before writing anything, naming the file. The message offers two
     ways forward: remove the override, or rerun with `--no-rules`.
   - **`--no-rules`** (Codex only) installs or refreshes the hook and skips every rules
     file. The user then adds the block to the override by hand; the message prints the
     exact text. This makes the refusal recoverable on a fresh install, so the hook
     isn't left missing. Once the user has pasted the block, the first rule above keeps
     it current on later reruns.
   - An empty or missing override file is ignored. Verify the precedence on Codex
     0.163.0 in step 1 before relying on it.
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
- A nonempty `AGENTS.override.md` without a rutter block makes the installer refuse
  with its path and the `--no-rules` hint, and nothing is written (`hooks.json`
  included). An empty one is ignored.
- `--no-rules` with a nonempty override on a fresh install writes `hooks.json` and no
  rules file. Rerunning with the block now in the override refreshes it there only.
- Existing hook, missing or stale `AGENTS.md`: with `hooks.json` already holding the
  unchanged hook, a custom hook, and an outdated hook (one case each), rerunning
  installs or refreshes the block. With the block already current, it changes nothing.
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
- `docs/manage-and-privacy.md`: removing rutter from Codex now also means checking both
  `$CODEX_HOME/AGENTS.md` and `$CODEX_HOME/AGENTS.override.md` (default `~/.codex/`)
  and deleting any rutter block from each. The block can be in the override file, so
  checking only `AGENTS.md` could leave capture instructions active.
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
