# Your notes are the store. This is the memory of using them.

*What rutter is, why it is built the way it is, and what that costs.*

**One memory across Claude Code, Grok, Codex, and Antigravity.** A decision made in one is there when you ask another.

## The missing layer

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

The project was called the librarian before it was called rutter. The tools (`librarian-search`
and its siblings), the environment variables (`LIBRARIAN_*`), and the `_librarian/` folder in your
notes kept the earlier name. They are all parts of rutter.

This document is about *why* it is built this way. If you want to run it, start with
[`getting-started.md`](./getting-started.md). If you want the mechanics of capture, recall and
identity in full, read [`memory-of-use.md`](./memory-of-use.md).

## An example

In August you ask Claude Code whether the ingest path should stay synchronous. You read two notes
and decide it should. The session leaves one line: *"Decided the ingest path stays synchronous;
async needs the queue design first."* The line cites `Notes/ingest-design.md`. rutter stores the
line without rewriting it, with a hash of that note's contents when the line was captured.

In October you reorganize your notes. `ingest-design.md` moves to `Architecture/ingest.md`, contents
untouched. At the next reindex, rutter sees that the old path is gone and finds exactly one note
with the same hash. It binds the old path to the new one and records that.

A week later you open Codex and ask why the ingest path stayed synchronous. Codex searches your
notes and finds `Architecture/ingest.md`, with a dated note attached: what you concluded in
August, and that you did. Codex can tell you what you decided, when, and from which note.

Had the note been renamed *and* edited, no hash would match. Asking for recent work would show the
reference marked unresolved, with every candidate rutter found, and you would decide what it means.

