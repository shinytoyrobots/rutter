# Panel record — 2026-08-13 (Phase B re-probe, post-amendment)

**Spec version probed:** 10.0.0
**Scope:** SCN-011 (full text) + SR-058, SR-060, SR-061 (the three amended
requirements), read against the unchanged SR-059/062..065 for interaction effects.
Narrower than the first Phase B panel by design — the operator asked for a
re-probe "on that limited scope," i.e. what actually changed since
`panel-2026-08-13-phase-b.md` (v7.0.0 → v10.0.0 via three amendments, v8.0.0/
v9.0.0/v10.0.0).
**Readers:** 3, sonnet, read-only, spawned in parallel, no cross-visibility. Each
given the full current SCN-011 acceptance criteria, the three amended SRs in full,
one-line summaries of the five unchanged SRs (SR-059, SR-062..065) for interaction
context, INV-3/4/6, and the `librarian-get-note`/`librarian-search`/SCN-008/SR-057
precedents each amendment cited — with explicit instruction to check whether the
amendments closed their target ambiguity cleanly, or left a residual fork, or
created new friction against the unchanged text.
**Skip check:** not applicable — the last three spec rounds were all semantic
(major bumps modifying live SCN/SR text), not pure ratification, so a re-probe was
warranted.

**Verdict: 4 new convergent divergences** (all three readers independently found
each one, near-identical reasoning) **+ 1 significant single-reader finding**
(flagged, not a convergence claim) **+ 2 points that read as friction but dissolve
on cross-reference** (noted, not routed).

This is a materially different signature from the first Phase B panel: there, the
three divergences were genuine 2-1 or split reads *within* the amended text
itself. Here, all three readers *agree* on what each amendment says — the new
friction is at the *seams* between the amended text and the text around it that
nobody touched. Amending a requirement in isolation, without re-reading its
neighbors, is exactly the failure mode this re-probe was designed to catch.

---

## Per-SR verdict (the three amended requirements)

| SR | Verdict | Note |
|---|---|---|
| SR-058 | convergent on meaning; **divergent-with-SR-059 friction** | All 3: reindex is the sole trigger, unambiguously. All 3 independently flag that this may silently void SR-059's "incremental update after one new event" clause — see Divergence 2. |
| SR-060 | convergent on meaning; **divergent-with-SR-062/063 friction** | All 3: the stub is built from the retire event's own fields, unambiguously. All 3 independently flag that this newly exposes two unaddressed interactions — see Divergences 3 and 4. |
| SR-061 | convergent on cardinality; **divergent on wire shape** | All 3: singular-vs-list split by mode is unambiguous. All 3 independently flag that "explicit not-found response" has no pinned shape — see Divergence 1. |

---

## Divergence 1 — What is the concrete shape of SR-061's "explicit not-found response"?

**The fork:** all 3 readers agree the amendment successfully rules out one thing
(a bare empty list/null standing in for "not found"), but note it doesn't choose
among at least three structurally different wire shapes: (a) a normal tool result
carrying a structured sentinel field (e.g. `found: false`), (b) an MCP-level error
(`isError: true`), or (c) a text-content response stating "no such topic." The
amendment's own justification ("mirroring `librarian-get-note`'s singular-lookup
convention") cites a real precedent, but that precedent's actual shape is not
shown anywhere in the spec text itself (S1 tools predate this spec and are not
re-specced) — so the citation narrows nothing an implementer can read directly.

**Why this matters:** this determines client-handling code (catch-and-branch on
an error vs. parse a normal payload), and it's exactly the kind of question that
would otherwise surface as population disagreement at generation time.

**Proposed disambiguation:** add an explicit line to SR-061 or a new SCN-011
acceptance criterion stating the not-found response's actual shape (or, if the
intent genuinely is "whatever `librarian-get-note` already does," state that
shape here rather than only citing it by name, so the spec is self-contained).
Route: `/flow-spec amend SR-061`.

## Divergence 2 — Does SR-058's reindex-only trigger silence SR-059's "incremental update after one new event" clause, or is that clause still exercised in production?

**The fork:** SR-059 (unchanged) requires "a full rebuild ... and an incremental
update after one new event" to "agree byte-for-byte" — language that presumes an
incremental-fold code path runs somewhere for real. SR-058 (amended this round)
says reindex is the fold's *only* trigger and forbids any code path outside
reindex from invoking it. All 3 readers, independently, found the same two
survivable readings:
- **Reading A — harmonized.** "Incremental update" is an internal computation
  *mode* reindex itself may use (apply the delta since the last materialization
  to existing tables, rather than a full drop-and-recompute) — still gated behind
  the reindex trigger, so SR-058 holds and SR-059's clause stays meaningful.
- **Reading B — dead text.** SR-058's "reads every file that exists ... before
  computing" reads, plainly, as a full re-parse every reindex cycle. Under that
  reading there is no code path left that does a true incremental delta-apply in
  production — SR-059's byte-for-byte comparison becomes a test-only construct
  comparing an algorithm to itself, not a real cross-check of two genuinely
  different, both-live code paths.

**Why this matters:** this is the sharpest of the four convergent findings. If
Reading B is what generation actually builds, a "required test" (per SR-059's own
framing) stops testing anything real, and nobody would notice until a reviewer
asked why the incremental path has no caller. All three readers reached this
independently and offered the same fix.

**Proposed disambiguation:** add a clause to SR-058 or SR-059 stating explicitly
that reindex's fold computation may run as either a full rebuild or an internal
incremental delta-apply (both reindex-triggered, both required to agree
byte-for-byte) — clarifying that "reads every file that exists" describes the
fold's *scope*, not a mandate to re-parse every byte on every run. Route:
`/flow-spec amend SR-058` (or `SR-059`).

