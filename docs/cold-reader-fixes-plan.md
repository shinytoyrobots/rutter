# Cold-reader fixes for the docs site

Status: Markdown implemented in the cold-reader-fixes PR to main; HTML port to gh-pages follows. Source: a cold-reader review of the published gh-pages site on 2026-10-19 (home, design, getting-started, FAQ, memory-of-use, llms.txt).

Page sources: home = `docs/index.md`, design = `docs/overview.md`, plus `docs/getting-started.md`, `docs/faq.md`, `docs/memory-of-use.md`. The published site is hand-authored HTML on the `gh-pages` branch. Editing the Markdown does not change it, and `scripts/site-drift.mjs` only compares Markdown hashes against `sources.json` on gh-pages; it never looks at the HTML. So every change needs a paired HTML port. See "Publishing" at the end.

## Decisions (settled 2026-10-19)

1. **Audience framing: resolved.** The six clients are coding harnesses, but people use them for non-coding work too (research, drafting, planning). Home should say "AI agent harnesses" or similar, and say once that they are often used for non-coding tasks. Replace "AI coding clients" on home, in the home eyebrow, and in `llms.txt`. The design page's "this is not about coding sessions" stays, reworded to match: the tools are coding harnesses; rutter's use is not limited to code.
3. **Site motto: revised 2026-10-19.** "The model isn't the memory. Your notes are." is no longer the general subtitle. It becomes the opening line of the *Why not built-in memory?* block on home, in `docs/rutter-website-implementation-plan.md` (Priority 1). The hero keeps "One memory. Multiple agents. Yours."; the masthead carries "Who owns memory owns truth." (`docs/field-log-design-plan.md`). See "Deferred: motto".
2. **Getting-started: split.** Move the manual route and the pause/remove/privacy material onto their own pages. The top nav is already crowded, so the split ships together with a nav review (Phase 3b).

## Phase 1: contradictions and overclaims (do first)

| # | Fix | Files |
|---|-----|-------|
| 1 | Apply the audience framing from decision 1 on home, design, and `llms.txt`. | index.md, overview.md, llms.txt |
| 2 | Add a footnote to the home "Verified with" column header: Grok was verified on Linux only; the other npm-only paths were tested on a machine that also had Claude Code. Link to the FAQ known issues. | index.md |
| 3 | Reconcile version numbers by separating three kinds of version claim and labeling each its own way (see below). Explain the Codex 0.160.0 (verified) versus 0.162.0 (proof run) difference in one sentence. Decide whether the npx example's `0.8.1` should follow the current release. | index.md, getting-started.md, overview.md |
| 4 | Replace "supported hook" with "working hook" where it sits near "no support commitment". | overview.md |
| 5 | Already done: PR #127 removed the FAQ question "Do I need Claude Code…" and is merged. The review ran against the older published site, so the live site may still show it until the next deploy. The caveat now lives only in known issues, so item 2's footnote should link there. | faq.md |

Item 3, the three kinds of version claim:
- **Recorded evidence:** only the home and design proof is an actual recorded run (9 October 2026, Claude Code 2.1.296, Codex 0.162.0, rutter 0.5.0). Label it as such, once, where it already is. Do not extend that label to anything else.
- **Illustrative output:** the getting-started samples (including the `rutter 0.5.0` strings and August dates in the capture and reindex output) are not recorded runs. Keep one note, "output shape verified against code; your values will differ", at the top of each page that carries samples: `getting-started` and the new `from-source` page (the manual route holds most of the capture, recall and reindex samples, so it must carry the note itself, not rely on the page it was moved from). Any other new page that includes sample output gets it too. Do not give these a recorded-run provenance. Where a sample contains a version string, change it to something clearly illustrative or leave it unlabeled with that top note covering it.
- **Install version pins:** the npx example's `rutter-memory@0.8.1` and the "Verified with" client versions are instructions and test claims, not output. Label pins as "pin to the release you want; 0.8.1 at time of writing", and keep "Verified with" as the client version tested, with the Linux-only and Claude-Code-present caveats from item 2.