One thing rutter does not do yet: tell you that a note at the *same* path has changed since August.
It holds the original hash, so the comparison is possible. Reporting it is not built. What rutter
can and cannot establish is spelled out [below](#what-rutter-can-and-cannot-establish).

## One memory across your tools

Most memory features live inside one tool. Switch tools and you start again.

rutter does not belong to a tool. It is a folder of markdown files plus an MCP (Model Context
Protocol) server. Any MCP client can read the memory. Any tool with a hook that runs after each turn
can write to it. Four have one today: Claude Code, Grok, Codex, and the Antigravity command-line
tool (`agy`).

A session summary captured in any of them is available to all of them straight away. Positions
appear after the next reindex. The memory belongs to the folder and to you. A tool you add later
reads the same records.

"Shared" means one person's tools sharing one memory. It does not mean shared between people. The
README's *Known limitations* says what is out of scope there. The README also has the setup for each
tool and a table of how each one captures.

## How it works

Two halves, and neither of them contains a model.

**Writing.** As a session finishes something worth recalling, your client emits one line about it —
a short summary, plus the paths it touched. A Stop hook lifts the newest such line: from the
transcript in Claude Code and Antigravity, from the final assistant message in Grok and Codex. It appends that line to a dated file inside your notes directory. Each path
is stored with the sha256 of that file's bytes. The server reads the file and computes that hash
itself, rather than accepting one from the client, so a client cannot hand it a hash for a file
that was not on disk. The client still chooses which paths to list. The hash says what the file
contained at capture, not that the session read it. Each entry also records the working directory
the session ran in, and the git remote when there is one. A day spread across three efforts still
reads cleanly.

One line per separable outcome, not one per session. A working session usually leaves three or
four. Because your client writes while its context is still loaded, capture needs no second model
call and no network call. The line is extra text in the turn the client was already writing.

That line carries a style contract. Lead with what was decided. Prefer common words to the
session's own shorthand. Aim for about 40 words and stop by 60. The contract is advisory. The
server does not rewrite a line for style, because judging prose is inference and there is no model
in there to do it. It does normalize each line to sit in the record as one line, and it cuts a line
past 2,000 characters. The [mechanics page](./memory-of-use.md#the-style-contract) has the detail.

**Reading.** The server exposes four read-only tools over MCP (Model Context Protocol), the
standard way an AI client connects to an outside source of data:

- `librarian-search` — ranked full-text search over the notes, each result carrying its path,
  frontmatter provenance and a matching snippet. A result a past session engaged also carries a
  quiet prior-engagement note. The annotation is additive only. It never re-ranks anything.
- `librarian-get-note` — one note's full content, by path.
- `librarian-recent` — *"what was I working on lately?"* Sessions newest-first, with dates, project
  and references. Filterable by project, day window, or count.
- `librarian-positions` — *"what do I think about X, and did that change?"* One topic by its exact
  key, or a list found by free text over recorded stances, or by a note the positions reference.
  Each answer carries the date the stance was formed and the date it was last revised, so a client
  reports it as your recorded position and not as its own conclusion. Answered from the last
  reindex, so a position captured since then appears after the next one — which the server runs
  itself the next time it starts.

The Stop hook runs in Claude Code, Grok, Codex, and Antigravity. The tools work with any MCP client. The
server also sends its own usage guidance to every client that connects. Antigravity saves that
guidance as a file instead of putting it in the prompt, so its installer also writes a rule file.
There is nothing to configure per project.

Records live in `<notes>/_librarian/`, inside your own notes directory. They are plain markdown,
sitting beside the notes they describe — greppable in a terminal, committable to the same git
history. They are never written into the code repo. The SQLite FTS5 index is a disposable cache:
delete it, reindex, and it rebuilds from the notes and those records alone. The notes are the source
of truth; the index is a convenience.

Everything the current spec describes has shipped. That is full-text search, ambient capture and
the style contract, plus workspace provenance, prior-engagement annotations on search results,
references that survive renames, instrumentation on its own use, position capture and recall, and
a label on each record naming the host client that wrote it. The one stub is embeddings and
semantic search.

The client does the thinking. The server only keeps.

## Why it is different

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

A summary plus the hash of the files it cited is a record, because you can check it.

That sentence is the design. Everything that follows is what it costs.

## The bets, and what each one costs

### Append-only, and not rewritten

A stored line is never rewritten. New lines are appended, and grouping happens when you read them
back. A line is not rewritten for style on the way in either; only a one-line normalization and a
2,000-character cut apply ([detail](./memory-of-use.md#the-style-contract)). Where a consolidating memory folder converges on one current
answer, this keeps every answer you gave, in order, with the wrong ones intact.

The cost is real, and already visible. The record only grows. Entries written before the style
contract existed are exactly as dense as the day they were captured. Nothing retrofits them.
Rewriting your own past record to look tidier would be a worse failure than the density. Some early
entries read like build logs. The only layer that reaches them is guidance at read time: your client
is asked to report old, dense summaries in plain language when it recalls them. What is on disk
stays the record; what you are told is the answer.

Append-only is a rule rutter follows. It is not a tamper-proof log, and the records are plain files
you can edit.

### References that carry a hash

Every reference is a path plus the content hash of what was there when the line was captured. Weeks
later you can ask what you concluded, and ask whether the files that conclusion rested on have
moved. A renamed note is followed by exact hash match. A note rutter cannot place is shown as
unresolved, with its candidates. The stored hash also gives you something to compare a file against
later. The report that a note at the same path has changed is not built yet.

Almost nothing else pairs those two. Architecture decision records capture the what and the why
without pinning the version they applied to. Event-sourced logs timestamp events but rarely carry
file-level provenance. Supply-chain provenance formats hash content properly, but they are built
for auditors rather than for your next working session. One near neighbor, Kage, does carry
provenance of this kind — and then treats stale memories differently, which is the next bet.

The cost: a hash is a statement about bytes, not about meaning. Reformat a note, fix a typo, and the
hash says it changed. The signal is honest but blunt, and deliberately so. A fuzzier comparison
would need a model, and a model in the server is the thing this design refuses.

### Show what you can't place, and don't withhold the answer

This is a crowded space, and the nearest neighbors each take half of this position. Recall does
append-only session capture, without hashing what a memory rested on. Kage checks its memories
against the live code, and withholds the ones that have gone stale. Withholding is a defensible
choice. rutter makes a different one. A reference it cannot place is still shown, marked
unresolved, with every candidate it found. You are better placed than the tool to decide what a
missing or changed note means for what you concluded.

Changed content is the part not built. If a note stays at the same path and its bytes change,
rutter does not flag it today. The design is the same rule applied there: show the change, name
it, and let you decide. It waits on observed use, like the rest of the unbuilt design at the end of
this page.

So the claim is only the combination: append-only lines not rewritten for style, references carrying content
hashes, and references the tool cannot place shown to you instead of silently resolved or dropped.
Each of those exists elsewhere. The square where all three meet appears to be unoccupied, and it is
the only claim made here.

### A dead reference is a person's call

Rename a referenced note without touching its content, and the next reindex rebinds the old
reference to its new path. No heuristics, no similarity scoring, just an exact content-hash match.
Both read surfaces then resolve through that binding quietly.

When rutter cannot tell, it says so. Two cases defeat the match. The note was renamed *and* edited,
so no current note's hash matches; or several notes share the same hash. Either way the reference
renders explicitly as unresolved, with every candidate it found. It never picks one. Confirming a
binding is a local terminal command (`npm run identity-confirm`), never an MCP tool. That is a firm
line: a model must not be able to decide what a dead reference means. A confirmed binding is
sticky afterwards. Suppose the vault later changes so that automatic matching would point somewhere
else. The disagreement is rendered and left for you: *confirmed X; the hash now matches Y*.

The cost is friction. Some references sit unresolved until you get round to them, and only you can
clear them. That is the intended price of not letting a model quietly rewrite your provenance.

## What rutter can and cannot establish

A reference is evidence of what a session recorded. It is not proof of what the session read.

**It can establish:**

- which paths the client listed;
- the hash of each file's contents when capture ran, computed by the server;
- the conclusion the client wrote, not rewritten for style;
- when and where the line was captured, and which client wrote it when that can be established.

**It cannot establish:**

- that the model read any listed file, because the client chooses the paths;
- that those files produced the conclusion;
- that capture is complete, because a line exists only when the client wrote one and the hook found it;
- that a file did not change between the session reading it and capture, because the hash is taken after the turn;
- whether a note at an unchanged path has changed since. That report is not built.

Append-only is an application rule, not tamper-proof auditing. Anyone with write access to your
notes folder can edit the records, and nothing detects it. The full list of capture dependencies is
in [`memory-of-use.md`](./memory-of-use.md#what-rutter-can-and-cannot-establish).

## What it deliberately is not

**Not a retrieval play.** A capable agent reading a well-organized notes directory already retrieves
well, so a better search box would lose. Search here is plain plumbing: SQLite FTS5 keyword
matching, AND-ed across terms, so "blue man group" finds notes containing all three words rather
than any one. Semantic search is a stub — `embeddings.ts` is a port with no implementation. None of
that is why the project exists. It exists for the part an ephemeral session cannot have, which is
memory across time.

**Not multi-user — though the store can be.** Memory-of-use is personal. The store need not be.
Several readers can point their own rutter at the same knowledge vault, each keeping their own
record of using it, and the same question gets a different answer for each, because the difference
was never in the notes. Same store, two readers, two different memories — made literal. What stays
single-user is the memory itself. Entries carry no user identity, so the overlay only works while
it stays with its owner and is not synced into the shared store. Sharing records — authority,
privacy surface, whose version of a decision wins — is out of scope. One shared store, N personal
overlays. The overlay is the intended unit, not a stepping stone toward something bigger.

**Not a supported product.** This is one person's tool, published as a dated reference
implementation. No roadmap promises, no support commitment, no guarantee the next commit leaves
something you depend on where it was. The useful thing to take is the mechanism. Fork it.

**And it is still on trial.** The stateful behavior sits behind a usage gate. An append-only local
log counts how often that behavior actually gets reached for, and the project is prepared to
conclude that it isn't. So far the log reads one person's usage. The first reading, in August 2026,
[came back a pass](./gate-verdict-2026-08.md), and the gate keeps running. The larger design for
tracking how your beliefs change over time is part-built: position capture and recall shipped in
August 2026, after logged friction asked for them. The rest of that design is not built — drift
visibility, which would tell you the notes a position rests on have changed since it was formed,
and an optional backfill of positions from records that predate capture. Both wait on observed use.

## Try it

If you use Claude Code, install the plugin and you can be recalling in a few minutes: see the
[fast path](./getting-started.md#fast-path-for-claude-code). Everyone else:
[`getting-started.md`](./getting-started.md) takes you from clone to first recall in eight verified
steps.

## Further reading

- [`getting-started.md`](./getting-started.md) — clone to first recall, in eight verified steps.
- [`memory-of-use.md`](./memory-of-use.md) — capture, recall, enrichment, note identity, positions,
  the trust boundary, and the usage gate, in full mechanical detail.
- [`roadmap.md`](./roadmap.md) — current sequencing, and what is deliberately not being built.
- [`../spec/spec.md`](../spec/spec.md) — the executable spec: Given-When-Then scenarios, the
  requirements derived from them, the tests that grade each one, and what every amendment rejected.
  This document is the argument; that file is the receipts.
- [`../README.md`](../README.md) — what it does today, setup, and the limitations stated up front.
- [Recall](https://github.com/raiyanyahya/recall) — the nearest neighbor on append-only session
  capture. If that half of the position is the part you want, start there.
- [Kage](https://github.com/kage-core/Kage) — the nearest neighbor on content-hashed provenance.
  It withholds stale memories. rutter shows a reference it cannot place, and would show a changed
  one once that is built.
- ["You're lost, unless you have a rutter."](https://www.robin-cannon.com/p/youre-lost-unless-you-have-a-rutter)
  — the essay the name comes from: the Dutch East India Company's logbooks of routes actually
  sailed, and Clavell's warning that a rutter is only as good as the pilot who wrote it — which is
  why every reference here carries a hash.

---

A store records what is known. This records what you did about it.

That is the part nobody else can hold for you.
