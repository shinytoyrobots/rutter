---
type: plan
status: proposed
created: 2026-10-18
updated: 2026-10-18
domain: writing
---

# Homepage positioning plan: a separate landing page, or edits to the overview

**Status:** plan only. Nothing is implemented. This plan does not authorize implementation or publication.

Source: Robin's positioning notes (`rutter-homepage-positioning-summary.md`, 2026-10-18). Read against the live site (ruttermemory.com, built from `main@4225fe8`) and [`site-content-and-positioning-plan.md`](./site-content-and-positioning-plan.md).

## Decisions (resolved 2026-10-18)

1. **Headline order.** The new positioning notes are primary; the 2026-10-09 outcome-first decision is secondary. The H1 leads with the category and the cross-agent point. The recovered-decision outcome moves to supporting copy and the proof section. The rest of the earlier plan (accuracy, candid limits, word choice, no fabricated evidence) still applies.
2. **Structure.** Separate landing page. `index.html` becomes the landing page; the current overview becomes the design page.

Both decision prompts below are kept for the record.

## Finding

The homepage answers "how does it work and why is it built this way" well. It answers "what is Rutter" slowly. The current opening is:

- H1: "Recall past decisions and the notes your AI session cited"
- Subhead: "What rutter is, why it is built the way it is, and what that costs."
- A "Keep the thread across your AI tools" band, then four dense paragraphs (what it keeps, mechanism, limits, who it suits) before the example.

The cross-agent point ("One memory across your tools") is the strongest differentiator. It sits about two-thirds down the page.

## Conflict with the earlier plan (needs a decision)

`site-content-and-positioning-plan.md` (2026-10-09) says: lead with the outcome of recovering a decision and its cited notes; cross-tool access "supports the benefit; it is not the headline"; visual and layout changes are out of scope; claims of uniqueness need separate evidence.

The new notes reverse the first point: category ("a personal memory layer for AI agents") and the cross-agent USP lead. This plan treats the new notes as superseding that single point, and keeps the rest.

**Decision 1 (resolved, see above):** confirm the headline moves from outcome-first to category plus cross-agent-first. The recommended compromise is category in the H1 and the recovered-decision outcome in the supporting line, so both survive.

## Recommendation: a separate landing page, with the current overview kept as the argument page

Do not fold the notes into the existing `index.html`. Make `index.html` a short landing page and move the current essay to its own page.

**Why not integrate:**

- The overview is a 30 KB essay that opens with an example, a "missing layer" argument, and the limits. Its job is to convince a skeptical reader. Putting a hero on top of it still leaves a long page where the pitch is one section among many, which is the current problem.
- The notes' hierarchy (what it is, shared across agents, records with sources, append-only Markdown, then detail) is a different reading order from the essay's. Reordering the essay to fit would break its argument, which builds from the example to the design to the limits.
- Every source claim in the overview is pinned by `sources.json` hashes. Rewriting the overview heavily widens the accuracy-review surface.

**Why a separate landing page works here:**

- It gives the pitch one screen to do its job. The essay stays complete for the reader who wants it.
- Candid limits are a strength of this project. A landing page must not hide them, so it carries a one-line limits statement and a link, and the essay keeps the full list.

**Risks, and how the plan handles them:**

| Risk | Handling |
|---|---|
| A punchier page overclaims | Landing copy reviewed against the limits list; no "unique", no "never lose context". "Shared" means one person's agents, stated on the page. |
| Two pages say the same thing differently | The landing page owns the pitch; the essay owns the argument and the limits. Shared claims get one wording. |
| Broken inbound links | `ruttermemory.com/` stays the landing page. Check the README, `package.json`, `server.json` and registry listings for deep links to the old overview; keep the essay's content reachable at a new URL and leave a pointer. |
| Site drift tooling | `scripts/site-drift.mjs` has no source list of its own. It reads `sources.json` from `origin/gh-pages` and checks every source that manifest names. The landing page gets a source doc (`docs/index.md`), and drift coverage comes from adding it to `sources.json` on gh-pages. No change to the script. |
| Scope creep | The earlier plan put layout changes out of scope. This work needs one new template page. Reuse `style.css` and the existing hero; no new visual system. |

If Robin prefers the lower-effort route, the fallback is to integrate: rewrite the hero and subhead, add the "One memory. Multiple agents." section directly after the hero, and leave the rest alone. That gets about 60% of the benefit. The page stays long and the pitch stays above a wall of text, but it is a smaller change and avoids new URLs.