## Deferred: motto (follow-up task, not part of this plan's work)

Do not add the motto during this work. It is a subsequent task, now owned by `docs/rutter-website-implementation-plan.md` (Priority 1). Leave "One memory. Multiple agents. Yours." and the existing hero copy untouched. Revised 2026-10-19: the motto is not a subtitle. It opens the *Why not built-in memory?* block, so the bullets below that replace the hero subtitle, `README.md:3`, or rename the "One memory. Multiple agents." section heading no longer apply. The bullets on `llms.txt`, meta descriptions, the cold-reader check and the archived plan still apply.

Motto: "The model isn't the memory. Your notes are."

Occurrences of the old tagline today: `docs/index.md:3` (hero subtitle), `docs/index.md:16` (section heading "One memory. Multiple agents."), and `README.md:3`. The inner-page headers, `<title>`/meta descriptions and `llms.txt` carry the "personal memory layer" line, not the old tagline, so check them separately.

- ~~Replace the hero subtitle on home and the opening line of `README.md` with the new motto.~~ Superseded: the hero subtitle and `README.md:3` keep the tagline.
- ~~Keep or rename the "One memory. Multiple agents." section heading.~~ Resolved: keep it. The motto is not a tagline, so nothing competes with it.
- Add the motto to `llms.txt` (summary line), the home meta description, and the social/share description if one exists.
- Check the cold-reader rules against it. "The model" is plain, but the motto implies the notes carry the memory, while rutter's records live in a `_librarian/` folder beside the notes. The body copy right under the motto should say in one sentence what that means (the records are plain Markdown in your own notes folder) so the claim does not read as an overstatement.
- Make `docs/archived/homepage-positioning-plan.md` consistent or mark it superseded, since it still quotes the old tagline.

## Phase 2: undefined terms

- Define **hook** on first use on home: a script the client runs after each turn. One clause, in parentheses.
- Expand **MCP** (Model Context Protocol) on first use on every page, not only design.
- Add a two-sentence definition of **memory-of-use** at the top of its page and in the nav description on home.
- Connect **position** on home to the term: "a stance you formed or changed (a position)".
- Remove internal identifiers from memory-of-use (`SR-023`, `INV-6`, `toInertLine`, `config.maxSummaryChars`, `config.positionDormantAfterDays`). Point to the spec instead.
- Pick **notes folder** as the user-facing term. Use "vault" only where the config variable or an Obsidian reference requires it.
- Simplify two dense passages: "Resolves means a file exists…" (memory-of-use) and the Copilot "Copilot-specific lead line" (FAQ).

## Phase 3: getting-started navigation

- Give each path its own numbering prefix, or renumber the manual route as M1–M8, so "Step 6" is never ambiguous.
- Fix the fast-path sentence "skip Steps 1 to 6 below" to name the manual route.
- Rewrite cross-references that point into the manual route (Codex "Step 2 shows the full output", Antigravity "Make the path stick") so each names the manual route or links to a section that stands alone.
- Make the troubleshooting entries refer to the per-client path steps, not the manual-route steps.
- Say "output shape verified against code" once at the top of each page that has samples (`getting-started` and `from-source`) and drop the per-sample repeats.
- Split getting-started into three pages:
  - `getting-started` keeps the per-client paths, upgrading, and troubleshooting, so a reader gets from install to first recall without leaving it.
  - A new contributor page takes the manual route from a clone (working title `from-source`), with its own M1–M8 numbering.
  - A new page takes pause, remove-a-record, and what-leaves-your-machine (working title `manage-and-privacy`). The FAQ and troubleshooting link to it.
