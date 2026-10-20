# rutter — Website Implementation Plan

**Date:** October 19, 2026  
**Scope:** Public website, getting-started documentation, and repository README  
**Goal:** Help a new developer understand what rutter does, why it differs from built-in agent memory, and how to verify a working installation—without diluting its technical rigor.

## Target outcome

A first-time visitor should be able to answer, within roughly a minute:

1. **What is rutter?** A local, shared memory layer across supported AI tools.
2. **Why use it?** It preserves decisions and their referenced context across clients instead of relying on isolated session summaries.
3. **How do I try it?** Follow a clearly linked client-specific setup and verify capture and recall.

Keep the positioning deliberately scoped to **one user's memory across multiple agents**, not team-shared or enterprise memory. Avoid implying that cited files prove a model actually read them.

## Voice and register

Every page this plan touches follows two sources. Voice (how it sounds) comes from `~/knowledge-vault/Non-Fiction/Professional voice and tone guide.md`. Legibility (whether it parses) comes from the cold-reader rules (`context:cold-reader`). If they conflict on sound, the voice guide wins; on parsing, the cold-reader rules win. The name is always lowercase: **rutter**.

**Professional voice guide.** The site sits in its product-vision register: outcome-first, compressed, short sections.
- Specific over generic. Every claim carries an anchor: a version, a date, a path, a real run.
- One reframe per page, two at most. The homepage already has two ("rutter does not belong to a tool"; "A record, not a summary"). Fold the new *Why not built-in memory?* block into the first rather than adding a third.
- Commit; don't hedge. State limitations flatly ("an edit at the same path is not detected"). Warm, not cold: say where it breaks the way a colleague would.
- Disclose the stake plainly (personal/reference implementation, single user). No false modesty, no apology.
- Run the anti-slop pass on every rewritten section. Three vocabulary tells in one section means rewrite it.

**Cold-reader rules.**
- Gloss on every use: plain phrase (canonical term), each time, never only the first. Applies to *MCP (Model Context Protocol)*, *hook*, *content hash*, *reindex*, *resolves / unresolved*, *position*. The homepage currently glosses MCP in the table but not in the opening.
- No naked metrics. Any hash or count in the demo is printed with its correct reading ("the contents match", never "a model read it"), or left out.
- Each page parses for someone who landed on it from search, with no earlier page read.
- Replace insider jargon ("memory-of-use", "ambient capture") with a plain phrase where a newcomer meets it first.

**Static Drift guide (secondary, inspiration only).** Its "never explain" rule does not suit documentation. Borrow narrowly:
- The Priority 2 story: concrete detail doing the work, short declaratives then a longer sentence. Mark the example notes as fictional.
- Section closers: a short flat sentence, no reflective summary paragraph.
- Keep out: worldbuilding, atmosphere, mythic ambiguity, anything that blurs what the product does.

## Priority 1 — Rebuild the homepage opening

**Change**
- **Three lines, three jobs (decided 2026-10-19).**
  - **Brand line, masthead:** **“Who owns memory owns truth.”** Why rutter exists. Set in `docs/field-log-design-plan.md`.
  - **Tagline, hero subtitle:** **“One memory. Multiple agents. Yours.”** What rutter does. Unchanged; its last word carries the ownership thesis.
  - **Motto, body copy:** **“The model isn't the memory. Your notes are.”** What rutter is not. It opens the *Why not built-in memory?* block below. It is not a subtitle or tagline anywhere.
  - This supersedes the cold-reader plan's decision to make the motto the general subtitle. That plan's “Deferred: motto” section is updated to match.
- The sentence right under the motto says what it means, so the claim is not an overstatement: the records are plain Markdown in your own notes folder (in a `_librarian/` folder beside the notes), not inside the model.
- Every line of new hero and comparison copy must be consistent with “Who owns memory owns truth.”: the user's records, in files the user owns, are the account of what was decided. Do not write copy that implies a vendor, a model, or rutter itself holds the truth.
- Follow with one or two sentences explaining durable decisions, references, and portable local Markdown records.
- Make the primary CTA **Get started**, with **View source** secondary.
- Add a compact *Why not built-in memory?* explanation: cross-client portability, chronological records, and traceable file references.

