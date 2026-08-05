# Memory-of-use (S1.5): capture, recall, enrichment, and the gate

S1 proved retrieval. S1.5 adds the first thing a stateless assistant *can't* have:
**memory that accrues by itself and surfaces later.** The librarian now quietly
records what each Claude Code session decided or produced, lets you recall recent
work, annotates search results you've engaged before, and measures whether you
actually reach for any of it.

All of this is local-first: nothing leaves your machine, the server runs no AI
model (your client is the brain), and it only ever writes inside your vault's
`_librarian/` overlay and the disposable `data/` index.

---

## 1. Where the librarian keeps what it remembers

Session memory lives in your vault, as plain, human-readable, git-committable
markdown:

```
<vault>/_librarian/sessions/2026-07-24.md
```

- **One file per day, one line per outcome.** Each separable thing a session decides
  or produces adds **one curated line** to that day's file — not the raw transcript,
  and not one line per session. A working session usually leaves three or four; the
  measured average over the first fortnight of real capture was 3.2. Those lines are
  its **steps**, and `librarian-recent` groups them back into a single account of that
  session when you read it.
- **Typed frontmatter.** Each record carries a small typed header (the day, each
  session's identity and time, the curated summary, and the notes it touched by
  versioned identity). The shape is deliberately mdbase-compatible so a future
  upgrade is a drop-in.
- **You can read and edit it.** It's your markdown, in your vault. Open it in
  Obsidian, edit it, commit it.
- **It is never auto-deleted.** Records are only ever appended to. The librarian
  has no prune or delete path that destroys memory-of-use. The Claude Code Stop
  hook fires at the end of *every* assistant turn, so the same session's summary
  is offered for capture many times — capture is **idempotent per directive**: an
  unchanged summary is a no-op (the file is left byte-identical, no duplicate
  entry), and a *changed* summary is appended as a **revision** after the earlier
  one. Nothing is ever overwritten or deleted.

A note reference is stored as a **versioned identity** — the vault-relative path
plus a content-hash captured as it was read — so the reference still tells you
*what you saw* even after the note changes later.

### Which workspace an entry came from

Because a single day can span several efforts, each entry also records **where the
session happened** — automatically, with nothing for you to name or configure:

```yaml
- id: 20260726T101500123Z
  time: 2026-07-26T10:15:00.123Z
  summary: Shipped workspace provenance.
  refs: []
  workspace:
    cwd: /Users/you/Development/personal/my-librarian
    project: my-librarian
    repo: https://github.com/you/my-librarian.git
```

- **`cwd`** — the session's working directory, exactly as Claude Code reported it
  on the Stop event.
- **`project`** — derived from that directory: the name of the enclosing git
  working tree, or the directory's own name when it isn't in a repo. A session run
  from `my-librarian/src` is still project `my-librarian`. It is **never something
  you supply** — being asked to name it would make capture non-ambient.
- **`repo`** — the `origin` URL, read straight out of `.git/config`. The librarian
  never runs `git` (no subprocess) and never contacts the remote (no network); the
  URL is just a string it found in a file.

Everything about this is best-effort and never blocks a capture:

- No working directory in the payload → the whole `workspace` field is omitted and
  the entry is captured as usual.
- Not inside a repository (or no `origin`) → `repo` is omitted; `cwd` and
  `project` still land.
- A `.git` redirect (linked worktree/submodule) is followed only when its target
  is itself git metadata (a path containing `.git`); anything else is refused and
  `repo` is omitted — the reader can't be steered into arbitrary directories.
- **Entries captured before this existed stay valid, untouched.** `workspace` is an
  *additive-optional* field on the same record schema (`session-record@1`) — there
  is no migration, no rewrite of old records, and a day file can hold a mix of old
  and new entries.
- **It never affects duplicate detection.** Identity is the *directive*, so a Stop
  firing whose directory changed (a rename, a subdirectory, or none at all) is
  still an unchanged directive and still a byte-identical no-op. Moving a project
  does not fork your history.

---

## 2. Ambient capture — setting it up

Capture is **ambient**: it happens at session end with no action from you inside
the session. It is wired through a Claude Code **Stop hook**.

