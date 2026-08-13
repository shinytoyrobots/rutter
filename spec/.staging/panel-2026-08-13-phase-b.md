# Panel record — 2026-08-13 (Phase B)

**Spec version probed:** 7.0.0
**Scope:** SCN-011, SR-058..SR-065 (effort decision-graph, Phase B — position recall
with supersession). First panel read of this text; SCN-011/SR-058..065 were drafted
this session (v7.0.0) and have never been probed before. Not a re-probe of Phase A
(SCN-010/SR-047..057), which already went through two panel rounds (2026-08-12,
2026-08-13) and two ratifying amendments (v6.0.0).
**Readers:** 3, sonnet, read-only, spawned in parallel, no cross-visibility, each
given the full current SCN-011/SR-058..065 text, INV-3/4/6, the five relevant
glossary entries, and architectural context, with explicit instruction not to
consult any other repo file (blind to the plan doc, Phase A's implementation, and
each other).
**Reader count rationale:** weight class is `light` (constitution), the slice is
read-only with no new write surface, and it is comparable in size to Phase A's
original 3-reader panel (10 SRs). No security-bearing surface was identified that
would justify the wider 5-reader panel Phase A's *second* round used (that widening
was triggered by two live chavruta dissents on that specific slice; no equivalent
signal exists here yet).

**Verdict: 3 divergences** (routed below), plus **3 convergent-but-underspecified
gaps** (not routed; recommended for a future patch).

---

## Per-SR verdict

| SR | Verdict | Note |
|---|---|---|
| SR-058 | convergent | All 3: glob every `<YYYY-MM>.md` file, feed all into the fold before computing any topic's view. |
| SR-059 | convergent (mechanics), but see Divergence 2 | All 3 independently designed a pure `fold(events) -> projections` function with the same rebuild/incremental-agreement shape; they diverge on *when* the incremental path fires. |
| SR-060 | **divergent** | See Divergence 1 (retired-stub content). |
| SR-061 | convergent on query-mode dispatch mechanism; **divergent on response shape** | All 3 independently rejected single-string mode-sniffing in favor of explicit, named/typed query parameters (a genuinely strong convergent signal — none proposed heuristic classification). They diverge on whether the topic-key mode returns a singular object or is wrapped in the same list envelope as the other two modes. See Divergence 3. |
| SR-062 | convergent (with a flagged gap) | All 3 land on: instructions must require explicit provenance and forbid present-tense restatement. One reader flags that "most recent revision date" is itself ambiguous — see gap 1. |
| SR-063 | convergent | All 3: no stored field, computed at read/render time only, from existing event timestamps. |
| SR-064 | convergent (with a flagged gap) | All 3 apply inert-rendering to `topic_key` specifically in their sketches. One reader names, out loud, that the SR's literal text scopes the requirement to `topic_key` only and asks whether stance/refs/session-id need the same treatment — see gap 3. |
| SR-065 | convergent (with a load-bearing dependency) | All 3: a required before/after byte-comparison test. But see Divergence 2 — if the fold is wired to fire synchronously off SCN-010's write path (one reader's reading), SR-065's non-interference guarantee becomes harder to keep structurally true rather than true by construction. |

---

## Divergence 1 — What does a "retired stub" contain when the retire event itself carries a client-authored stance? (SCN-011, SR-060)

**The fork:** SCN-010's own grammar allows a `retire` directive to carry a stance
(`POSITION retire <topic-key>: <stance>`) — a client can write a reason or note when
retiring a topic, not just an empty stance. SR-060 says the live view renders a
"retired stub ... rather than the stance of any earlier event," but never states
whether the *retire event's own* stance text is part of that stub.

- **Reading A — stance omitted entirely** (2 of 3 — R1, R2): the stub carries only
  `{topic_key, kind: retire, timestamp, session_id, refs}` — no stance field at all.
  Read as: "retired stub" names a content-stripped terminal marker, and the
  acceptance criterion's phrasing ("rather than the stance ... before it") is read
  as ruling out *any* stance in the default view, not just the prior one's.