**Acceptance criteria**
- Hero clearly establishes what rutter is, the intended user, and the primary benefit without requiring architectural knowledge.
- Neither the hero nor comparison copy overclaims evidence, security, or supported capabilities.
- Passes the Voice and register checks: one reframe, glossed terms, no vocabulary-tell clusters.

## Priority 2 — Replace the first technical demonstration with a human-readable example

**Change**
- Present a short two-client story: a decision captured in one agent, subsequently recalled in another.
- Constrain the note-change part of the story to behavior the reference check implements today, using the **two distinct notes** of the existing demo (`docs/overview.md`, “An example”). They are two separate cases, not two steps on one note: once a rename has been bound, a later edit and move of that same note can still resolve through the saved binding, so one note cannot show both outcomes.
  1. **`Notes/reader-survey.md`, an unchanged rename:** moved to `Research/reader-survey-autumn.md` with its contents intact. After reindexing, the reference resolves at the new path by content hash.
  2. **`Notes/publishing-cadence.md`, edited and renamed:** gains a line and is moved to `Notes/cadence-decision.md`. After a second reindex, the reference is unresolved, because neither the old path nor the old hash matches.
- Reindex after each of the two changes, as the original run did. State the reindex step in the plain-language story, not only in the transcript.
- Retain the **changed-in-place limitation** explicitly: an edit at the same path is not detected, and a resolving reference does not verify that the contents are unchanged. Do not describe "verified" as a status the check produces; say "resolves" and "unresolved".
- Move the complete real-run transcript, JSON, hashes, and commands into a clearly linked **See the full demonstration** section or separate page.
- Preserve the provenance of the existing demo, including the date, client versions, and the distinction between fictional example notes and real execution.

**Acceptance criteria**
- The first example is understandable without reading terminal output.
- Every status shown in the example matches what the reference check outputs today (the unchanged-rename note resolves by hash; the edited-and-renamed note is unresolved after reindex), confirmed against `spec/spec.md` and the tests, not inferred.
- The example names two different notes. No sentence says “the note” for both cases.
- The changed-in-place limitation appears next to the example, not only on the limitations page.
- Full technical evidence remains accessible and unedited in substance.
- The example never implies a hash establishes that a model read a referenced file.
- Verified against committed `main`, not the working tree: `spec/spec.md` and the reference-check tests currently carry uncommitted changes.
- Passes the Voice and register checks, including the plain-words and glossing rules for *content hash*, *reindex*, *resolves* and *unresolved*.

## Priority 3 — Separate product overview from architecture and philosophy

**Starting point.** The restructuring is largely done; this plan must not redo it. The homepage is `docs/index.md`. The extended argument, including *The bets, and what each one costs*, already lives in `docs/overview.md` (nav label "Why is it built this way?", URL `design.html` on the site). The Docs landing page, nav labels, and sibling order were decided in `docs/cold-reader-fixes-plan.md` (Phase 3). Build on that.

**Current-to-proposed mapping**

| Proposed role | Existing page (source → site URL) | Action |
| --- | --- | --- |
| Overview | `index.md` → `index.html` | Keep. Rewrite hero, demo, and comparison here (Priorities 1–2). Do not add architecture. |
| Getting started | `getting-started.md` | Keep. Add per-client verification (Priority 4). |
| How it works | `memory-of-use.md` (nav label only; URL kept) | Keep. Absorbs record, retrieval, reference, and identity detail; no new page. |
| Design decisions | `overview.md` → `design.html` | Keep. Already holds the bets and tradeoffs. Edit in place only. |
| Limitations | `overview.md` ("What rutter can and cannot establish", "What it deliberately is not"), `memory-of-use.md` ("What rutter can and cannot establish"), `known-issues.md` | Default: reorganize within these pages, no new page. Add a consolidated section only if Phase 3 shows a reader cannot find the three classes below in two clicks. |
| Not in the proposal, stay as is | `docs.md` (Docs landing), `faq.md`, `from-source.md` (contributor/build path), `manage-and-privacy.md`, `known-issues.md` | Keep, keep in the Docs list order from the cold-reader plan, and include in the client-matrix and link audits. |