## Divergence 3 — Does a `retire` event count as a "revision" for the Attribution criterion's "most recent revision date," or is retirement provenance a separate, unaddressed dimension?

**The fork:** SR-062/the Attribution acceptance criterion requires every rendered
stance to state "the formed date and, if superseded, the most recent revision
date." SR-060's amendment specifies the retired stub's own timestamp as one of
the fields it carries, but doesn't say whether that timestamp is what "most
recent revision date" refers to for a retired topic, given that a `retire` is
arguably not a "revision" in the sense `revise`/`reaffirm` are (its stance is a
terminal note — e.g. a reason — not a restatement of the position). All 3 readers
independently posed this as a real question with no textual answer, offering the
same three candidate readings (retirement-as-revision; formed-date-only, ignoring
retirement; or a third, retirement-specific provenance field).

**Why this matters:** this fork could only be posed *after* SR-060 pinned down
what the stub carries — it's new friction the amendment exposed, not a
pre-existing gap. It affects what Robin actually sees when recalling a retired
position, and gets the attribution wrong (dates presented as something other than
what they are) in exactly the direction SCN-011's own Given/When/Then most cares
about (never blend, always attribute correctly).

**Proposed disambiguation:** amend the Attribution acceptance criterion (or add
one specific to the retired case) stating explicitly how a retired topic's
provenance renders — e.g. "formed date, plus the retirement's own date labeled
distinctly as a retirement, not folded into 'most recent revision.'" Route:
`/flow-spec amend SR-062` (or add a retired-case acceptance criterion to SCN-011).

## Divergence 4 — Should a retired topic ever also be computed and labeled "dormant"?

**The fork:** the Dormant acceptance criterion (SR-063, unchanged) computes
staleness generically from "not reaffirmed or referenced within a window," with
no stated exemption for retired topics. All 3 readers independently noted that a
retired topic trivially satisfies "not reaffirmed within any window" (nothing
gets reaffirmed after retirement, by definition), so a naive implementation would
double-label a topic as both "retired" and "dormant" — which reads as, at best,
redundant, and at worst, confusing (retirement is a deliberate closing act, not
passive neglect).

**Why this matters:** same root cause as Divergence 3 — SR-060 newly specified
enough about the retired stub's semantics to make this question askable, and it
touches the same "don't mislead the client about what happened" concern SCN-011's
Given/When/Then is built around.

**Proposed disambiguation:** state explicitly, in SR-063 or SCN-011's Dormant
criterion, whether retired topics are exempt from dormancy computation (the
cleaner reading, since dormancy is meant to signal neglect, and retirement is
already an explicit, deliberate terminal state that shouldn't need a second,
weaker label). Route: `/flow-spec amend SR-063`.

---

## Significant single-reader finding (not a convergence claim — flagged because of its consequence)

**Match scope for free-text and note-identity queries: does search cover only a
topic's live event, or its entire chain?** Only 1 of 3 readers (R3) raised this,
but rated it "arguably the sharpest remaining fork" because — unlike the four
divergences above, which are about response formatting and display — this one
affects **recall correctness**: whether a stance phrase or a note reference that
only appears in a *superseded* event (not the current live one) causes its topic
to surface at all. SR-061 says free text matches "against stance content" and
note-identity matches "positions whose refs include that note," without stating
whether that scan covers the live event only or the full historical chain. Both
readings are defensible; neither is stated. Given this is pre-existing text
(unchanged by any of the three amendments) rather than new friction from this
round, it wasn't caught by the earlier panel either — worth a dedicated look, not
folded into this round's four routed items. Not formally routed here (single-
reader, and outside this re-probe's intentionally narrow scope), but flagged for
the next `/flow-spec amend SR-061` pass to fold in alongside Divergence 1.

## Points that read as friction but dissolve on cross-reference (noted, not routed)

1. **Can a topic be "un-retired" by a later event?** (R3) SR-060's "terminal
   state" language could be read as permanent. It isn't, on a careful read: SR-060
   is explicitly conditional ("When the most recent event ... is a retire") — if
   a client later asserts a new position on the same topic, that new event
   becomes the most recent, and the stub logic simply no longer applies. This
   dissolves the same way v4.0.0's SR-054 apparent-divergence dissolved on
   checking its own cited precedent (panel-2026-08-12): the plain reading already
   answers it once SR-059's fold-order rule is applied literally. No amendment
   needed.
2. **"Most recent event" — append order or timestamp?** (R3) SR-060 doesn't
   restate SR-059's ordering key (append order + event id + `revises`, explicitly
   not wall-clock time) inline, so a reader of SR-060 alone could misread "most
   recent" as "highest timestamp." This is a cross-reference clarity gap, not a
   substantive fork — SR-059 already answers it. Worth a "per SR-059's ordering"
   parenthetical next time SR-060 is touched, but not worth its own amendment
   round.

## What convergence tells us

The three amendments each did exactly the job they were written for — none of
the three original divergences reopened, and no reader found a way to read
SR-058, SR-060, or SR-061 that contradicts what the amendment intended. But all
three readers, working independently, found the same shape of residual problem:
an amendment that resolves cleanly in isolation can still leave its boundary
with unamended neighboring text unaddressed, because nobody re-reads the whole
scenario after a narrow textual fix. This is worth naming as a standing lesson
for this effort: **an amendment closes the fork it targets; it does not
re-verify the scenario's internal consistency.** A short "does this interact with
anything else in this SCN?" check, or a narrow re-probe like this one, is the
cheap way to catch it before generation, rather than after.