- Split "Known issues" out of the FAQ into its own page (working title `known-issues`). It is about half the FAQ and has its own structure (confirmed versus not tested, each entry as what you see, why, what to do). The FAQ keeps a short pointer, and the home "Honest fit and limits" section, the Grok path and the troubleshooting entries link to the new page directly. Keep the confirmed/not-tested distinction and the intro paragraph that defines it.
- Update `sitemap.xml`, `llms.txt`, `sources.json` inputs, and every inbound link and anchor (the FAQ and memory-of-use link into the current page heavily).
- **Keep every existing URL working.** Bookmarks and external links already point at fragments such as `getting-started.html#pause-capture` and `faq.html#known-issues`. For each section that moves, keep its old anchor ID on the original page, as a short heading plus one or two sentences and a link to the new page (for example, "Pause capture now lives in Manage and privacy"). Never delete an old ID. Build the list of legacy anchors by extracting every `id` from the current gh-pages HTML for getting-started and faq before the split, and keep that list in the PR description.

## Phase 3b: nav review

Today the top nav has six items: home, design, getting-started, faq, memory-of-use, source on GitHub. The split would add three pages (from source, manage and privacy, known issues). Do not add them to the top bar.

Decided 2026-10-19: the "Docs" landing page, as follows.
- **Top bar, four items:** Home, Get started, Docs, GitHub.
- **Docs** is a plain landing page (or a section on home) listing, in this order: Why is it built this way? (the design page), How it works (today's memory-of-use), FAQ, From source, Manage and privacy, and Known issues last, each with a one-line description. Use the same order in the shared sibling list on inner pages. This avoids a JavaScript dropdown on a static site and works on phones.
- Rename for plain language: "memory-of-use" becomes "How it works" in the nav label only; keep the URL to avoid breaking links. "design" becomes "Why is it built this way?" (decided), in the nav label and the Docs list; keep the `design.html` URL.
- Add a small "Docs" sidebar or footer link list on each inner page so readers can move between sibling pages without going back up.
- **At phone width the nav is a vertical list** (decided), not a wrapping row. Rework the nav in `style.css`: a stacked list below a breakpoint, collapsed behind a plain "Menu" toggle only if it takes too much of the first screen. Prefer no JavaScript (for example a `<details>` element). Keep the desktop row unchanged. Check the current nav's behavior at phone width first as the baseline.

Rejected alternative: five top items with the extra pages in a shared footer list. Cheaper, but those pages are less discoverable.

## Phase 4: small items

- FAQ link label "Overview: why rutter is built this way" should read "Why is it built this way?" to match the nav.
- State once, near the first trial figure, that "four of five" and "1 of 4" are tiny trial samples.

## Verification

1. Re-run the cold-reader review on the ported, rendered pages and confirm each finding above is closed.
2. Check internal anchors and links resolve, and that the nav fits at phone width.
3. Check every legacy URL from the list built in Phase 3 (for example `getting-started.html#pause-capture`, `faq.html#known-issues`) lands on a pointer or the content, not a dead fragment.
4. Run the publishing steps below, ending with the drift check against the fetched gh-pages.

## Publishing

Docs changes reach the site only through these steps, in order. All of it goes through GitHub; no direct uploads.

1. Branch from current main (includes #127). Edit the Markdown sources and open a PR to main. Merge it.
2. Port each changed page to HTML on a gh-pages branch, by hand, including new pages, the nav, `sitemap.xml`, `llms.txt`, and `style.css` if the nav changes.
3. Update `sources.json` on gh-pages: the new content hashes for every source Markdown file, including the new docs pages, plus `builtFrom` and `generated`. The footer's "Built from main@<sha>" and "source hashes" link must match.
4. Review the rendered HTML in a browser (desktop and phone width), not only the diff.
5. Open a PR to gh-pages, merge it, and let the normal deploy run.
6. Run `git fetch origin gh-pages`, then `npm run site-drift`. It must exit 0. Remember it checks Markdown hashes only, so step 4 is the HTML check.
7. Spot-check the live site, including the legacy URLs from Verification item 3.
