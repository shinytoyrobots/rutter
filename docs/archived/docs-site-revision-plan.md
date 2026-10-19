---
type: plan
status: proposed
created: 2026-10-09
domain: writing
---

# Docs and site revision — plan

**Status:** plan only. Nothing is implemented. This turns the 2026-10-09 documentation audit
(`~/Documents/knowledge-vault/Notes/Reference/Tech-Writer/audits/2026-10/09-rutter-gh-pages/tw-audit.md`)
into ordered work. The audit holds the evidence for each item; this file says what to change, where, and in what order.

## Goal

Make the published docs say exactly what rutter does today: a complete install path, accurate status, claims no
stronger than the mechanism, a stated trust boundary, a concrete example before the philosophy, and a mechanics page a cold reader can follow.

## Scope

- **In:** `docs/overview.md`, `docs/getting-started.md`, `docs/memory-of-use.md`, `README.md`, the three gh-pages HTML ports, `sources.json`, the Vale setup.
- **Out:** code changes, new capabilities, and the product-direction points in the audit (usage-versus-activity measure, outside validation, setup-step reduction). Changed-content drift detection is **not** built here; the docs are corrected to say it is not built.
- **Do not touch:** the `SERVER_INSTRUCTIONS` block quoted in the README. A test fails if that copy drifts from `src/server.ts`.

## Ground rules

- Every docs PR branches from `main`. Never commit to `main`. Merge with `--merge`, and the merge is Robin's.
- Any edit to `docs/overview.md`, `docs/getting-started.md`, or `docs/memory-of-use.md` needs the paired gh-pages port and `sources.json` rehash, or the site goes publicly stale.
- The gh-pages port is hand-authored HTML. Work in a temporary worktree of `gh-pages`. Pushing straight to `gh-pages` is fine.
- Footers cite `main@<short-hash>` of the docs content commit, with no version-tag claim.
- Use American English. Keep every behavioral guarantee on the mechanics page ("never", "nothing"); trim repetition, not contracts.

## Decisions to make before starting

1. **Where does the trust-boundary section live?** Recommended: a short version in the overview and the full list in `memory-of-use.md`, so no new site page, nav item, or manifest entry is needed. Alternative: a fourth page.
2. **Where does troubleshooting live?** Recommended: an "If something goes wrong" section at the end of `getting-started.md`. A separate page can follow if it grows.
3. **How does the opening example handle drift?** Recommended: build it only from shipped behavior (original conclusion, stored hash, a renamed note followed, an unresolved reference shown). Alternative: include a changed-note step labeled "planned".

## Work, in order

### PR 1 — accuracy and install path (audit priorities 1, 2, and the wording half of 3)

Branch: `docs/install-path-and-status`.

1. **`docs/getting-started.md`, Before you start.** Add an "If you use Claude Code, the fast path" box that runs from install through capture and recall. (a) Install, from the README: `/plugin marketplace add shinytoyrobots/rutter`; `/plugin install rutter@rutter`; choose the notes folder when asked (from a shell, pass `--config vault_path=…` or run `/plugin configure rutter@rutter`); `/reload-plugins`. (b) Check the server: `/mcp` lists `rutter` with four tools. (c) State that plugin users **skip Steps 1 to 6** (clone, notes path and reindex, hand capture, CLI recall, register, install-hook), because the plugin already provides the server and the Stop hook, and manual setup on top of it duplicates both. Steps 2 to 4 also use `npm run` scripts from a clone they won't have. They rejoin at Step 7 (restart and capture), which the box's own capture and recall steps replace. Also remove any hand-registered hook from `~/.claude/settings.json`, or captures are attempted twice. (d) Do a small real task (one decision or small change in a project directory), then confirm capture: a file for today's UTC day exists in `<notes>/_librarian/sessions/`. (e) Recall it: ask "What was I working on lately?" and show the expected shape of the answer, as Step 8 does. Point the Codex and Antigravity callouts at the box so "one-command plugin install" and "the plugin's notes-folder option" have a referent. Derive each expected output from the code or a real run, and mark it as shape-only like the existing examples.
2. **`docs/overview.md`, "How it works, conceptually".** Replace "spec v14.0.0, all eleven … SCN-001 through SCN-011" with a plain list of what ships, including the client label. Drop the SCN numbering.
3. **Capture-time wording.** Replace "as it was read" and "what you saw" with wording that says the hash is the file's content when capture ran. Sites: `docs/overview.md` (References that carry a hash), `docs/memory-of-use.md` §1, `docs/getting-started.md` Step 8 note, and `README.md` (the how-this-differs paragraph and the note-identity bullet).
4. **Soften "cannot assert provenance it never had"** (`docs/overview.md`, Writing): the server computes the hash, but the client chooses which paths to list.
5. **Remove "see below"** in `getting-started.md`, Make the path stick, and name the paragraphs it points to.