**Setup is one step** — register the hook (`npm run install-hook`, or by hand; see
the README). There is nothing to add to your `CLAUDE.md`. From v3.4.0 the whole
capture contract lives in `SERVER_INSTRUCTIONS` in `src/server.ts` — the single
source, quoted rather than restated everywhere else — and reaches every client on
connect as MCP server instructions. Before v3.4.0 the emission trigger and the
directive syntax existed *only* in a hand-installed `~/.claude/CLAUDE.md` rule,
which meant ambient capture worked for exactly one person: whoever had installed
that rule.

**How the summary is produced (no AI in the server).** The librarian server never
summarizes anything — that would be inference, which it does not do. Instead your
client (Claude) writes the one-line summary *during* the session as a directive,
and the hook lifts it out of the transcript verbatim. Emit a directive like this
whenever a session is worth remembering:

```
<!-- librarian-session {"summary":"Decided to store refs by content-hash; shipped capture.","refs":["Notes/foo.md"]} -->
```

- `summary` — the one curated line. Required.
- `refs` — optional vault-relative paths of notes the session touched.
- The **last** directive in the session wins. If you emit none (or an empty
  summary), nothing is captured and no empty file is created.
- A summary still wrapped in `<angle brackets>` is treated as an **unfilled
  template** and captured as nothing — so pasting the syntax without filling it in
  is safe, rather than storing `<one plain-English line>` in your record.

### The style contract — how the summary should be written

A summary is authored by a session that is deep in its own context and read weeks
later by someone who has none of it. Left alone, that produces build-log lines
full of codenames and version tags that were obvious at the time and are opaque
now. So the summary carries a **style contract**:

> Write the line for **a smart reader in a hurry who was not in this session**:
> lead with **what was decided or produced**, use **common words** rather than
> session shorthand, and **expand or avoid** codenames, version tags and
> abbreviations the session invented (terms your vault itself uses are fine).
> **Aim for about 40 words and stop by 60** — one line, not a build log.

The word budget only works because the *trigger* agrees with it. Before v3.7.0 the
contract asked for a line per separable thing **and** told the client it got one
directive at the end of the session. Faced with both, a client waits and packs the
session into one line — which is what the 141-to-192-word entries of early August
were. The budget was fighting the trigger. Now the trigger asks for a line as each
thing lands, and the budget is a constraint on a line that was already meant to be
small.

The word budget is advisory, and deliberately so. An over-long summary is stored
byte-verbatim like any other — the capture path prints its word count so the drift
is visible when it happens, and then stores exactly what it was given. Nothing in
the server edits a summary to fit (SR-023/SR-034); the alternative, silently
truncating, would lose the one copy of what the session meant.

Compare:

```
✗  Landed HK-7/ambient-splice v0.9.3-rc2 behind FLG_SPLICE_V2; idx@4 -> idx@5,
   backfill gated on FKS_DUAL_READ, ZQ-1197 still open, cutover ETA W31.
✓  Shipped the ambient capture path behind a feature flag, and started the
   session-index upgrade — the data backfill is still switched off.
```

**Where the contract lives — one place: the server's MCP instructions**
(`SERVER_INSTRUCTIONS`), which every connected client receives on connect. That is
the single source (SR-027): the README quotes it verbatim and a test fails if the
copy drifts. Nothing goes in your `CLAUDE.md` — a paste-in exists only as the
README's documented fallback if captures refuse to land.

**What the server does about style: nothing at all.** It stores the summary
**byte-verbatim** — it never rewrites, shortens, "clarifies", or rejects a line
for being dense, and there is no style warning written into your record. That is
not an oversight, it is the invariant: judging or rewriting prose is inference,
and the server runs no model (INV-6). A dense summary is a *readability* problem
handled by guidance and by read-time rendering, never a *data* problem solved by
editing your memory.

**Install the hook.** Build first (`npm run build`), then:

```bash
npm run install-hook
```

The installer writes the Stop-hook entry into `~/.claude/settings.json` — merging
rather than replacing, never touching other hooks, and refusing to run against an
unbuilt repo. The registered script reads the Stop event on stdin, extracts the
directive, and appends one entry. It always exits cleanly, so a capture hiccup can
never break your session.

