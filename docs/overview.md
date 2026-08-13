# Your notes are the store. This is the memory of using them.

*What rutter is, why it is built the way it is, and what that costs.*

## What this explains

A folder of markdown notes is a store of knowledge. Hand the same folder to two people and they
do not come away with the same thing. Which notes each of them opened, what each concluded, which
question one of them finally stopped reopening — none of that is in the store. It never was.

rutter keeps that second thing.

It gives an AI session the memory of how **you** traversed and used a body of knowledge, rather
than the specifics of the knowledge itself. Same store, two readers, two different memories. The
store is objective and shareable. The memory of using it is neither.

Worth being exact about the scope, because the shape of the code invites a wrong guess: this is not
about coding sessions. A session might be research, drafting, planning, or just reading around a
problem. The directory underneath is a knowledge vault, not a codebase — Obsidian is what it was
built against, though nothing requires it. The inspiration is the Librarian in Neal Stephenson's
*Snow Crash*: a companion that remembers across time and thinks alongside you — the one thing a
stateless assistant cannot be. The name is from the age of sail: a rutter was the logbook of the
routes actually sailed, as against the map. The map tells you what is known. The rutter is what
you did about it.

This document is about *why* it is built this way. If you want to run it, start with
[`getting-started.md`](./getting-started.md). If you want the mechanics of capture, recall and
identity in full, read [`memory-of-use.md`](./memory-of-use.md).

## The problem with the memory you already have

Your harness almost certainly does a version of this already. Claude Code writes session recaps and
infers preferences into a memory folder, then consolidates them over time — merging duplicates,
dropping what looks stale. Other tools expire what goes unused, or keep it inside a vendor's
account, where it is portable exactly as far as the vendor is.

Merging is defensible. It keeps a memory folder small and readable, and much of what a session
produces genuinely is noise. But it is lossy in one particular way. Once two entries have been
merged, you can no longer ask what you actually thought in March — only what the merge decided you
think now. The sequence of positions you moved through is exactly what consolidation is built to
flatten.

The second problem is the one that matters more. A summary on its own is not a record. It is an
assertion. "Decided the ingest path stays synchronous" tells you what a session claimed. It tells
you nothing about whether the notes that argument rested on still say what they said. Files get
rewritten. Notes get renamed. The summary keeps its confident tone the whole time, and nothing
announces the gap.

A summary plus the versioned state of what it was based on is a record, because it can be checked.

That sentence is the design. Everything that follows is what it costs.

## How it works, conceptually

Two halves, and neither of them contains a model.

**Writing.** As a session finishes something worth recalling, your client emits one line about it —
a short summary, plus the paths it touched. In Claude Code, a Stop hook lifts the newest such line
out of the transcript. It appends that line to a dated file inside your notes directory. Each path
is stored with the sha256 of that file's bytes. The server reads the file and computes that hash
itself, rather than accepting one from the client, so a client cannot assert provenance it never
had. Each entry also records the working directory the session ran in, and the git remote when
there is one. A day spread across three efforts still reads cleanly.

One line per separable outcome, not one per session. A working session usually leaves three or
four. Because your client writes while its context is still loaded, capture costs no extra
inference and no network call.

That line carries a style contract. Lead with what was decided. Prefer common words to the
session's own shorthand. Aim for about 40 words and stop by 60. The contract is advisory. The
server stores whatever it is handed, byte-verbatim — it never rewrites, shortens, annotates, or
rejects a line. It cannot. Judging prose is inference, and there is no model in there to do it.

**Reading.** The server exposes four read-only tools over MCP (Model Context Protocol), the
standard way an AI client connects to an outside source of data:

- `librarian-search` — ranked full-text search over the notes, each result carrying its path,
  frontmatter provenance and a matching snippet. A result a past session engaged also carries a
  quiet prior-engagement note. The annotation is additive only. It never re-ranks anything.
- `librarian-get-note` — one note's full content, by path.
- `librarian-recent` — *"what was I working on lately?"* Sessions newest-first, with dates, project
  and references. Filterable by project, day window, or count.
- `librarian-positions` — *"what do I think about X, and did that change?"* One topic by its exact
  key, or a list found by free text over recorded stances or by a note the positions reference.
  Each answer carries the date the stance was formed and the date it was last revised, so a client
  reports it as your recorded position rather than as its own conclusion. Answered from the last
  reindex, so a position captured since then appears after the next one.

The Stop hook is Claude Code specific. The tools are not — they work with any MCP client. The
server also carries its own usage guidance to every client that connects. There is nothing to
configure per project.

Records live in `<notes>/_librarian/`, inside your own notes directory. They are plain markdown,
sitting beside the notes they describe — greppable in a terminal, committable to the same git
history. They are never written into the code repo. The SQLite FTS5 index is a disposable cache:
delete it, reindex, and it rebuilds from the notes and those records alone. The notes are the source
of truth; the index is a convenience.

As of spec v3.10.2, what exists is full-text search, ambient capture and the style contract. Added
to that: workspace provenance, prior-engagement annotations on search results, references that
survive renames, and instrumentation on its own use. Embeddings and semantic search are a stub.

The client does the thinking. The server only keeps.

## The bets, and what each one costs

### Append-only, and byte-verbatim

A stored line is never rewritten. New lines are appended, and grouping happens when you read them
back rather than on disk. What comes out is what went in. Where a consolidating memory folder
converges on one current answer, this keeps every answer you gave, in order, with the wrong ones
intact.

The cost is real, and already visible. The record only grows. Entries written before the style
contract existed are exactly as dense as the day they were captured. Nothing retrofits them.
Rewriting your own past record to look tidier would be a worse failure than the density. Some early
entries read like build logs. The only layer that reaches them is guidance at read time: your client
is asked to report old, dense summaries in plain language when it recalls them. What is on disk
stays the record; what you are told is the answer.