**Verify:** a reader following only the new box reaches a captured session and a correct recall without running any manual-install step, and ends with exactly one rutter server and one rutter Stop hook. Other tools may legitimately register their own, so count only rutter's. Check the server with `/mcp`. The plugin supplies its hook through `hooks/hooks.json`, not `settings.json`, so verify the active hook with the client's hook inspection (`/hooks` in Claude Code), and use `~/.claude/settings.json` only to find a leftover manual `install-hook` registration. Confirm during execution that the plugin's hook appears in that view; the `/mcp` check matches the README. Wording check, scoped to the four edited documents only (this plan quotes the phrases, so it is excluded): `grep -n "as it was read\|what you saw" docs/overview.md docs/getting-started.md docs/memory-of-use.md README.md` returns nothing. Check the HTML separately in the port step.

### PR 2 — claims, trust boundary, drift, opening example (audit priorities 3, 4, 6, 7)

Branch: `docs/claims-and-trust-boundary`. Starts after PR 1 merges, because it rewrites the same overview paragraphs.

1. **Drift claims (audit finding 2a).** Reword "Drift becomes visible instead of silent", "with the drift named", "drift shown rather than resolved", and "this shows the drift" (Kage comparison), in `docs/overview.md` and `README.md`. Each must say what ships: renames followed by exact hash match, unresolved references shown with candidates, confirmed-versus-automatic disagreements rendered, and stored hashes that allow a later comparison. State the unbuilt changed-content detection at the first mention, not near the end. The "shown, never resolved" principle can stay as a design stance about what rutter will do.
2. **Trust boundary.** Write "What rutter can and cannot establish". It covers the following:
   - *Can establish:* which paths the client listed, each file's hash when capture ran, and the conclusion the client wrote.
   - *Cannot establish:* that the model read every listed file, that the files caused the conclusion, that capture is complete, or that nothing changed between reading and capture.
   - Append-only is an application invariant, not tamper-proof auditing.
   - It gathers the capture dependencies now scattered: no directive means nothing captured, the Antigravity and Codex caveats, and the advisory style contract.
   - Link it from the overview and the README's *Known limitations*.
3. **Opening example.** Add a short August-to-October story before the store/memory framing, following decision 3.
4. **Overview headings.** Rename "What this explains" and "How it works, conceptually". Target order: the missing layer, an example, how it works, why it is different, tradeoffs, what it is not, try it. Keep the tradeoff sections.
5. **Reframes.** Cut the overview's "not X, but Y" and "rather than" constructions to two or three, starting with the three-in-a-row "Not multi-user" paragraph. Trim "deliberately" and "on purpose" to two uses. Keep "Same store, two readers, two different memories, made literal".
6. **Naming.** Add one sentence saying the tools, variables, and `_librarian/` folder kept the earlier name. Use "rutter" or "the server" in place of "the librarian" on the mechanics page.
7. **Receipts.** Keep "receipts" for the spec; use "recorded provenance" or "versioned references" when the word describes the records.

**Verify:** every behavioral claim in the new section maps to code (`src/refs.ts`, `src/identity.ts`, the capture path) or to a README limitation; the example uses no unbuilt behavior (or labels it); reframe count by reading the diff.

### PR 3 — mechanics rewrite (audit priority 5)

