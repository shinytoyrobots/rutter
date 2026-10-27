---
type: plan
status: proposed
created: 2026-10-26
updated: 2026-10-26
domain: writing
---

# Home page: keep the plain hook, then say what rutter guarantees

**Status:** plan only. Nothing is implemented. Page source is `docs/index.md`; the published
site is hand-authored HTML on `gh-pages`, so every change here needs a paired HTML port (see
"Publishing" in `docs/cold-reader-fixes-plan.md`).

## The argument

"One memory. Multiple agents." is the right front door. Comprehension in five seconds matters
more than differentiation on first contact, especially for a personal reference implementation
with no support commitment. If a reader can't say what rutter is after the headline, nothing
else on the page gets read.

The cost: the line is easy to grasp partly because many other projects use nearly the same one.
The reader's next thought is "I already have Basic Memory" or "isn't that Mem0?" The hook gets
them in; the next block has to show what rutter does that is worth staying for.

"Memory of use, not memory of knowledge" is the more accurate framing, but it needs a sentence
of explanation before it lands. The concrete version already on the page (a decision stored
with the notes it cited, and the rename demonstration) persuades better.

## Landscape (2026-10-26, from search snippets, not hands-on testing)

- **Local Markdown memory shared across agents:** Basic Memory, agentcairn, Global Agent Memory,
  agents-memory, cross-agent-memory, akephalos. At least five do this, so "shared Markdown memory
  across agents" is not a differentiator.
- **Provenance, hashes, append-only:** Mnemoir Provenance (citations with a content hash; its
  docs say provenance is not truth), Strata (append-only, hashes, superseding corrections, much
  heavier), typedmem (a library, supersedes decisions with an audit trail), memory-blackbox
  (tamper-evident ledger, security angle). Mem0 also exposes memory history; Basic Memory links
  notes through explicit relationships.
- **Standards and hosted:** Portable Memory, Open Memory Protocol, Mem0/OpenMemory,
  Supermemory, MemoryPlugin.

Not found in any of them: records tied to the user's *existing* notes rather than a separate
store, with content-hash resolution that follows a renamed note and shows an unplaceable
reference as unresolved instead of guessing, plus a written limits page. Mnemoir and Strata are
nearest on provenance, but both build their own store. None of this is verified, and adoption
is unknown, so it informs emphasis only. The page makes no comparative claim.

## Decisions

1. **Keep the hero and the H2.** "One memory. Multiple agents. Yours." and the "One memory.
   Multiple agents." heading stay. The research suggests de-emphasizing them; they stay because
   they say what rutter is, and the next block says why it is different.
2. **No comparative claims.** Replace "Why not built-in memory?" (`docs/index.md:22-38`) with a
   block that states rutter's guarantees directly. Vendor memory is the wrong rival for readers
   arriving through MCP or GitHub, and "most don't" is not supported by the evidence above.
3. **Lead with "your notes, not a separate store"** and the rename behavior, benefit first:
   a renamed note can still be found when exactly one note matches its fingerprint from
   capture; a missing or ambiguous match is shown as unresolved. The "listed
   is not read" qualification stays, after the benefit.
4. **Then order, then limits.** Append-only records second; a pointer to the existing "Honest
   fit and limits" section third. "It travels" drops to one sentence after the list.
5. **Keep "memory-of-use" off the front door.** It stays as the term on the How it works page.
   Reword the Docs list description that uses it (`docs/index.md:117`).
6. **Keep the motto as the block's opening line.** "The model isn't the memory. Your notes are."
   (decided 2026-10-19, `docs/cold-reader-fixes-plan.md`).

## Draft copy

Replaces `docs/index.md:22-38`. A starting point, not final.

> ### Your notes, not a separate store
>
> **The model isn't the memory. Your notes are.** rutter does not keep a second copy of what you
> know. Each record is a dated line in a `_librarian/` folder beside your notes, pointing at the
> notes the session cited.
>
> - **A renamed note can still be found.** Each reference stores a content hash (a fingerprint
>   of the note's contents) at capture. After a rescan, rutter can follow a moved or renamed note
>   when exactly one note matches that fingerprint. Missing or ambiguous matches stay visibly
>   unresolved, never guessed or dropped. A reference shows the session listed the note, not
>   that the model read it.
> - **A later decision doesn't erase an earlier one.** Records are dated and only appended, so
>   a changed mind sits beside the original decision.
> - **The limits are written down.** [Honest fit and limits](#honest-fit-and-limits) says what a
>   record can and cannot show.
>
> Any agent with a capture hook can record, and any MCP client can recall, so a decision made in
> one agent is there in the next.
>
> "Shared" means one person's agents sharing one memory. It does not mean shared between people.

Docs list line (`docs/index.md:117`):

> [How it works](./memory-of-use.md): how capture, recall, note identity, and positions work,
> in full detail.

## Open questions

- **Overlap with the sections below.** The new block now covers much of "A record, not a
  summary" and "Inspectable by design" (`docs/index.md:64-72`). Merge or trim those so the page
  doesn't say the same thing three times.
- **An FAQ entry on alternatives?** "How is this different from Basic Memory or Mem0?" would
  answer the reader's question directly, but only after hands-on checks of what each does. Not
  part of this change.

## Out of scope

- The How it works page (keeps "memory-of-use" and its definition as is).
- The masthead line and the hero tagline.