**Decision 2 (resolved, see above):** separate landing page (recommended) or integrate (fallback).

## Landing page content (recommended route)

Order follows the notes:

1. **Hero.** H1 "A personal memory layer for AI agents". Supporting copy: Rutter keeps a record of what you decided, which notes the session cited, and how your thinking changed. Once Rutter is registered in each client and pointed at the same notes folder, each can recall the same records, stored as plain Markdown in a folder you own. Any MCP client can recall. The five clients with supported capture hooks are Claude Code, Codex, Grok, Copilot CLI and Antigravity CLI (`agy`), and capture also needs that client's hook to write a line. Keep the condition in the hero, not only lower down. Tagline: "One memory. Multiple agents. Yours." Two buttons: Get started, Read the design.
2. **One memory. Multiple agents.** "Most AI memory belongs to the tool that created it. Switch tools and you start again." A decision captured in one agent is recalled in another. The agent changes; the memory does not. One sentence: shared means one person's agents, not several people.
3. **A record, not a summary.** A summary plus the notes it cited, with the content hash taken at capture. Link the worked example.
4. **Inspectable by design.** Append-only dated Markdown in your folder; no inferred profile; references Rutter cannot place are shown, not dropped.
5. **Proof.** A condensed three-step version of the existing real example (capture in Claude Code, rename, recall in Codex). Use the existing recorded output verbatim; do not write new output.
6. **Honest fit and limits.** Four lines: capture happens only if the client writes the line; a reference shows what the session listed, not what the model read; a note changed in place, at the same path, is not flagged today; one person's tool, MIT licensed, reference implementation with no support commitment. Link to the full limits. Re-check the list against the overview's limits paragraph at edit time so none is dropped.
7. **Where next.** Getting started, the design argument, GitHub.

## Wording rules

- Use "agents" in headline and body copy; keep "MCP clients" for technical passages. Keep "tools" where the essay is describing the five specific clients.
- Keep "notes the session cited" and avoid "receipts" and "sources it rested on" (PR #68 rationale).
- "Shared across agents, personal to you" is the positioning line. Do not claim multi-user sharing.
- No uniqueness or "better memory" claims. The framing is who owns the memory, not retrieval quality.
- Name the Antigravity host as "Antigravity CLI (`agy`)" everywhere on the landing page, never bare "Antigravity". The docs expressly exclude the Antigravity IDE, and the bare name implies it is supported.
- American English. Head title and meta description updated to match the H1.
- Rutter's own "Memory" label: the notes say "personal memory layer". The essay says rutter keeps a "record of how you used a body of knowledge". Check that "memory layer" doesn't contradict "this is not a summarizing memory tool" language anywhere in the docs.

## Work breakdown

Each docs PR branches from `main`; Robin merges. gh-pages is hand-authored; work in a temporary worktree and push to `gh-pages` after the paired source PR merges.

1. **PR A (main):** add `docs/index.md` (landing source) and rename the role of `docs/overview.md` to the design page. Update README opening sentence to match the new H1; leave the `SERVER_INSTRUCTIONS` block alone.
2. **gh-pages port:** new `index.html` (landing), the current overview moved to `design.html`, nav changed from "overview" to "design" (or "why"), `llms.txt`, `sitemap.xml`, canonical and meta tags, `sources.json` rehash (add `docs/index.md` to its `sources` map, which is what puts it under `site-drift`), footers `main@<short-hash>`.
3. **Redirect/links check:** grep README, `package.json`, `server.json`, CHANGELOG and getting-started for links to the old overview; fix or keep.
4. **Verify deployed site:** fetch each live page, confirm text and footer, run `npm run site-drift`. Check at phone width, with the skip link, and the `prefers-reduced-motion` behavior of the scanline and cursor effects.
5. **Optional later:** a single "decision captured in X, recalled in Y" figure on the landing page.

## Open questions

- Is Grok listed in the supported-client wording the same way on the landing page as in the essay? The README table is the source of truth; check it at edit time.
- Which of the three alternative headlines, if any, do we want to A/B? The site has Plausible analytics, so a short test is possible, but traffic is probably too low for it to mean much. Default: ship the recommended hero.
- Does "personal memory layer" sit well with the Snow Crash / logbook story? It is kept in the essay, not the landing page.