> **How the client knows.** Capture depends on the client emitting the directive,
> and the server's MCP instructions establish that on every connect — no standing
> rule in `CLAUDE.md`, no per-project setup (the pre-v3.4.0 `CLAUDE.md` mechanism is
> retired; the README keeps a paste-in only as a troubleshooting fallback). You can
> also capture directly for testing:
> `echo '{"summary":"...","refs":["Notes/x.md"],"cwd":"/path/to/project"}' | npm run capture`
> (`cwd` is optional; the real Stop event supplies it, and the hook passes it straight
> through).

---

## 3. Recall recent work — `librarian-recent`

Ask *"what was I working on lately?"* and Claude calls the **`librarian-recent`**
tool. It returns recent session summaries **most-recent-first**, each with its
date, its project, and the versioned provenance of the notes it references:

```
2026-07-26 10:15:00 [my-librarian] — Shipped workspace provenance.
   refs: Notes/foo.md@sha256:…
2026-07-25 21:40:00 [novel] — Drafted chapter three.
2026-07-24 09:12:00 — An entry captured before provenance existed.
```

- **Project:** shown in brackets when the entry recorded one. An entry without
  provenance shows nothing there — no "unknown project" placeholder, because that
  would be noise about the record rather than information about the work.
- **Project filter:** *"what have I been doing on the novel?"* → `project: "novel"`.
  Matching is on the recorded project name and is **case-insensitive**, so `Novel`
  works too. It matches the whole name, not part of it.
  Entries with no provenance are **excluded** from a filtered answer — the
  librarian will not match your filter against a summary's wording or a note path
  to manufacture a result it cannot actually vouch for.
- **Window:** limit to a recent span, e.g. *"what did I do last week?"* →
  `window: 7` (the last 7 days).
- **Count:** cap the number of sessions, e.g. `count: 3` for the three most
  recent.
- **Empty state:** with no records yet, it returns a plain
  *"No recent sessions recorded yet."* message — never an error. A filter that
  matches nothing says so specifically.

Filters only ever *remove* entries: the order you get is the same order you would
have got unfiltered.

### Old, dense entries still read clearly

Records written before the style contract existed are exactly as dense as the day
they were captured, and they are **never migrated, edited, or re-summarized** —
memory-of-use is append-only (INV-3), and rewriting your own past record to look
tidier would be a worse bug than the density.

Instead the server's instructions ask your **client** to *report* recalled
summaries in plain language for whoever is asking — and that applies to every
record, not just new ones. So when you ask "what was I working on?", Claude may
answer in cleaner words than the stored line uses. That is the intended behavior:
what is on disk is the record, what you are told is the answer. If you want the
exact stored text, open the day file in Obsidian, or run `npm run recent`, which
prints the raw stored line.

From the terminal:

```bash
npm run recent                        # everything, most-recent-first
npm run recent -- 3                   # the 3 most recent
npm run recent -- --days 7            # just the last week
npm run recent -- --project my-librarian   # just one project
```

---

## 3a. How your client knows to ask

You do not have to tell Claude (or any other MCP client) when to use the
librarian. The server declares its own **MCP instructions**, which every client
receives on connect:

> Recency questions → `librarian-recent`. Prior-engagement and content questions →
> `librarian-search`. Consult them before reading files directly. Then
> `librarian-get-note` to read a note in full. Write `librarian-session` summaries
> to the style contract above. Report recalled summaries — including old, dense
> ones — in plain language for whoever asked.

So the instructions cover both directions of the memory: how a summary should be
**written**, and how a recalled summary should be **read back**. Neither is
enforced by the server; both travel to every client that connects.

This matters because guidance in a project's `CLAUDE.md` only helps in that
project. Instructions that ship *with the server* travel to every client and every
directory it's connected from — one install, not one per repo. (The one thing that
does still live in your global `CLAUDE.md` is the *summary directive* from step 2
above: writing the line is inference, which is your client's job, not the
server's.)

The guidance says *when the tools are the right answer* — it does not tell your
client to call them unprompted. Memory stays quiet until it's relevant.

---