**Change**
- Confirm, before moving anything, that the homepage carries no architectural justification that duplicates `overview.md`. Move only what is actually duplicated, and link to the existing section rather than copying it.
- Keep homepage language concise, with contextual links for technical readers.
- Classify limitations into **deliberate design boundaries**, **current implementation limitations**, and **not-yet-built capabilities**, within the existing pages where possible.
- **Preserve inbound links.** Before any heading rename, split, or move, build the list of existing page URLs and fragment anchors (the cold-reader plan's Phase 3 list is the baseline). Keep every old URL and anchor working; where content moves, leave a pointer at the old location. Renaming a nav label never renames a URL.

**Acceptance criteria**
- The overview can be skimmed end-to-end without technical deep dives.
- Existing nuanced claims and caveats remain findable in one or two clicks.
- Navigation makes setup and architecture equally easy to locate.
- No existing page URL or fragment anchor returns a dead link or lands on the wrong content (checked with the legacy-URL list).
- No completed restructuring from the cold-reader plan is duplicated or reverted.

## Priority 4 — Align client support and onboarding documentation

**Starting point.** Largely done for the homepage and getting-started guide. `docs/index.md` and `docs/getting-started.md` already list the same six clients (Claude Code, Codex, Grok, GitHub Copilot CLI, Antigravity CLI, Muse Code), each with a setup path that ends in capture and recall checks. The README has not been audited. Remaining work: the README audit, the verification checklist below, and a test that fails when the three surfaces disagree on clients or capabilities. Without the test, "single source of truth" means three hand-edited copies.

**Change**
- Audit the client lists and setup paths across homepage, getting-started guide, and GitHub README; reconcile discrepancies (including Muse Code where currently documented).
- Maintain a single source of truth for supported clients and their capabilities. Default: a **separate capability registry**, keyed by the six existing capture identities. Do not change `CLIENTS` in `src/client.ts`. It defines the runtime `Client` type and backs `isClient()` and `parseExplicitIdentity()`, so anything added there could become a captured record's client label.
  - **Keys:** the six `Client` values, typed as `Record<Client, ...>` so the compiler fails if the registry and `CLIENTS` drift apart.
  - **Fields per client:** capture hook supported, recall supported, instructions file required, last verified (client version and date), and qualification (a `known-issues.md` anchor, or none).
  - **Recall-only MCP row:** documented outside the identity set, as a separate constant in the registry module. It has no capture, and it is never a valid client label.
  - **Test:** assert the registry's keys equal `CLIENTS`, and that the recall-only row's key is not accepted by `isClient()`.
  - If Phase 4 picks a different home, it names it before any list is edited.
- For each supported client, provide: prerequisites, install/configuration steps, first capture, first recall, and removal/disable instructions.
- Add a small **Installation verified when…** checklist:
  - A decision was captured.
  - It appears in the local record.
  - A subsequent session can recall it.
  - Where supported, a different client can retrieve it.

**Acceptance criteria**
- Public client matrices agree across surfaces.
- Every client marked supported has an accurate, executable onboarding path or an explicit qualification.
- Users can distinguish a configured integration from a successfully tested memory workflow.
- A test fails when the homepage, getting-started guide, or README disagrees with the capability registry on any client's name, capture support, recall support, or qualification. Matching client names alone does not pass.
- The capture identity set (`CLIENTS`, `isClient()`, `parseExplicitIdentity()`) is unchanged, and the recall-only MCP row cannot be accepted as a client label.

## Priority 5 — Strengthen proof and adoption feedback

**Change**
- Add one or two concise, reproducible usage scenarios beyond the existing detailed demonstration.
- Introduce a simple issue/discussion prompt for installation failures, unsupported clients, and unexpected recall behavior.
- If real user examples or feedback become available, feature them with permission; do not manufacture testimonials or imply unverified adoption.
- Retain clear disclosures: personal/reference implementation, single-user focus, and no managed-service guarantees.

**Acceptance criteria**
- At least one clear end-to-end workflow is reproducible from published instructions.
- There is a visible way for users to report onboarding friction.
- Claims remain grounded in demonstrated behavior rather than popularity metrics.

## Suggested delivery sequence

| Phase | Work | Deliverable |
| --- | --- | --- |
| **1 — Messaging** | Rewrite hero, benefits, CTAs, memory comparison in `index.md` | Updated homepage opening, published to the site |
| **2 — Demonstration** | Add simple cross-agent example (rename resolves; edit plus rename unresolved); retain full evidence | Short demo + technical appendix, published |
| **3 — Navigation** | Apply the page mapping; reorganize limitations; keep old URLs and anchors | Revised information architecture, legacy-URL list checked |
| **4 — Documentation** | Reconcile client matrix, setup guides, and verification flow | Consistent docs and README, published |
| **5 — Validation** | Test onboarding from a clean environment; cold-read the homepage (hand a fresh reader only that page and ask the three target-outcome questions); review claims and links; verify deployed site | Published QA checklist and fixes. Names which `known-issues.md` entries the clean-machine test closes; the "clean machine is untested" wording changes only on evidence |

Each phase that changes docs is not done until it has been through the Publishing section.

## Publishing

Markdown edits alone do not change the website. The site is hand-authored HTML on the `gh-pages` branch, so every phase that changes docs ends with the publishing procedure in `docs/cold-reader-fixes-plan.md`, section "Publishing". Follow it as written; all of it goes through GitHub, with no direct uploads. In outline:

1. Edit the Markdown sources on a branch from current main; open a PR to main and merge.
2. Port each changed page to HTML on a `gh-pages` branch by hand, including new pages, the nav, `sitemap.xml`, `llms.txt`, and `style.css` if the nav changes.
3. Update `sources.json` on gh-pages with new content hashes for every source Markdown file, plus `builtFrom` and `generated`. The footer's "Built from main@<sha>" and "source hashes" link must match.
4. Review the rendered HTML in a browser at desktop and phone width, not only the diff.
5. Open a PR to gh-pages, merge, and let the normal deploy run.
6. Run `git fetch origin gh-pages`, then `npm run site-drift`; it must exit 0. It checks Markdown hashes only, so step 4 is the HTML check.
7. Verify the deployed site: spot-check the live pages, the legacy URLs and anchors, and the new demo and client matrix.

If the procedure in the cold-reader plan changes, that plan is the source of truth; update the reference here rather than copying changes.

## Release checklist

- [ ] Publishing steps completed and deployed site verified (see Publishing).
- [ ] Old URLs and fragment anchors still resolve.
- [ ] Demo statuses match implemented behavior; the changed-in-place limitation is stated beside it.
- [ ] Homepage says **what it is / why it matters / how to try it** above the detailed technical content.
- [ ] Shared memory **across agents for one user** is explicit.
- [ ] First example is comprehensible without JSON or hashes.
- [ ] Real-run technical evidence is preserved and linked.
- [ ] Homepage, documentation, and README list the same supported clients.
- [ ] A new user can verify capture and recall with step-by-step instructions.
- [ ] Deliberate design boundaries are distinguished from missing features.
- [ ] Evidence/provenance wording avoids unsupported assurances.
- [ ] Navigation, CTAs, code samples, and internal links are checked.
- [ ] Every touched page follows Voice and register: lowercase **rutter**, terms glossed on every use, no naked metrics, one reframe per page, anti-slop pass done.
- [ ] A fresh reader given only the homepage answers the three target-outcome questions.

## Non-goals

This plan does **not** require changing the underlying memory architecture, adding AI inference to the server, implementing team/shared-user memory, launching a hosted service, or introducing unsupported marketing claims. The primary work is presentation, organization, documentation consistency, and verification.
