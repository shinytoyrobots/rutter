# Memory-of-use: the mechanics in full

Search alone is something any capable agent can already do. Memory-of-use adds the first thing a
stateless assistant *can't* have: **memory that accrues by itself and surfaces later.** rutter
quietly records what each AI session decided or produced, lets you recall recent work, annotates
search results you have engaged with before, and measures whether you actually reach for any of it.

All of this is local-first. Nothing leaves your machine, the server runs no AI model (your client
is the brain), and it only ever writes inside your vault's `_librarian/` folder and the disposable
`data/` index. This page says *vault* for your notes folder. The `_librarian/` folder is rutter's own
layer next to your notes. Tool names, environment variables, and that folder keep rutter's earlier
name, *librarian*.

---

## Where rutter keeps what it remembers

Session memory lives in your vault, as plain, human-readable, git-committable markdown:

```text
<vault>/_librarian/sessions/2026-07-24.md
```

- **One file per day, one line per outcome.** Each separable thing a session decides or produces
  adds **one curated line** to that day's file. That line is a *directive* the client leaves (see
  [Capturing session summaries](#capturing-session-summaries)). It is not the raw transcript, and it
  is not one line per session. A working session usually leaves three or four. Over the first two
  weeks of real capture, one person's use, the average was 3.2 lines per session. Those lines are
  the session's **steps**, and `librarian-recent` groups them back into a single account of that
  session when you read it.
- **Typed frontmatter.** Each record carries a small typed header: the day, each session's identity
  and time, the curated summary, and the notes it touched, each by its **versioned identity**. That
  is the vault-relative path plus a content hash taken when the line was captured. The reference
  still records what the file contained then, even after the note changes later.
- **You can read and edit it.** It is your markdown, in your vault. Open it in Obsidian, edit it,
  commit it.
- **It is never auto-deleted.** Records are only ever appended to. rutter has no prune or delete
  path that destroys memory-of-use.
- **Capture is idempotent.** The Stop hook fires at the end of *every* assistant turn, so the same
  session's summary is offered for capture many times. An unchanged summary is a no-op: the file is
  left byte-identical, with no duplicate entry. A *changed* summary is appended as a **revision**
  after the earlier one. Nothing is ever overwritten or deleted.

### Which workspace an entry came from

Because a single day can span several efforts, each entry also records **where the session
happened**, automatically, with nothing for you to name or configure:

```yaml
- id: 20260726T101500123Z
  time: 2026-07-26T10:15:00.123Z
  summary: Shipped workspace provenance.
  refs: []
  workspace:
    cwd: /Users/you/Development/personal/rutter
    project: rutter
    repo: https://github.com/you/rutter.git
  client: claude
```

- **`cwd`** is the session's working directory, exactly as the host reported it on the Stop event.
- **`project`** is derived from that directory: the name of the enclosing git working tree, or the
  directory's own name when it is not in a repo. A session run from `rutter/src` is still project
  `rutter`. It is **never something you supply**, because being asked to name it would make
  capture non-ambient.
- **`repo`** is the `origin` URL, read straight out of `.git/config`. rutter never runs `git` (no
  subprocess) and never contacts the remote (no network). The URL is just a string it found in a
  file. Any token or password written into the URL (`https://<token>@host/…`) and any `?query` are
  removed before it is stored, so a credential in your git config is never copied into your notes.
- **`client`** is covered in the next section.

Everything about workspace is best-effort and never blocks a capture:

- No working directory in the payload means the whole `workspace` field is omitted and the entry is
  captured as usual. A hand-piped `npm run capture` payload has none unless you add an optional
  `cwd`. A real Stop event supplies it.
- Not inside a repository, or no `origin`, means `repo` is omitted. `cwd` and `project` still land.
- A `.git` redirect (a linked worktree or submodule) is followed only when its target is itself git
  metadata, meaning a path containing `.git`. Anything else is refused and `repo` is omitted, so the
  reader cannot be steered into arbitrary directories.

**Entries captured before this existed stay valid, untouched.** `workspace` is an optional field
added to the same record schema (`session-record@1`). There is no migration and no rewrite of old
records. A day file can hold a mix of old and new entries.

**Duplicate detection ignores it.** Duplicate detection compares the directive text only. A Stop
firing whose directory changed (a rename, a subdirectory, or none at all) is still an unchanged
directive and still a byte-identical no-op. Moving a project does not fork your history.

### Which client wrote it

`client` is another optional field: `claude`, `grok`, `codex`, or `agy`. It names the host, never
the model, and it is metadata only. The summary and stance stay byte-verbatim.

The hook compares two things: the raw Stop event payload the host sends (Antigravity's shape,
Grok's camelCase `lastAssistantMessage`) and the identity the installer passes as `--client`. It
writes a label only when the two agree.

No label is written for conflicts, direct payloads, or an unrecognized identity. Codex without an
identity gets none either, because nothing in its payload separates it from Claude. Entries from a
hook registered by hand before this field existed show no label. Re-run `install-hook` to add it.
A stored value this build does not know is kept and ignored, never an error. The label shows in the
record's frontmatter, not the body.

---

## Capturing session summaries

Capture is **ambient**: it happens after each turn with no action from you inside the session. It
is wired through a **Stop hook**, a hook the host runs when the assistant finishes a turn, in
Claude Code, Grok, Codex, and Antigravity.

**Setup is the hook.** Register it with `npm run install-hook`, adding `--client codex` or
`--client antigravity` for those hosts. [Getting started, Step 6](./getting-started.md#step-6--install-the-stop-hook)
has the per-host commands and checks. Two facts change behavior:

- Codex will not run the hook until you review and trust it with `/hooks`. Installing does not
  grant trust, and an untrusted hook never runs.
- Antigravity needs a rule file as well as the hook (see *Host differences*).

The installer merges into existing hook configuration and never touches your other hooks. It
refuses to run against an unbuilt repo. The registered script always exits cleanly, so a capture
failure can never break your session.

### Host differences

All four hosts fire the same hook after each turn and store the same records, in the same notes
folder. That shared folder is how a decision captured in one tool is recalled in another. Each
record carries a `client` label naming the host that wrote it (see [Which client wrote
it](#which-client-wrote-it)). The hosts differ in where the hook looks for the directive:

- **Claude Code** reads the whole transcript, so a directive anywhere in the session is found.
- **Grok** reads the Stop event's final assistant message. Grok clips that message at 32,768
  characters, so a long turn can drop a trailing directive.
- **Codex** reads the Stop event's final assistant message and nothing earlier. A directive left in
  mid-turn commentary is not captured, so the client must put it in the final reply. Codex hooks
  also see only the environment Codex was launched with, so `LIBRARIAN_VAULT_PATH` must be exported
  where Codex starts (see [Getting started, Step 2](./getting-started.md#make-the-path-stick)).
- **Antigravity** (`agy`) sends a Stop event with no reply text. The hook reads the transcript file
  the event points to and takes the assistant messages from the current turn, which is everything
  after your last message. A directive anywhere in the turn is found, and an earlier turn's
  directive is never read again. A turn that ended in an error captures nothing.
- **Antigravity needs a rule file.** `agy` does not put MCP server instructions in the prompt. It
  saves them as a file the model may never read. So the installer also writes an always-on rule
  file, `~/.gemini/config/rules/rutter-capture.md`, built from the server's own contract text.
  Without that rule the model did not leave summaries on its own. The installer decides the vault
  once. It bakes the vault in as the hook's default and prints the same value in the `agy mcp add`
  line, so writes and reads cannot disagree. An exported `LIBRARIAN_VAULT_PATH` still overrides the
  hook's default, and each capture logs the vault it wrote to.

### The directive

**How the summary is produced (no AI in the server).** The server never summarizes anything, which
would be inference. Instead your client writes the one-line summary *during* the session as a
directive, and the hook lifts it out verbatim, from the transcript or from the final reply
depending on the host. Emit a directive like this whenever a session is worth remembering:

```text
<!-- librarian-session {"summary":"Decided to store refs by content-hash; shipped capture.","refs":["Notes/foo.md"]} -->
```

- `summary` is the one curated line. Required.
- `refs` is an optional list of vault-relative paths of notes the session touched.
- Each hook firing keeps only the last directive in the text it reads. So emit each line as its
  outcome lands, and each outcome gets its own firing. Each firing also keeps at most one position
  (see [Positions](#positions-capturing-a-stance)), the last in the text it reads.
- If the hook finds no directive, or the summary is empty, nothing is captured and no empty file is
  created.
- A summary still wrapped in `<angle brackets>` is treated as an **unfilled template** and captured
  as nothing. Pasting the syntax without filling it in is safe, rather than storing
  `<one plain-English line>` in your record.

### The style contract

A summary is written by a session that is deep in its own context, and read weeks later by someone
who has none of it. Left alone, that produces build-log lines full of codenames and version tags
that were obvious at the time and are opaque now. So the summary carries a **style contract**:

> Write the line for **a smart reader in a hurry who was not in this session**: lead with **what
> was decided or produced**, use **common words** rather than session shorthand, and **expand or
> avoid** codenames, version tags and abbreviations the session invented (terms your vault itself
> uses are fine). **Aim for about 40 words and stop by 60** — one line, not a build log.

The word budget only works because the trigger agrees with it. The contract asks for a line as each
separable thing lands. A client told to write one line at the end packs the whole session into it,
which is exactly the over-stuffed entry the budget exists to prevent.

**The server does not enforce the style contract.** It stores the summary byte-verbatim. It never
rewrites, shortens, "clarifies", or rejects a line for being dense, and it writes no style warning
into your record. The capture path prints the word count so drift is visible, then stores exactly
what it was given. Judging or rewriting prose is inference, and the server runs no model. Silently
truncating would lose the only copy of what the session meant. A dense summary is a readability
problem, handled by guidance and by how it is read back, never a data problem solved by editing
your memory.

Compare:

```text
✗  Landed HK-7/ambient-splice v0.9.3-rc2 behind FLG_SPLICE_V2; idx@4 -> idx@5,
   backfill gated on FKS_DUAL_READ, ZQ-1197 still open, cutover ETA W31.
✓  Shipped the ambient capture path behind a feature flag, and started the
   session-index upgrade — the data backfill is still switched off.
```

### Where the contract lives

In one place: the server's MCP instructions (`SERVER_INSTRUCTIONS` in `src/server.ts`). The server
sends them to every client on connect. The README quotes them verbatim, and a test fails if that
copy drifts. They have to fit in 2,048 characters, because Claude Code silently cuts a server's
instructions there, and a test holds the line. Guidance that only matters when *reporting* a result
lives in the description of the tool that returns it.

There is nothing to add to your `CLAUDE.md`. The README keeps a paste-in only as a fallback if
captures refuse to land. Antigravity is the exception to "on connect": see *Host differences* for its rule file.

---

## Recalling recent work

Ask *"what was I working on lately?"* and your client calls the **`librarian-recent`** tool. It
returns recent session summaries **most-recent-first**, each with its date, its project, and the
versioned provenance of the notes it references:

```text
2026-07-26 10:15:00 [rutter] — Shipped workspace provenance.
   refs: Notes/foo.md@sha256:…
2026-07-25 21:40:00 [novel] — Drafted chapter three.
2026-07-24 09:12:00 — An entry captured before provenance existed.
```

- **Project** is shown in brackets when the entry recorded one. An entry without provenance shows
  nothing there. There is no "unknown project" placeholder, because that would be noise about the
  record rather than information about the work.
- **Project filter:** *"what have I been doing on the novel?"* becomes `project: "novel"`. Matching
  is on the recorded project name and is **case-insensitive**, so `Novel` works too. It matches
  the whole name, not part of it. Entries with no provenance are **excluded** from a filtered
  answer. rutter will not match your filter against a summary's wording or a note path to
  manufacture a result it cannot actually vouch for.
- **Window** limits to a recent span. *"what did I do last week?"* becomes `window: 7`, the last
  7 days.
- **Count** caps the number of sessions, for example `count: 3` for the three most recent.
- **Empty state:** with no records yet, it returns a plain *"No recent sessions recorded yet."*
  message, never an error. A filter that matches nothing says so specifically.

Filters only ever *remove* entries: the order you get is the same order you would have got
unfiltered.

### Old, dense entries still read clearly

Records written before the style contract existed are exactly as dense as the day they were
captured. They are **never migrated, edited, or re-summarized**. Memory-of-use is append-only, and
rewriting your own past record to look tidier would be a worse bug than the density.

Instead the server's tool descriptions ask your **client** to *report* recalled summaries in plain
language for whoever is asking, and that applies to every record, not just new ones. So when you
ask "what was I working on?", your client may answer in cleaner words than the stored line uses.
That is the intended behavior: what is on disk is the record, and what you are told is the answer.
If you want the exact stored text, open the day file in Obsidian, or run `npm run recent`, which
prints the raw stored line.

From the terminal:

```bash
npm run recent                        # everything, most-recent-first
npm run recent -- 3                   # the 3 most recent
npm run recent -- --days 7            # just the last week
npm run recent -- --project rutter    # just one project
```

### How your client knows to ask

You do not have to tell your client when to use rutter. The server's MCP instructions route
recency questions to `librarian-recent`, prior-engagement and content questions to
`librarian-search` (then `librarian-get-note` to read a note in full), and position questions to
`librarian-positions`. They also tell the client how to write session and position lines.

The reading-back half travels in the tool descriptions. `librarian-recent` asks the client to
report recalled summaries in plain language (see *Old, dense entries still read clearly*), and
`librarian-positions` asks it to attribute a stance to you rather than adopt it. Neither is
enforced by the server. Both reach every client that connects.

This matters because guidance in a project's `CLAUDE.md` only helps in that project. Instructions
that ship with the server travel to every client and every directory it is connected from: one
install, not one per repo. Writing the summary is still your client's job, because writing is
inference. The instructions for doing it ship with the server too.

The guidance says *when the tools are the right answer*. It does not tell your client to call them
unprompted. Memory stays quiet until it is relevant.

---

## Search enrichment

When you run **`librarian-search`** and a result is a note a past session referenced, that one
result carries a quiet **prior-engagement** note: *what you concluded and when*. For example:

```text
1. Orbital telemetry pipeline — reference · evergreen · 2026-05-02
   Notes/foo.md
   …matching snippet…
   ↩ prior engagement 2026-07-22: "Decided foo is the canonical source."
```

- **Silence is intentional.** Results you have never engaged carry **no** annotation. rutter is
  quiet when unprompted. The absence of a note is not a bug and is never "not seen before" noise.
- **It never changes your results.** Enrichment is *additive metadata only*. The set of results and
  their ranking are byte-identical to a plain search with no enrichment. A prior engagement never
  promotes, demotes, adds, or drops a result.

[Note identity](#note-identity) describes two more things this surface renders when a reference
cannot be resolved on its own: a candidate note for it, and a conflict between a confirmed binding
and a fresher automatic detection.

---

## Note identity

A reference records two things about a note at the moment it was captured: its vault-relative path
and a content hash. Rename the note later and the path stops resolving, but the hash is still
there, so rutter can tell *what* the reference meant even after *where* it lives has moved.

At every `npm run reindex`, rutter checks each recorded reference whose path no longer resolves.
*Resolves* means a file exists on disk at that path, inside the vault, of any type. A reference can
legitimately point at a non-note file (a `.gitignore`, an exported `.html`, a `.yaml` config,
anything under `_librarian/` itself), because capture hashes whatever bytes are there. Such a
reference is live for as long as the file exists. The identity pass never treats "not an indexed
markdown note" as dead. Only a path that is actually *missing*, deleted or moved with no trace at
the old location, is checked further:

- **Exactly one current note's content hash matches what was recorded.** The note was renamed with
  its content untouched. rutter binds the old path to the new one, deterministically, and appends
  the binding to a ledger (`_librarian/note-identity.md`). No heuristics, no similarity score, no
  model. A hash either matches or it does not.
- **Zero matches, or more than one.** rutter does not guess. Zero means the note was renamed *and*
  edited, so no current note's hash matches. More than one means duplicate content exists, and
  picking one would invent an answer the vault does not give. Either way the reference renders
  explicitly as **unresolved**, with every candidate it found. It is never silently dropped and
  never silently bound to a guess.

`librarian-recent` and search enrichment resolve bound references through the ledger at read time.
The session record you see still says what you wrote. The ref line shows the note's current path,
or `[UNRESOLVED -- candidates: ...]` when rutter genuinely does not know. Nothing on this path ever
rewrites the stored session entry. Resolution happens only when it is displayed.

The two surfaces render the unresolved case differently, because they have different things to
attach it to:

- **`librarian-recent`** shows the dead reference itself, so it renders the ref line the same way
  either way: `Notes/old.md@sha256:... [UNRESOLVED -- candidates: Notes/dup1.md, Notes/dup2.md]`.
- **Search enrichment** has no "dead reference" object to annotate. It only annotates a search
  *result*, which is a live, currently indexed note. So when one of an unresolved reference's
  candidates is also a search result, *that* result carries a separate `unresolvedReference`
  annotation. The annotation names the dead reference and every candidate. It is distinct from the
  ordinary prior-engagement note and is never rendered as one. Being a *candidate* for an old
  reference is a different claim from being a note a session actually engaged, so the two are never
  conflated. A result is never given a prior-engagement note on the strength of candidacy alone.
  If none of an unresolved reference's candidates are among a search's results, nothing about that
  search changes. A reference with **no candidates at all** has nothing enrichment could attach it
  to, so it appears on `librarian-recent` only. That listing is the complete discovery surface for
  unresolved references. Search enrichment is an extra that appears only when a candidate is
  already in the results, not a second complete listing.

If a reference stays unresolved, resolve it by hand:

```bash
npm run identity-confirm -- Notes/old-name.md Notes/new-name.md
```

This is a **local terminal command only**. It is never exposed as an MCP tool, so a connected
client can never rewrite what a dead reference means on its own. It checks that the target you
name exists in the vault right now. It checks existence, not a hash match, because the point is to
resolve cases where the hash no longer matches. It then appends a `detected: confirmed` entry to
the same ledger.

**A confirmed binding is sticky.** Once you confirm a binding, no later automatic detection moves
or overrides it, whether that detection is ambiguous or a clean single match pointing somewhere
else. Suppose you confirmed `Notes/old.md` to `Notes/keep.md`, and later a stray file lands with
exactly the bytes last recorded for `old.md`. Reindex appends nothing new for that reference. Both
read surfaces show the disagreement next to the confirmed target: `confirmed Notes/keep.md; the
hash now matches Notes/stray.md`. Only running `npm run identity-confirm` again changes a confirmed
binding.

The ledger is append-only, like everything else here. A note renamed more than once gets a fresh
binding each time. Each binding is computed directly against what was originally recorded, never by
chaining through an earlier binding, and the newest *automatic* entry wins at read time. Confirmed
entries are the exception, as described above. Earlier entries are never rewritten, reordered, or
removed. The identity tables in the SQLite index are, like the rest of the index, fully
disposable: delete `data/librarian.db` and reindex, and they rebuild from the vault and the ledger
alone.

---

## Positions: capturing a stance

Alongside the session summary, your client can leave a second kind of line: a **position
directive**. It emits one only when a session forms, changes, reaffirms, or retires a stance on a
topic, which should happen in far fewer sessions than not. For scale, session summaries ran at
about 19 lines a day in the author's own use when this was written.

```text
<!-- librarian-position POSITION assert my-topic: I think X because of the meeting notes. -->
```

- `assert | revise | reaffirm | retire` is the directive's kind. Kind is the only thing that routes
  it. There is no content inspection.
- `<topic-key>` is free-form and client-chosen, kebab-case by convention but never enforced. An
  off-convention key is reported on stderr and stored as written.
- `<stance>` is the rest of the line, stored byte-verbatim. A `[[wikilink]]` anywhere in the stance
  is captured as a versioned reference exactly like a session ref. The text `revises: <event-id>`
  anywhere in the stance records that this event replaces that earlier one. Neither is stripped out
  of the stored stance. What you wrote is what is stored, in full.
- Position events are appended to a **wholly separate stream**,
  `<vault>/_librarian/positions/<YYYY-MM>.md`, never to a session record. Emitting one position, or
  many, changes nothing about how session summaries are captured, stored, or read. The reverse
  holds too.
- The idempotence rule is the same as for a session summary: an unchanged directive re-fired by the
  same session appends nothing.

Recall is a separate path with its own guarantees. See the next section.

---

## Positions: recalling a stance

`librarian-positions` answers *"what do I think about X, and how did that change?"* from the stream
that position capture writes. It is read-only. It reads a **derived table** in the index, rebuilt
from the position files at each reindex, never the files themselves.

**Ask one of three ways.** They are three different questions, so pass exactly one argument at a
time:

- `topic` is an exact topic key. A topic key is unique, so this returns **one** topic or an
  explicit not-found (`Position not found: <key>`), never a list. The miss is an ordinary answer,
  worded like `librarian-get-note`'s own.
- `query` is free text matched against your recorded stances, all terms required, as
  `librarian-search` does for notes. It returns a list.
- `note` is a vault-relative note path. It returns the positions whose references include that
  note, in **any** recorded version of it. It returns a list.

Free-text and note matching scan a topic's **entire history**, not just its current stance. A topic
surfaces if any event in its chain matches, however long since superseded. What comes back is still
the *current* stance, so what you searched and what you get are separate knobs. Add `chain: true`
for the topic's full history: every event that replaced or reaffirmed an earlier one, oldest first.

**Every answer says whose it is and when.** A recalled stance always carries the date it was
**formed** (its original `assert`) and, where there is one, the date it was last **revised**. A
`reaffirm` re-endorses a stance without changing it, so it never moves the revision date. It shows
up in the chain instead. The `librarian-positions` tool description tells any connected client to
report all of this as *your* recorded position, rather than restating it as its own present-tense
conclusion.

**A retired position is a stub, not a deletion.** Where the most recent event for a topic is a
`retire`, the answer is that retire event's own text, typically the reason you withdrew the stance,
with `retired <date>` stated as a retirement, never as a revision. Nothing is removed from the
history to produce it. Every earlier event is still there under `chain: true`. A position asserted
*again* after a retirement is simply live again. A retirement is terminal only while it is the last
thing recorded.

**Dormant is computed, never stored.** A live position that nothing has touched for a long while is
marked dormant. That is worked out on every read from the events' own timestamps. Nothing about
dormancy is written to disk or to the index, so the rule can change without a migration or a
rebuild. A retired position is never marked dormant. Withdrawing a stance on purpose is not the
same fact as letting one go quiet.

**Reindex is the only trigger.** The three index tables that hold positions (`position_events`,
`position_refs`, `positions`) are rebuilt wholesale from `_librarian/positions/*.md` at every
reindex, the same way as the identity tables in [Note identity](#note-identity). A reindex runs
when you call `npm run reindex`, or when the server starts and finds something changed. The tables
are never patched incrementally. Two consequences, both deliberate:

- A position captured since your last reindex is **not** recalled until the next one runs. That
  happens by itself the next time the server starts. It is a disclosed lag, not a silent gap.
- Because recall never touches the capture path, capture cannot be disturbed by it. Session
  records, their bytes, and the position write path are unchanged by a reindex rebuilding those
  tables or by any query you make.

Calling `librarian-positions` is logged to `_librarian/stateful-use.jsonl` under its own kind, and
does **not** count toward the usage gate (see [Measuring whether it gets
used](#measuring-whether-it-gets-used)).

---

## What rutter can and cannot establish

A reference is evidence of what a session recorded. It is not proof of what the session read. This
section puts the boundary in one place.

**What rutter can establish:**

- **Which paths the client listed** in its directive.
- **The sha256 of each listed file's bytes when capture ran.** The server computes it. A client
  cannot supply one.
- **The summary or stance the client wrote,** byte-verbatim.
- **When and where the line was captured.** That means the time, and the working directory,
  project, and repo origin when the host reports them. Each record also names the client that wrote
  it, when that can be established.

**What it cannot establish:**

- **That the model read a listed file.** The client picks the paths. The hash shows that the file
  had those bytes when capture ran.
- **That the listed files produced the conclusion.**
- **That capture is complete.** A line exists only if the client wrote a directive and the hook
  found it (see the list below).
- **That a file did not change between the session reading it and capture.** The hash is taken when
  the hook runs, after the turn. If the session edited a note, the hash is of the edited file.
- **Whether a note at an unchanged path has changed since.** The hash is stored, so you can
  compare. rutter does not report it yet.

**What capture depends on.** Each item is stated earlier on this page. They are collected here:

- The hook only lifts a line the model wrote. A client that skips the directive leaves nothing to
  capture. An empty summary, or one still wrapped in `<angle brackets>`, captures nothing.
- Each firing keeps one session summary and one position: the last of each in the text the hook
  reads.
- Codex reads the final reply only, so a directive in earlier commentary is lost.
- Grok clips its final message at 32,768 characters, so a long turn can drop a trailing directive.
- Antigravity captures nothing from a turn that ended in an error, and needs the rule file, or its
  model may not leave summaries.
- The style contract is advisory. The server stores a dense or over-long summary as written.

**Append-only is a rule rutter follows, not a tamper-proof log.** The server has no code path that
rewrites, reorders, or deletes a stored line. But the records are plain markdown in your notes
folder. Anyone with write access, including you in Obsidian, can edit them, and nothing detects it.
If you need a history of edits, commit the notes folder to git.

### Guarantees

- **Local-first:** no network calls, ever. Repository identity is resolved by reading
  `.git/config`. There is no `git` subprocess, and a remote URL is recorded as text, never fetched.
- **Notes are never touched:** rutter only writes under `_librarian/` and `data/`. It never
  creates, modifies, or deletes vault notes.
- **No hard-delete:** memory-of-use records are only appended. Old records are never re-summarized
  or tidied up to match a newer convention.
- **Rebuildable:** `data/librarian.db` is a disposable cache. Delete it and `npm run reindex`
  reconstructs everything from the vault plus `_librarian/`.
- **Hooks never break a session:** the capture hook always exits cleanly, so a failure inside
  capture cannot interrupt your work.
- **No AI in the server:** summaries are your client's. The server stores and serves them
  **verbatim**, including summaries that ignore the style contract entirely. Judging or improving
  prose would be inference, so the server does neither, at capture or at read time.

The spec states each of these as an invariant: [`spec/spec.md`](../spec/spec.md).

---

## Measuring whether it gets used

Memory-of-use is on trial. The project set a usage test it can fail: *does ambient memory-of-use
actually pull you toward reaching for it?* The target is reaching for a stateful behavior
unprompted at least three times a week, for two weeks. The first reading, in August 2026,
[passed](./gate-verdict-2026-08.md), and the gate keeps running. It reads one person's usage.

*Unprompted* names intent, not call origin. "What have I been working on?" answered via
`librarian-recent` is unprompted use even though the model executes the call. The assistant is the
delivery mechanism, and memory reached through conversation is still memory reached. What does not
count is a call made only because the server instructions tell clients to prefer these tools, with
no human question behind it.

Every time you invoke `librarian-recent`, or run a search that surfaces at least one
prior-engagement signal, rutter appends one timestamped event to a local, append-only log
(`_librarian/stateful-use.jsonl`). A single search counts as exactly one event no matter how many
signals it surfaced.

`librarian-positions` writes to the same log under its own kind, and is **excluded from the
count**. The gate measures whether session memory pulls you toward using it, and counting
position queries, a feature added later, would answer a different question. The calls are still logged, so
you can inspect them. They just do not move the gate figure.

Read the per-ISO-week count to evaluate the gate:

```bash
npm run gate                       # counts across all history
npm run gate 2026-07-13 2026-07-26 # counts within a date range
```

Output is one line per ISO week, marking weeks that met the target:

```text
stateful-use per ISO week (gate target: >=3):
  2026-W29: 2
  2026-W30: 4  ✓
```

> Deciding whether a call was *unprompted*, meaning a live human question rather than the standing
> server instructions alone, is left to manual review of the log. The log captures every invocation
> with a timestamp so that review is possible. The project is prepared to conclude that the
> stateful behavior does not get reached for.