Branch: `docs/mechanics-cold-reader`. Run `/tw-review docs/memory-of-use.md --depth deep` first and use its output as the checklist.

1. Gloss or replace "projection", "fold", "desirability gate", "kill gate", "supersession pointer", "candidate-anchored", "additive-optional", and "Stop envelope".
2. Cut "spec v3.11.0". Say whose usage "~19 outcomes a day" and "3.2" describe and over what period (one person's), which is also the honest caveat on the gate.
3. Collapse the three statements of the confirmed-binding rule (§6) into one.
4. Shorten the longest sentences (54 go over 26 words) where it improves clarity. Keep every guarantee.
5. Fix the section numbering (1, 2, 2a, 2b, 3 …) so it scans.
6. Reconcile with the setup steps in the tutorial: link to Step 6 instead of repeating installer commands.

**Verify:** a before/after table of guarantees ("never", "nothing", INV-labelled behavior) shows none removed; readability re-run on the HTML (target: the page reads clearly, not a fixed grade).

### PR 4 — housekeeping (audit priorities 8, 9, 10, 11)

Branch: `docs/housekeeping`.

1. **Code block tags.** Add a language to the 7 untagged fences in `docs/memory-of-use.md`. Add `class="language-…"` to all 37 `<pre><code>` blocks in the site HTML.
2. **Troubleshooting section** at the end of `getting-started.md` (decision 2): 0 notes indexed, no session file appeared, Codex hook not trusted, captures landing in the default vault, Grok clipping at 32,768 characters, and the duplicate-hook warning.
3. **Vale.** Add `rutter`, `agy`, `toolchain`, `tmux`, `Raycast`, `worktree`, `camelCase`, `idempotence`, `lossy`, and the possessives to `.vale/styles/config/vocabularies/Librarian/accept.txt`. Extend `.vale.ini` to `[*.{md,html}]` if site linting is wanted.

**Verify:** `vale` on the three docs returns zero alerts.

### After each PR merges — gh-pages port

1. `git fetch origin gh-pages`; add a temporary worktree of `gh-pages`.
2. Hand-port the changed prose into the HTML. Keep the established heading ids; anchors in `getting-started.html` and `memory-of-use.html` are linked across pages (`#step-6`, `#note-identity`, `#search-enrichment`, `#the-gate`, `#the-style-contract`).
3. Update `sources.json` (hashes, `builtFrom`, `generated`) and the three footers to `main@<short-hash>`.
4. **Verify the HTML before pushing.** Diff the visible text of each page against its markdown source. Fetch every external link. Re-run the anchor check. Grep the HTML for the retired phrases (`as it was read`, `what you saw`) and for any drift claim PR 2 removed. Fix anything found; do not push until this passes.
5. Commit and push to `gh-pages`.
6. **Verify the deployed site.** Fetch each live page (`ruttermemory.com`) and confirm it shows the new text and footer. Run `git fetch origin gh-pages`, then `npm run site-drift` on `main`; it must report the three sources as matching. Note that `site-drift` only compares the markdown with the manifest and never reads the HTML, which is why step 4 exists.

## Order and dependencies

PR 1 → PR 2 → PR 3. PR 4 is independent of PR 2 and PR 3 (except the troubleshooting section reads best after PR 1) and can run in parallel. Port after every merge, not once at the end, so the site never stays stale across PRs.

## Done when

- A first-time Claude Code reader can install from the tutorial's fast path and see a recall, with a success check.
- No page claims proof that the model read a file or that a file caused a conclusion, and no page promises drift visibility that is not built. (The trust-boundary section mentions reading, to say rutter cannot establish it.)
- A "what rutter can and cannot establish" section exists and is linked from the overview and README.
- The overview opens with a concrete example from shipped behavior.
- The mechanics page passes the cold-reader test without losing a guarantee.
- Pre-push checks passed (HTML text matches the sources, external links resolve, anchors resolve), the deployed pages show the new text, `npm run site-drift` is green, and Vale reports no false spelling alerts.

## Not in this plan

Changed-content drift detection (building it is a separate spec decision), changing the gate's usage metric, outside user validation, new setup automation, and productizing. The audit records these as product questions.