### References that carry a hash

Every reference is a path plus the content hash of what was there when it was read. Weeks later you
can ask what you concluded, and separately ask whether the files that conclusion rested on have
moved or changed since. Drift becomes visible instead of silent.

Almost nothing else pairs those two. Architecture decision records capture the what and the why
without pinning the version they applied to. Event-sourced logs timestamp events but rarely carry
file-level provenance. Supply-chain provenance formats hash content properly, but they are built
for auditors rather than for your next working session. One near neighbor, Kage, does carry
provenance of this kind — and then does the opposite thing with it, which is the next bet.

The cost: a hash is a statement about bytes, not about meaning. Reformat a note, fix a typo, and the
hash says it changed. The signal is honest but blunt, and deliberately so. A fuzzier comparison
would need a model, and a model in the server is the thing this design refuses.

### Show the drift, rather than withhold the answer

This is a crowded space, and the nearest neighbors each take half of this position. Recall does
append-only session capture, without hashing what a memory rested on. Kage checks its memories
against the live code, and withholds the ones that have gone stale. Refusal is a defensible choice.
It is not the choice here. A reference whose target has changed is still shown to you, with the
drift named. You are better placed than the tool to decide whether a changed note invalidates what
you concluded.

So the novelty claimed is only the combination: append-only verbatim lines, references carrying
content hashes, and drift shown rather than resolved. Each half of that exists elsewhere. The square
where all three meet is the part that appears to be unoccupied, and it is the only claim made here.

### A dead reference is a person's call

Rename a referenced note without touching its content, and the next reindex rebinds the old
reference to its new path. No heuristics, no similarity scoring, just an exact content-hash match.
Both read surfaces then resolve through that binding quietly.

When the librarian cannot tell, it says so. Two cases defeat the match. The note was renamed *and*
edited, so no current note's hash matches; or several notes share the same hash. Either way the
reference renders explicitly as unresolved, with every candidate it found. It never picks one.
Confirming a binding is a local terminal command (`npm run identity-confirm`), never an MCP tool.
That line is deliberate: a model must not be able to decide what a dead reference means. A confirmed
binding is sticky afterwards. Suppose the vault later changes so that automatic matching would point
somewhere else. The disagreement is rendered rather than settled: *confirmed X; the hash now matches
Y*. Shown, never auto-resolved.

The cost is friction. Some references sit unresolved until you get round to them, and only you can
clear them. That is the intended price of not letting a model quietly rewrite your provenance.

## What it deliberately is not

**Not a retrieval play.** A capable agent reading a well-organized notes directory already retrieves
well. Building a better search box loses. Search here is plain plumbing, and stays that way on
purpose: SQLite FTS5 keyword matching, AND-ed across terms, so "blue man group" finds notes
containing all three words rather than any one. Semantic search is a stub — `embeddings.ts` is a
port with no implementation. None of that is why the project exists. It exists for the part an
ephemeral session cannot be, which is memory across time.

**Not multi-user — though the store can be.** Memory-of-use is inherently personal. The store is
not, and that split is the point. In principle, several readers can point their own librarian at
the same knowledge vault, each keeping their own record of using it. Ask the same question and each
gets a different answer back, because the difference was never in the notes. Same store, two
readers, two different memories — made literal. That is the ideal shape of this design, not an edge
case of it. What stays single-user is the memory itself. Entries carry no user identity, so the
overlay only works while it stays with its owner rather than being synced into the shared store.
And *sharing* records — authority, privacy surface, whose version of a decision wins — is untouched,
as a scope decision rather than an apology. One shared store, N personal overlays. The overlay is
the architecturally correct unit, not a stepping stone toward something bigger.

**Not a supported product.** This is one person's tool, published as a dated reference
implementation. No roadmap promises, no support commitment, no guarantee the next commit leaves
something you depend on where it was. The useful thing to take is the mechanism. Fork it.

**And it is still on trial.** The stateful behavior sits behind a usage gate. An append-only local
log counts how often that behavior actually gets reached for, and the project is prepared to conclude
that it isn't. A larger design exists for tracking how your beliefs change over time, and for marking
conflicts openly. None of it is built. It only gets built if observed use asks for it, rather than a
plan.

## Further reading

- [`getting-started.md`](./getting-started.md) — clone to first recall, in eight verified steps.
- [`memory-of-use.md`](./memory-of-use.md) — capture, recall, enrichment, the gate and note identity
  in full mechanical detail.
- [`roadmap.md`](./roadmap.md) — current sequencing, and what is deliberately not being built.
- [`../spec/spec.md`](../spec/spec.md) — the executable spec: Given-When-Then scenarios, the
  requirements derived from them, the tests that grade each one, and what every amendment rejected.
  This document is the argument; that file is the receipts.
- [`../README.md`](../README.md) — what it does today, setup, and the limitations stated up front.
- [Recall](https://github.com/raiyanyahya/recall) — the nearest neighbor on append-only session
  capture. If that half of the position is the part you want, start there.
- [Kage](https://github.com/kage-core/Kage) — the nearest neighbor on content-hashed provenance,
  resolved the other way: it withholds stale memories where this shows the drift.
- ["You're lost, unless you have a rutter."](https://www.robin-cannon.com/p/youre-lost-unless-you-have-a-rutter)
  — the essay the name comes from: the Dutch East India Company's logbooks of routes actually
  sailed, and Clavell's warning that a rutter is only as good as the pilot who wrote it — which is
  why every reference here carries a hash.

---

A store records what is known. This records what you did about it.

That is the part nobody else can hold for you.