## 4. Search enrichment — quiet prior-engagement signals

When you run **`librarian-search`** and a result is a note a past session
referenced, that one result carries a quiet **prior-engagement** note: *what you
concluded and when*. For example:

```
1. Orbital telemetry pipeline — reference · evergreen · 2026-05-02
   Notes/foo.md
   …matching snippet…
   ↩ prior engagement 2026-07-22: "Decided foo is the canonical source."
```

- **Silence is intentional.** Results you've never engaged carry **no**
  annotation. That's by design — the librarian is quiet when unprompted; the
  absence of a note is not a bug and is never "not seen before" noise.
- **It never changes your results.** Enrichment is *additive metadata only*: the
  set of results and their ranking are byte-identical to the plain S1 search. A
  prior engagement never promotes, demotes, adds, or drops a result.

See [§6](#6-note-identity--surviving-a-vault-rename) for two more things this
surface renders, additively, when note identity is involved: a candidate note
for a reference the identity pass couldn't resolve on its own, and a conflict
between a confirmed binding and a fresher automatic detection.

---

## 5. Measuring the desirability gate

S1.5 exists behind a kill gate: *does ambient memory-of-use actually pull you
toward stateful behavior?* The gate target is **reaching for a stateful behavior
unprompted ≥3×/week for 2 weeks.**

Every time you invoke `librarian-recent`, or run a search that surfaces at least
one prior-engagement signal, the librarian appends one timestamped event to a
local, append-only log (`_librarian/stateful-use.jsonl`). A single search counts
as exactly one event no matter how many signals it surfaced.

Read the per-ISO-week count to evaluate the gate:

```bash
npm run gate                       # counts across all history
npm run gate 2026-07-13 2026-07-26 # counts within a date range
```

Output is one line per ISO week, marking weeks that met the ≥3 target:

```
stateful-use per ISO week (gate target: >=3):
  2026-W29: 2
  2026-W30: 4  ✓
```

> Classifying an invocation as truly *unprompted* is left to manual wish-log
> review; the log captures every invocation with a timestamp so that review is
> possible.

---

## 6. Note identity — surviving a vault rename

A reference records two things about a note at the moment it was touched: its vault-relative
path, and a content hash. Rename the note later and the path stops resolving — but the hash is
still there, so the librarian can tell *what* the reference meant even after *where* it lives has
moved.

Every `npm run reindex` runs an identity pass over every recorded reference whose path no longer
resolves — and "resolves" means exactly what it sounds like: a file exists on disk at that path,
inside the vault, of ANY type. A reference can legitimately point at a non-note artifact (a
`.gitignore`, an exported `.html`, a `.yaml` config, anything under `_librarian/` itself) since
capture hashes whatever bytes are actually there; such a reference is live for as long as that
file exists, and the identity pass never treats "not an indexed markdown note" as "dead." Only a
path that is actually MISSING — deleted or moved with no trace at the old location — enters the
rest of this section, note or not:

- **Exactly one current note's content hash matches what was recorded** — the note was renamed,
  content untouched. The librarian binds the old path to the new one, deterministically, and
  appends the binding to a ledger (`_librarian/note-identity.md`). No heuristics, no similarity
  score, no model — a hash either matches or it doesn't.
- **Zero matches, or more than one** — the librarian does not guess. Zero means the note was
  renamed *and* edited (so no current note's hash matches); more than one means duplicate content
  exists and picking one would be inventing an answer the vault doesn't actually give. Either way
  the reference renders explicitly as **unresolved**, with every candidate it found — never
  silently dropped, never silently bound to a guess.

`librarian-recent` and search enrichment resolve bound references through the ledger at read
time: the session record you see still says what you wrote, but the ref line shows the note's
current path, or `[UNRESOLVED -- candidates: ...]` when the librarian genuinely doesn't know.
Nothing on this path ever rewrites the stored session entry — resolution happens only when it is
displayed.

Both surfaces render the unresolved case, but they render it differently, because they have
different things to attach it to:

- **`librarian-recent`** shows the dead reference itself, so it renders the ref line the same way
  either way: `Notes/old.md@sha256:... [UNRESOLVED -- candidates: Notes/dup1.md, Notes/dup2.md]`.
- **Search enrichment** has no "dead reference" object to annotate — it only ever annotates a
  search RESULT, which is a live, currently-indexed note. So when one of an unresolved
  reference's candidates happens to also be a search result, THAT result carries a separate
  `unresolvedReference` annotation naming the dead ref and every candidate — distinct from the
  ordinary prior-engagement note, and never rendered as one. A note that is merely a *candidate*
  for an old reference is not the same claim as a note that a session record actually engaged, and
  the two are never conflated: a candidate result is never annotated with `priorEngagement` on the
  strength of a candidacy alone. If none of an unresolved reference's candidates are among a given
  search's results, nothing about that search changes — enrichment only ever annotates results
  that are already there (SR-009/SR-010 hold exactly as before). One consequence worth being
  explicit about: a reference with **no candidates at all** (the note was renamed *and* edited,
  so no current note matches its recorded hash) has nothing enrichment could ever attach it to,
  and is therefore visible on `librarian-recent` only. `librarian-recent` is the complete
  discovery surface for unresolved references of every kind; search enrichment is a
  candidate-anchored extra, not a second complete listing.

**Confirmed bindings are sticky, and disagreements are surfaced, not silently settled either
way.** Suppose you confirm `Notes/old.md` to `Notes/keep.md`, and later the vault changes so that
exact-hash matching would, on its own, now point `Notes/old.md` at a *different* note (say a
stray file lands with the exact bytes that were last recorded for `old.md`). The confirmed
binding still wins — a later piece of automation never outvotes a human decision — and reindex
appends nothing new for that reference. But the disagreement itself is not hidden: both read
surfaces render it explicitly, alongside the confirmed target: `confirmed Notes/keep.md; the hash
now matches Notes/stray.md`. The only thing that ever moves a confirmed binding is a fresh
`npm run identity-confirm` run.

If a reference stays unresolved, resolve it by hand:

```bash
npm run identity-confirm -- Notes/old-name.md Notes/new-name.md
```

This is a **local terminal command only** — it is never exposed as an MCP tool, so a connected
client can never rewrite what a dead reference means on its own. It checks that the target you
name actually exists in the vault right now (existence, not a hash match — the whole point is
resolving the case where the hash no longer matches), then appends a `detected: confirmed` entry
to the same ledger. Confirmed bindings are sticky in general, not just against a still-ambiguous
vault: once you've resolved a reference, no LATER automatic detection — ambiguous or a clean
single-candidate match pointing somewhere else — ever moves it back or overrides it; see above for
how that disagreement is surfaced instead of silently settled. The only thing that supersedes a
confirmed binding is running `npm run identity-confirm` again.

The ledger is append-only, same as everything else here (INV-3): a note renamed more than once
gets a fresh binding each time, computed directly against what was originally recorded — never by
chaining through an earlier binding — with the newest *automatic* entry winning at read time.
Confirmed entries are the one exception to "newest wins": once a pair is confirmed, only a later
confirmation moves it, never a later automatic detection (see above). Earlier entries are never
rewritten, reordered, or removed. The identity projection tables in the SQLite cache are, like the
rest of the index, fully disposable: delete `data/librarian.db` and reindex, and they rebuild from
the vault and the ledger alone (INV-4).

---

## Guarantees

- **Local-first (INV-1):** no network calls, ever. Repository identity is resolved
  by reading `.git/config` — no `git` subprocess, and a remote URL is recorded as
  text, never fetched.
- **Store immutability (INV-2):** the librarian only writes under `_librarian/`
  and `data/`; it never creates, modifies, or deletes vault notes.
- **No hard-delete (INV-3):** memory-of-use records are only appended. Old records
  are never re-summarized or tidied up to match a newer convention.
- **Rebuildable (INV-4):** `data/librarian.db` is a disposable cache; delete it
  and `npm run reindex` reconstructs everything from the vault + `_librarian/`.
- **No AI in the server (INV-6):** summaries are your client's; the server stores
  and serves them **verbatim** — including summaries that ignore the style
  contract entirely. Judging or improving prose would be inference, so the
  server does neither, at capture or at read time.