- **Reading B — retire event's own stance is included** (1 of 3 — R3): the stub is
  a normal position-event rendering of the retire event itself, and since a retire
  event's `stance` field is stored byte-verbatim like any other event's, it
  naturally appears. Read as: the acceptance criterion is only ruling out the
  *earlier* stance surfacing as if still live — it says nothing about suppressing
  the retire event's own content, and doing so would silently discard client-authored
  data the write path (SCN-010, already shipped) already stored.

**Why this matters:** these produce genuinely different wire shapes for the tool's
most common "is this topic still live?" response, and the difference is invisible
until a client actually retires a topic with a stated reason (e.g. `POSITION retire
db-choice: superseded by the Postgres migration`) — at which point Reading A would
silently drop that reason from every default-view listing forever (recoverable only
via the full-chain request), while Reading B surfaces it as though it were the live
stance rather than a retirement note. Both readings are internally consistent with
INV-3 (nothing is deleted from the underlying stream either way); the disagreement is
purely about the read-time projection's default shape.

**Proposed disambiguation:** amend SCN-011's "Retire is a terminal marker" acceptance
criterion (and SR-060) to state explicitly whether the retired stub includes the
retire event's own stance field, and if so, under what field name (so a client
doesn't have to guess whether a populated stance on a retired stub is "the reason for
retiring" or a stale copy of the prior live stance). Route: `/flow-spec amend SCN-011,
SR-060`.

## Divergence 2 — Does the position fold run only at reindex time, or is it also wired to fire synchronously off SCN-010's write path? (SCN-011, SR-058, SR-059, and by extension SR-065)

**The fork:** SR-058 names "when a reindex runs" as the fold's trigger; SR-059
requires that a full rebuild and "an incremental update after one new event" agree
byte-for-byte, without saying what triggers that incremental update.

- **Reading A — reindex-only** (1 of 3 clearly, R1; R2 leans this way — its sketch
  names an `applyNewEvent`/incremental-path function but never says what calls it,
  and never wires it to SCN-010's write path): the projection materializes only when
  a reindex runs (batch), matching SR-058's literal trigger and the architecture
  note that SQLite is "a disposable cache, rebuilt from vault + `_librarian/`." A
  position captured between reindexes is on disk but not yet queryable via
  `librarian-positions` until the next reindex.
- **Reading B — write-time hook** (1 of 3 clearly, R3): the fold's incremental path
  is invoked synchronously right after SCN-010's capture path appends a new position
  event, so `librarian-positions` sees a just-written position immediately, with no
  staleness window. SR-059's phrase "an incremental update after one new event"
  is read as describing a real, live-wired code path rather than a hypothetical one
  the determinism test alone would exercise.

**Why this matters:** this is not a stylistic difference — it changes user-observable
latency (can Robin query a position they just asserted this same turn, or only after
the next reindex?) and it directly touches SR-065's non-interference guarantee.
Reading B requires adding a call from inside or immediately after SCN-010's write
path into Phase B's fold code — exactly the kind of coupling SR-065's "byte-for-byte
unchanged... write path" requirement exists to rule out being *accidentally*
introduced. Reading A keeps the two phases structurally decoupled (Phase B only ever
*reads* the positions stream; nothing about Phase A's code changes), which is easier
to prove correct against SR-065 by construction rather than by a written-after-the-fact
regression test. Only R3 committed to the more architecturally consequential answer;
the other two readers' own implementation sketches quietly under-specify the same
question in their own code (both mention an "incremental" function without stating
where it's invoked from).

**Proposed disambiguation:** amend SR-058 (or add a new SR) to state explicitly
whether `librarian-positions` may lag the positions stream until the next reindex, or
whether a write-time hook is required for immediate read-after-write consistency —
and if the latter, add an explicit acceptance criterion requiring that hook to be
additive-only relative to SCN-010's write path (never altering its control flow,
timing, or failure modes), so SR-065's guarantee stays provable rather than merely
tested. Route: `/flow-spec amend SR-058` (or add SR-058a).

## Divergence 3 — Does topic-key-mode return a single object, or is every query mode's response wrapped in the same array/list envelope? (SR-061)

**The fork:** the text describes three query *semantics* (topic key: exact match;
free text: content match; note identity: ref membership) without stating a uniform
response envelope.

- **Reading A — shape varies by mode** (2 of 3 — R1, R2): topic-key mode returns 0
  or 1 result (a singular object or null, since it's an exact-match lookup on a
  presumptively-unique key), while free-text and note-identity modes return a list
  (0..N), since both can plausibly match more than one topic.
- **Reading B — always a uniform list** (1 of 3 — R3): every mode returns the same
  array-shaped envelope, including topic-key mode, on the grounds that a uniform
  contract is simpler for callers and that even note-identity matches ("returning
  *positions*," plural, per SR-061's own wording) are inherently multi-hit.

**Why this matters:** this is a concrete API-contract fork a client integration would
have to pick one way or the other — not a cosmetic one. Both readings agree on the
underlying data (topic-key IS exact-match, and IS at-most-one-topic in practice,
since topic keys are per-topic identifiers), so the disagreement is purely about
whether the *response envelope* collapses that single result out of list form or not.

**Proposed disambiguation:** add an explicit line to SR-061 (or an acceptance
criterion on SCN-011) stating the response shape per mode — e.g. "the tool's
response is always a list of zero or more topic results, regardless of query mode"
— closing this before a client integration has to guess. Route: `/flow-spec amend
SR-061`.

---

## Convergent-but-underspecified gaps (not routed as decisions; recommended for future patches)

1. **"Most recent revision date" — does it advance on `reaffirm`, or only on
   `revise`?** Only 1 of 3 readers (R2) surfaced this explicitly: the glossary
   carefully distinguishes "changed (`revise`)" from "re-endorsed (`reaffirm`)" as
   separate lifecycle states, but SR-062's "most recent revision date" doesn't say
   which kinds of event advance it. R2's own reading (revise-only, since a reaffirm
   doesn't change content) is defensible but unconfirmed by the other two readers,
   who didn't address the question at all. Worth an explicit line next time SR-062
   or SCN-011 is amended.

2. **Versioned-note-identity match: exact version, or version-agnostic?** 2 of 3
   readers (R1, R3) independently flagged that "a note's *versioned* identity"
   (query input) vs. "refs include that note" (match description, dropping
   "versioned") creates room to read the match as either exact-version or
   note-identity-only. Both independently landed on the same answer (exact-version
   match, consistent with the project's general anti-inference stance), but the fact
   that two blind readers both had to reason through it rather than read it directly
   off the text is itself a signal the text should just say so.

3. **Scope of SR-064's inert-rendering requirement.** SR-064's literal text names
   only `topic_key`. Stance content, refs, and session id are equally
   client-authored strings this tool renders, and are presumably already covered by
   whatever general client-authored-text policy Phase A's `SG-10` established — but
   SR-064 doesn't say so, and 1 of 3 readers (R3) was the only one to name the
   ambiguity explicitly (the other two applied inert-rendering only to `topic_key`
   in their sketches, without discussing why the other fields weren't in scope).
   Worth a citation ("stance/refs/session-id are already covered by the pre-existing
   policy, cited not restated here") next time this SR is touched.

---

## What convergence tells us

Architecture-level convergence is very strong: all 3 readers independently designed
a near-identical layered shape — a pure stream reader, a pure `fold`/`foldTopic`
function keyed on topic key + append order + event id + `revises`, a disposable
SQLite projection (a raw events table plus a derived per-topic live-view table, with
an FTS5 virtual table for free text), and a tool layer that dispatches on
explicit/typed parameters (never string-sniffing) and applies inert-rendering plus
explicit provenance at render time. All three also independently reached for FTS5
specifically for "free text matched against stance content" — a meaningfully
positive signal that this phrase, together with the architectural context naming
FTS5, reads unambiguously as "use the tokenized search engine already in the stack,"
not a literal substring scan. And all three converged on rejecting single-string
mode-sniffing in favor of named/typed query parameters — a genuine, independently-
reached agreement on an API design question the text never states outright.

The three real divergences share a pattern with what Phase A's panels found: each
one is a place where the text names a *behavior* precisely (a stub renders; a fold
is deterministic; three query modes exist) but leaves a *shape or timing* detail
implicit that an implementer must still invent — exactly the class of gap this
panel exists to locate before a population of variants invents three incompatible
answers to the same question, as happened with Phase A's `revises:` syntax.
