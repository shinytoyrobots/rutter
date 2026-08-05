# Decision graph — design note

**Written:** 2026-08-04
**Status:** proposal, not ratified. `spec/spec.md` remains the executable source of truth;
nothing here is a requirement until it lands there.
**Purpose:** answer three capability questions raised on 2026-08-04 — how prior opinion is
surfaced without the server judging, how a decision graph relates to the knowledge graph,
and what the accumulating record looks like after a year and after five.

---

## The shape: two graphs, one of them derived

There are two graphs, and the important claim is that only one of them is authored.

The **knowledge graph** is the vault: notes, wikilinks, backlinks. It already exists, it is
Obsidian-native, and it is addressed by path plus content hash. It is the source of truth
for content.

The **decision graph** is what `_librarian/` becomes when read as a graph rather than as a
log. Today the stored atom is an *event* — "this happened in a session at this time,
referencing these notes." Events are append-only and byte-verbatim forever (INV-6, SR-023).
That must not change; it is what makes every claim above it falsifiable.

But an event is the wrong atom for "you thought this before, and here's where you changed
your mind." That needs an atom with a *history*: something that can be asserted, revisited,
contradicted, and superseded while keeping every intermediate state readable. Call it a
**position**.

The resolution is that positions are a **projection over the event log, not a second thing
you maintain.** Same rule that already governs SQLite: the derived layer must always be
rebuildable from vault plus sidecar, and is disposable. This buys the lifecycle semantics
of #3 without putting a single mutable byte into the record, and without putting a model in
the server — the client reasons, the server only stores and joins.

### Nodes

| Node | Source | Mutable? |
|---|---|---|
| Event | `_librarian/sessions/*.md` entry | never |
| Note version | vault `path` + `sha256` | never (new hash = new version) |
| Position | derived from events | yes, by re-projection |
| Thread | derived from positions | yes, by re-projection |

### Edges

Position → note version, `based-on`. Already recorded on every entry. This is the join
between the two graphs, and it is what makes drift visible: the position points at the
*version* it was formed from, so when the live note hashes differently, the basis has moved
under the conclusion.

Position → position, `supersedes`, carrying the event that caused the change. **This is
capability #3.** "You concluded X on July 28 (from these notes), you revised it to Y on
August 2 (here is the session where that happened)." Surfacing and attribution only; no
adjudication, which keeps the stance intact — *weighs openly, attributably, reversibly,
never silently* — and keeps faith with the source metaphor, whose Librarian refuses
speculation by design and leaves the interpretive leap to the human.

Position → position, `depends-on`. The self-referencing edge: conclusions built on other
conclusions. This is where a superseded position can invalidate things downstream of it,
which is the whole reason the graph is worth having rather than a list.

Position → event, `corroborated-by` / `disputed-by`. The graded reversible marks already
designed for H2 (`↻` superseded, `✻` corroborated, `†` disputed).

---

## Accumulation: what this looks like at one year and five

Measured over the ten days 2026-07-26 → 08-04, from `_librarian/sessions/`:

- **193 entries in 10 days — 19.3 per day.** (Note: HANDOFF's "3.2 per session" is
  per-session; there are several sessions a day. 19.3/day is the accumulation rate.)
- Mean summary 81 words, median 58.
- 72% of entries carry at least one ref; 414 refs total, **106 distinct notes**.
- 2 of 106 ref paths no longer resolve on disk — a ~2%/10-day rename rate.

Extrapolated: **~7,000 events per year, ~35,000 at five years**, roughly 10MB of markdown.

**Storage is not the problem and will never be the problem.** FTS5 over 35,000 short
records is unremarkable. The problem is *precision*: a query matching 200 events is useless
to a human, and that is what "ever-accumulating" actually costs.

So the elegant solution is not deletion or compression. It is that **the three tiers grow
at different rates, and only the cheap one grows without bound.**

**Events grow linearly with use.** Forever, verbatim, never touched. This is the audit
trail, and it is cheap precisely because nothing queries it directly by default.

**Positions grow with the number of distinct things you have formed a view about** — which
is bounded by human capacity, not by usage. Revisiting a topic *updates* a position rather
than appending a new one, so the second year adds far fewer positions than the first. Five
years of 35,000 events might project to a few hundred live positions and a few thousand
superseded ones.

**Threads grow to tens.** "Role search," "the gate design," "Carbon metrics." This is the
browsable index.

That difference in growth rate *is* the answer to accumulation, and it is why the derived
layer earns its keep. It also gives salience without inventing a decay score: relevance
comes from a position's **status** — live, superseded, dormant — which is semantically
meaningful, reversible, and inspectable, where a time-decay weight is none of those. The
Pinakes tier (forget to a durable metadata stub, never hard delete) then applies to
positions rather than to events, so forgetting never destroys evidence.

This also restores Lagos's stated design mission, which the current build does not serve:
**discrimination over accumulation.** Today the tool only accumulates.

---

## Two problems this design depends on

**1. Enrichment coverage, not an enrichment bug.** Capability #2 fires on ~1 of 27
searches. That is not a defect: 106 distinct notes have been referenced against ~2,298
indexed, so **4.6% of the vault has ever been engaged in a recorded session, and the
observed hit rate of 3.7% is that base rate.** Enrichment can only speak about notes you
have already touched. It therefore improves on its own with use, and the honest read is
that it is currently *undersupplied, not broken* — which argues for patience rather than a
rewrite. It also means the decision graph's value is gated on coverage: the
knowledge → decision direction ("what have I concluded about this note?") is the one that
makes two graphs better than one.

**2. Note identity is not yet durable.** Refs key on `path` + `sha256`. The hash is
deliberately a *version*, so it cannot serve as identity — a note that changes must remain
the same note or supersession chains break. Path is the de facto identity and Obsidian
renames freely; the measured rename rate is ~2% per 10 days, which compounds to a
meaningful fraction of broken chains over five years. Either adopt a stable frontmatter id
on referenced notes, or add rename detection (content-similarity across a disappeared path).
This is the one prerequisite that gets harder the longer it is left, because every event
written before the fix carries the weaker identity.

---

## Deferred, recorded here on purpose

**Portable capture (capability #4).** Recall is already client-agnostic: the records are
markdown in a git repo, the MCP server carries no model, and any MCP client can read it.
*Capture* is Claude-only, because it depends on a Claude Code Stop hook. So "works with
ChatGPT" today means ChatGPT reads what Claude wrote. Making capture portable is the real
work item and is strictly harder than the recall side — it needs a per-client mechanism for
the same client-authored sentinel pattern. Noted for a later effort; not scoped here.

---

## Sequencing, if any of this proceeds

Nothing here should start before the gate verdict, and the roadmap's rule stands: **do not
build H2 on inference alone.** This note is inference. The wish log has six entries and
none of them asked for belief-lifecycle.

Two items are exceptions worth arguing, because they surface data the records *already
contain* rather than adding a pillar:

1. **Durable note identity** — cheapest now, most expensive later, and a precondition for
   every supersession chain.
2. **Drift visibility** — every event already stores the hashes. "The note you concluded
   this from has changed since" is buildable today, and it is the specific claim the
   opportunity scan found nobody else making.
