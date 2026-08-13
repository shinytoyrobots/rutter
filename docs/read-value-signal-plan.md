# Read-value signal — design

**Written:** 2026-08-12
**Status: RETIRED, not built (2026-08-12).** See `docs/read-value-verdict-2026-08.md` —
Robin settled the read-value question qualitatively (captures demonstrably reduce
rework and drive new directions) rather than by instrument; no model in the server
means this kind of judgment belongs on the human side, not a proxy metric. Kept below
as a record of the design exploration — the tier-1 blind spot it found (recall-informs-
new-work is invisible to ref-overlap matching) is worth keeping even though the
mechanism isn't being built. Revisit only per that verdict's standing note (if the
tool ever operates without a single person's judgment available to ask).

Original status line, for context: plan, not ratified and not started. `spec/spec.md`
remains the executable source of truth. Companion to `docs/roadmap.md` Phase 1 (the
one open item left there) and `docs/gate-verdict-2026-08.md` §4 (which flagged the
same shape of gap from the other direction).
**Scope:** detect whether a recall (`librarian-recent`, or a `librarian-search` that
surfaces a prior-engagement signal) was acted on, not just that it happened.

---

## The problem, precisely

`docs/roadmap.md` names this the **primary kill condition**: "a recall that changes
nothing downstream fails regardless of who initiated it; one that changes what happens
next is the tool working." Today `stateful-use.jsonl` records that a call happened and
nothing else — `{ts, kind}`. There is no way to tell a recall that shaped the next hour
of work from one that was answered and immediately ignored. "The record has gone
write-only" is, right now, undetectable by construction.

## Constraints this design must not break

- **No model in the server** (HANDOFF §1). Whether a recall was "acted on" is a
  semantic judgment. The server can correlate IDs and paths; it cannot read intent.
- **No rewriting/merging/summarizing on the read path** (INV-6, COR-A-012). Whatever
  signal we add is new instrumentation, not a change to what `librarian-recent` /
  `librarian-search` return.
- **Ambient over mandatory.** The wish log already tried mandatory self-report once —
  candidate fix (d) in the 2026-07-27 dedup entry, "mandatory intent at capture time,"
  was **rejected** because it "taxes the writer at the moment they are trying to stop
  thinking about the session, so it will be skipped or answered wrong." The same
  reasoning applies here: a required "did that recall help? y/n" prompt will be
  skipped, answered lazily, or trained-around. Anything this design asks of the writing
  session has to be a side effect of what it already does, not a new step.
- **Honest floor, not a fabricated ceiling.** Per the gate verdict's own precedent
  (classifying intent by architecture-plus-policy rather than manufacturing false
  precision): better to under-count real usage than to report a number that looks
  rigorous but isn't. A signal that misses some genuine uses but never invents fake
  ones is the right shape.

## Why this can't be solved the way the gate verdict was

The gate verdict's intent question ("was this call pulled by a live human turn?") was
answerable *after the fact*, once, as a standing policy rule (Robin's 2026-08-05
ruling), because in this architecture every tool call structurally sits inside a live
session. Read-value is a different shape of question: it's not "was a human present,"
it's "did what came back change what happened next" — and that can only be answered by
looking at what happened *after* the call, which needs some way to connect a recall
event to the work that followed it. That connection doesn't exist in the log today.
The missing piece is the same in both cases — **session correlation** — but read-value
actually needs to *use* it, not just reason about it in the abstract.

## Proposed design: a graded signal, cheapest tier first

Three tiers, ordered by cost and by how much they can prove. Build tier 0 first; only
add a later tier if it turns out to be too blunt to answer the kill-condition question.

### Tier 0 — session continuation (cheapest; build this first)

**Signal:** did the session that called `librarian-recent` / `librarian-search` go on
to produce at least one `librarian-session` capture afterward — i.e. did the session
keep working, or did it end right there?

This is the bluntest possible instrument and it doesn't prove causation. But it
directly answers the starkest failure mode the kill condition describes: a recall that
is answered and then the session simply stops is the clearest possible "write-only"
signature. In an interactive tool, a session that recalls something and then produces
*nothing* afterward is a real, cheap-to-detect canary.

**What it needs:** stateful-use events and session-record captures to be linkable to
the same Claude Code session. Neither carries a shared, reliable session identifier
today (see §Open question below) — this is the one piece of new plumbing, and it's
shared by every tier.

**What it reports:** "% of recall events followed, in the same session, by at least
one capture" — a single rate, alongside the existing weekly count in a
`read-value` (or extended `gate`) CLI report.

### Tier 1 — ref overlap (stronger; fast-follow only if tier 0 proves too blunt)

**Signal:** did a later capture in the same session carry a `ref` (path + hash) that
matches a path the recall itself surfaced?

Mechanically clean — pure set intersection over data already being captured for other
reasons (`refs` in `session-record@1`), no new judgment anywhere. But it has a real,
known blind spot worth stating up front: **it systematically misses the case where a
recall informs new work rather than a return to old work.** This session is a live
example — "where are we with this project?" triggered `librarian-recent`, and what
followed was writing brand-new files (`docs/gate-verdict-2026-08.md`,
`docs/read-value-signal-plan.md`), not re-touching anything the recall itself
returned. Tier 1 would score that as a miss despite it being about as clear a case of
"the recall mattered" as exists. So: tier 1 is a genuine lower bound on reuse, not a
complete measure, and should never be read as "recalls not re-touched = recalls that
didn't matter."

**What it needs, beyond tier 0's session linkage:** stateful-use events must also
record which paths a call surfaced (available at call time; not currently persisted).

### Tier 2 — mined self-report (optional; never required, never mandatory)

**Signal:** capture summaries are free-text, written by the client, and already
sometimes name what informed them naturally (e.g., a summary that says "confirmed via
recall that..."). A simple keyword/heuristic pass over already-written summaries could
surface some of these without asking the writer for anything new.

This is explicitly **not a mandatory field** — it's mining what's already being
written, same ambient posture as the rest of the capture design. Low recall (most
summaries won't happen to phrase it this way), zero cost, never a false positive
worth worrying about. Not worth building unless tier 0/1 leave a real open question
tier 2 could plausibly close — flagged here so it isn't reinvented later, not proposed
as near-term work.

## Open question — session correlation (spike before committing to a mechanism)

Every tier needs to connect a stateful-use event to "the session it happened in."
Two candidate mechanisms, and it's not yet known which is available:

1. **Real Claude Code `session_id`.** `capture-cli.ts` receives this directly from the
   Stop hook payload today, and `session-record.ts` already stores it. The open
   question is whether the long-lived MCP stdio server process — which is what
   actually calls `recordStatefulUse` — has any way to learn the same id (an
   environment variable set on spawn, something in the MCP initialize handshake).
   **Nothing in the current codebase reads or forwards any such value** (checked:
   `config.ts` reads only `LIBRARIAN_VAULT_PATH` / `LIBRARIAN_DB_PATH` /
   `LIBRARIAN_USER_LABEL`). This needs a spike against Claude Code's actual stdio
   MCP-launch behavior before assuming it exists.
2. **Fallback: process-scoped id + time proximity.** For stdio transport, Claude Code
   spawns one MCP server process per session, so the process's lifetime already *is*
   the session boundary, even without knowing Claude Code's own id string. A
   process-generated id stamped on every stateful-use event from that process would
   correctly group all recalls within one session — but the Stop hook fires as a
   separate, later process that has no way to learn that generated id. Correlating
   the two would fall back to **time proximity plus matching workspace/cwd** (a
   capture within, say, the same wall-clock session window and the same project) —
   approximate, not exact, but consistent with this design's "honest floor" posture:
   an approximate correlation in service of a rough behavioral rate is the same kind
   of tolerance the gate verdict already leaned on, not a new relaxation of rigor.

**Recommendation:** spike (1) first — it's strictly better if available, and it's a
short investigation, not a build. Fall back to (2) only if Claude Code genuinely
exposes nothing.

## Recommended sequencing

1. Spike the session-correlation question above.
2. Build tier 0 only. Extend `stateful-use.jsonl` (or a parallel log) with the
   session linkage; extend `gate-cli.ts` (or a new `read-value-cli.ts`) to report the
   continuation rate alongside the existing weekly count.
3. Live with tier 0's number for a few weeks before deciding whether tier 1 is worth
   its cost. If tier 0 already shows recalls are consistently followed by continued
   work, that may be sufficient evidence against the "write-only" failure mode without
   ever needing tier 1's finer (and blind-spotted) measure.
4. Tier 2 stays optional, not scheduled.

This needs a spec amendment (a new SCN alongside SCN-004, and derived SRs) once the
session-correlation mechanism is confirmed — not written yet, pending review of this
plan.
