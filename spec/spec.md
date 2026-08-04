---
version: "3.7.0"
status: active
effort: s1-5-ambient-capture
last-amended: 2026-08-04
mapping-pending: false
# v3.7.0 (minor): the emission trigger contradicted itself. HITL-approved 2026-08-04
# (constitution escalation trigger 1 — capture semantics). Found while checking a
# README claim ("one curated line per session") against the records: real capture
# averages 3.2 entries per session and has never been 1.0 on any day, and SCN-001 is
# explicitly titled "exactly once per distinct directive" with an AC reading "not one
# entry per Stop firing". The README was wrong — but so were the instructions, in a
# way that matters more.
#   SR-025 required the instructions say "at the end of a session … exactly one
#   directive". SR-033 (v3.5.0) requires them explain what to do when "you emit
#   another directive later in the same session". SR-021 (v3.6.0) requires them say
#   "emit a line for each as you finish it". So the shipped contract told a client
#   both to send one line at the end AND several as it went.
#   This is very likely a CAUSE of the v3.6.0 length creep, not merely adjacent to
#   it: a client that believes it gets one line at the end of the session will pack
#   everything into that line, which is exactly what the 141-192 word entries are.
#   The word budget fought the trigger instead of replacing it, so v3.6.0 treated a
#   symptom.
#   Chosen: make the trigger per-outcome. SR-025 amended (one line per separable
#   thing, as it lands, trivial work omitted); the cadence guidance moves OUT of the
#   style paragraph, where v3.6.0 had put it, INTO the trigger paragraph where it
#   belongs; +SR-035 forbids the instructions ever again claiming one-per-session or
#   end-of-session timing, so the two halves cannot drift back apart.
#   Rejected: amending SR-033/SR-021 to match SR-025 instead. That would have made
#   the contract consistent in the wrong direction — one entry per session contradicts
#   SCN-001, the record schema, and every record on disk.
# SCN-001 needs no change: it already specifies per-distinct-directive capture. This
# was only ever an instruction-wording defect, so there is no storage, schema, read-
# path, or idempotence change, and no retrofit. The README's quoted block moves in
# lockstep (SR-027, COR-R-030) -- the first amendment so far to touch it.
# Desirability-gate clock NOT restarted (verdict stays ~2026-08-09).
# v3.6.0 (minor): summary length creep. HITL-approved 2026-08-04 (constitution
# escalation trigger 1 — capture semantics). Observed in real records: step COUNT
# stayed flat (7–40/day, no trend) while mean summary length tripled — 37–61
# words/step over 2026-07-26..08-01, then 141 (08-02), 142 (08-03), 192 (08-04).
# Diagnosis: SR-021 said "one line, not a build log" — true but UNNUMBERED, so it
# was unfalsifiable guidance and a client could write a 192-word "line" while
# believing it complied. Same failure class as wish-log finding #5 (behaviourally,
# not architecturally, guaranteed), recurring on a different requirement.
#   Rejected on the way: truncating to the budget and rejecting over-budget
#   directives — both are forbidden by SR-023/INV-6, and both destroy the only copy
#   of what the session meant. Also rejected: annotating the record body with the
#   word count (COR-R-027 requires the body line to be time + summary and nothing
#   else; an annotation is the server editorialising the record).
#   Chosen: state a NUMBER in the contract (the authoring-time lever that actually
#   changes client behaviour), channel overflow into per-thing directives which
#   SR-033 already supports, and REPORT overage on the capture path's stderr so
#   drift is visible when written rather than as a large day-file weeks later.
#   SR-021 amended (+ explicit word budget); +SR-034 (report, never enforce).
#   SCN-007 amended: +AC-length-budget.
# No record schema change (session-record@1 untouched), no storage change, no
# read-path change, no retrofit of existing records, no idempotence change.
# Desirability-gate clock NOT restarted (verdict stays ~2026-08-09).
# v3.5.0 (minor): wish-log finding #4 (2026-07-27), revision half. HITL-approved
# 2026-07-27 (constitution escalation trigger 1 — capture semantics). Fix (a) at
# v3.3.0 closed the hash-churn leak; this closes the remaining one, where a session
# revising its own wording appended a near-duplicate under SR-014. Rejected on the
# way: mandatory user-stated supersede/append intent (unusable — it taxes the writer
# at the moment they are trying to stop thinking), always-cumulative summaries
# (fights SR-021, unbounded), and discard-to-newest-per-session (destroys real
# milestones: the 2026-07-27 WEAVER morning is ONE session covering three separate
# queries sent). Chosen: incremental capture + collapse at READ time.
#   SCN-001 amended: the authoring contract is now incremental (+SR-033).
#   SCN-002 amended: the unit of recall is the SESSION, not the Stop firing
#   (+SR-030); `count` caps sessions rather than entries (+SR-031, BREAKING for
#   callers of librarian-recent); new `detail` param with non-silent abbreviation
#   (+SR-032). Read-time guidance extended to say a session is reported as ONE
#   account (SR-022 amended).
# The server GROUPS and never merges: merging is semantic and the server holds no
# model (INV-6); rewriting on the way out would launder the record (COR-A-012).
# No record schema change (session-record@1 untouched), no storage change, no
# migration — grouping works on existing records because session_id is already
# stored. Desirability-gate clock NOT restarted, but note SCN-004 instrumentation
# now measures a changed output shape: the ~2026-08-09 verdict reads across both.
# v3.4.0 (minor, additive): wish-log finding #5 (2026-07-27, "ambient capture
# can't work for anyone but Robin"), HITL-approved 2026-07-27. An audit of the
# shipped SERVER_INSTRUCTIONS found it carried the STYLE contract (SR-021) and
# read-time guidance (SR-022) but NOT the emission trigger and NOT the literal
# directive syntax — both existed only in a hand-installed ~/.claude/CLAUDE.md
# rule, so ambient capture structurally worked for one person. SCN-006 extended:
# +SR-025 (trigger), SR-026 (syntax), SR-027 (single in-repo source; README and
# docs quote it and a drift test fails if they diverge), SR-028 (install requires
# no user-authored contract text; hook registration stays external but scripted).
# Also +SR-029: an unfilled <angle-bracketed> template summary is treated as no
# directive, since shipping the syntax widely makes copy-without-filling a real
# path. No record schema change, no output-shape change, no idempotence change.
# Desirability-gate clock NOT restarted (verdict stays ~2026-08-09).
# v3.3.0 (minor): wish-log finding #4 (2026-07-27, replicative entries), HITL-
# approved 2026-07-27 (constitution escalation trigger 1 — capture semantics).
# Fix (a) of that finding ONLY: a referenced note's CONTENT HASH no longer
# participates in idempotence identity (+SR-024, SCN-001/AC-idempotence amended),
# so a directive re-fired after the referenced file was edited again is still the
# same directive and still a byte-identical no-op. Identity is now session id +
# inert summary + ref PATH set; hashes are still recorded, just inert for
# identity — the same treatment SR-018 already gives workspace provenance. This
# NARROWS identity (strictly more dedupe, never less) and cannot merge entries
# whose summaries differ, so no distinct recalled meaning can be lost. The
# revision half of that finding (incremental capture + read-time collapse) is
# deliberately NOT in this version — it changes the capture contract and is
# specced separately. No record schema change (session-record@1 untouched), no
# retrofit of existing records. Desirability-gate clock NOT restarted (verdict
# stays ~2026-08-09).
# v3.2.0 (minor, additive): wish-log finding #3 (2026-07-26, output clarity),
# HITL-approved 2026-07-27 (constitution escalation trigger 1 — capture semantics).
# SCN-007: recorded memory reads clearly at recall time — a plain-language style
# contract for authoring session summaries travels in the capture directive rule
# and the server-level instructions, plus read-time rendering guidance covering
# pre-contract records; the server itself stores every directive verbatim and
# never rewrites, truncates, or rejects on style (INV-6). +SR-021..023. No record
# schema change (session-record@1 untouched), no retrofit of existing records
# (read-time guidance covers them), idempotence identity unchanged. Desirability-
# gate clock NOT restarted (HITL: stateful behaviors under measurement unchanged;
# verdict stays ~2026-08-09). Dissents 0001/0002/0004 checked: 0 reactivations.
# v3.1.0 (minor, additive): wish-log findings #1/#2 (2026-07-25), HITL-approved
# 2026-07-26 (constitution escalation trigger 1 — capture semantics). SCN-005:
# session entries carry automatically-derived workspace provenance (cwd, project
# name, repo identity) so records are legible across projects; SCN-006: the server
# carries its own client-adoption guidance (MCP server instructions) and
# librarian-recent displays/filters by project. +SR-015..020; SR-101 guard widened
# to cover provenance as untrusted input. Record schema stays session-record@1
# (additive-optional field; old records remain valid; dissent-0002 checked, NOT
# reactivated). Desirability-gate clock restarts at this ship.
# v3.0.0 (major): SCN-001 amended — post-ship dogfooding proved the Claude Code Stop
# event fires at the END OF EVERY ASSISTANT TURN (and around clear/compact), not only
# at session termination. Capture is now specified idempotent per distinct directive:
# SR-001 revised, SR-013 (idempotence) + SR-014 (revision append) added. HITL-approved.
# v2.0.1 (patch): mapping-pending cleared — eval suite 0.2.0 populated every
# SCN/SR/INV mapping (86 tasks, 19 datasets, 12 graders). No semantic change.
# v2.0.0: constitution amendment (accessibility→documentation eval dimension).
# No SCN/SR/INV semantics changed — major bump forced by constitution-change rule.
layers:
  scenarios: SCN-*   # product-facing primary layer
  requirements: SR-* # derived / non-functional normative layer
  invariants: INV-*  # stronger-than-SR, must hold across all implementations
---

# Spec: S1.5 — Ambient Memory-of-Use Capture

## Purpose

S1.5 is the first *stateful* slice of the Librarian: the first behavior a stateless
assistant cannot have — memory that accrues by itself and surfaces the right thing
later. S1 (shipped) proved retrieval; retrieval is explicitly **not** the product.
The product is the **memory-of-use**: how Robin engaged the store over time.

S1.5 exists to answer one question cheaply, behind a kill gate: *does ambient
memory-of-use pull Robin toward stateful behavior at all?* It captures a single
curated line per Claude Code session, stores it durably as memory-of-use, lets Robin
recall recent work, and quietly enriches search with prior-engagement signals. It
builds the minimal instrumentation to measure the desirability gate and nothing more.

This spec fixes the **observable contract** of that slice. Where the design leaves a
genuine mechanism open (the exact Claude Code Stop-hook wiring; the depth of
appraisal), this spec constrains the observable behavior and records the openness —
it does not fabricate mechanism detail.

## Scope

### In scope
- **Ambient capture** at session end: a Claude Code Stop hook appends one curated
  "what did this session decide/produce?" line to a session record the librarian reads.
  (The hook wiring is an open spike; this spec fixes only the observable result.)
- **Storage** of session records as memory-of-use in `_librarian/sessions/<date>.md`:
  durable git-committed markdown, mdbase-compatible frontmatter, referencing store
  items by versioned identity (path + content-hash / git ref) where applicable.
- **New tool `librarian-recent`**: "what was I working on lately?" answered from
  session records with dates and provenance.
- **Search enrichment**: `librarian-search` results quietly annotated with a
  prior-engagement signal when a session record references the matching note.
- **Gate instrumentation**: minimal local logging of stateful-tool use sufficient to
  measure "Robin reaches for stateful behavior unprompted ≥3×/week for 2 weeks."
- **Workspace provenance** *(v3.1.0)*: each captured entry automatically records the
  workspace it came from (working directory, derived project name, repository identity
  where resolvable) so records stay legible across concurrent projects;
  `librarian-recent` displays it and can filter by project.
- **Client adoption guidance** *(v3.1.0)*: the server declares MCP server-level
  instructions telling connected clients when to reach for the librarian's stateful
  tools — guidance travels with the server, never with per-repo client config.
- **Recall clarity** *(v3.2.0)*: a plain-language style contract for session
  summaries, carried in the capture directive rule and the server-level
  instructions (authoring side), plus read-time guidance directing clients to
  report recalled summaries in plain language (covers pre-contract records).
  Instruction-to-client only — the server stores directives verbatim and never
  enforces style.

### Out of scope (boundaries)
- Full-transcript ingestion / conversation-as-acquisition (H3).
- Bitemporal `facts` / `note_links` tables, belief-change tracking (H2).
- Marginalia / Obelus graded reversible marks (H2).
- Pinakes tier / safe-forgetting fingerprints (H2).
- GRADE-style reasoned confidence and reliability × corroboration grading (H2).
- Embeddings / Ollama / semantic recall (H2).
- Detecting that a store note *changed under you* (H2 — S1.5 only *records* the
  versioned ref; it does not act on drift).
- Remote hosting, HTTP transport, OAuth, ChatGPT write-back (deferred indefinitely).
- Multi-user, governance, classification, permissions.
- Adopting mdbase itself (S1.5 only shapes frontmatter to be compatible).

---

## Behavioral scenarios

### SCN-001: A session's outcome is captured ambiently, exactly once per distinct directive
**Given** Robin is working in a Claude Code session with the librarian registered and
the Stop hook installed
**When** a Stop event fires — which Claude Code does at the end of **every** assistant
turn and around clear/compact, not only at session termination (v3.0.0 correction from
post-ship observation)
**Then** the librarian's session record for that day shall reflect exactly one summary
entry per **distinct** session directive — capturing a newly seen directive, treating
an unchanged directive as a no-op, and appending a revision when the session's
directive has changed — referencing any store notes touched by versioned identity,
with no proactive action required from Robin.

**Acceptance criteria:**
- After a session that produced a decision, `_librarian/sessions/<YYYY-MM-DD>.md`
  contains exactly one entry per distinct directive from that session (not the raw
  transcript, and not one entry per Stop firing).
- **Idempotence:** a repeat capture for the same session with an unchanged directive
  (identical normalized summary and identical set of referenced note *paths*) appends
  nothing and leaves the record byte-identical — regardless of how many Stop events
  fire, and regardless of whether a referenced note's contents changed between
  firings (v3.3.0: content hashes are recorded but inert for identity, per SR-024).
- **Revision:** a capture for the same session with a changed directive appends a new
  entry for that session; earlier entries are preserved, never overwritten or deleted.
- *(v3.5.0)* **Incremental authoring:** the contract instructs a client that a later
  directive in the same session shall describe only what is new since its previous
  one, not restate it. This is what makes the appended entries *steps* rather than
  near-duplicate revisions; it is guidance, so a client that restates anyway is still
  stored verbatim (SR-023) and the record is merely noisier, never wrong.
- A summary entry that names a store note records that note by vault-relative path
  plus a content-hash or git ref captured as-read (not path alone).
- A session that yields no summary (empty/failed hook) adds no entry and creates no
  empty record file; existing entries are unchanged.
- Capture requires zero explicit user action within the session (ambient).

**Derived requirements:** SR-001 (revised), SR-002, SR-003, SR-004, SR-013, SR-014,
SR-024, SR-029, SR-033

---

### SCN-002: Robin recalls recent work with `librarian-recent`
**Given** one or more session records exist in `_librarian/sessions/`
**When** Robin invokes `librarian-recent` (optionally with a time window or count)
**Then** the system shall return recent work in reverse-chronological order, grouped
into **sessions** (v3.5.0 — the unit of recall is the session, not the Stop firing),
each session carrying its date span and each of its steps with that step's provenance.

**Acceptance criteria:**
- Results are ordered most-recent-first by session date; a session is ranked by its
  most recent step.
- Each returned step shows its date and the versioned provenance of referenced notes.
- With no session records present, the tool returns an explicit empty-state message,
  not an error or an empty/ambiguous response.
- *(v3.5.0)* **Grouped:** all steps recorded by one session in one project are
  returned together, oldest-first within the session, and none are dropped. A session
  that moved between projects splits by project; a step carrying no session id forms
  its own single-step session; a session straddling UTC midnight is one session with a
  date span rather than two halves.
- *(v3.5.0)* **Count caps sessions.** A supplied count limits the number of sessions
  returned, not the number of steps, so one chatty session cannot consume the whole
  budget and hide every other session. *(Breaking change for existing callers.)*
- *(v3.5.0)* **Detail is explicit.** A supplied detail level may return an abbreviated
  view of each session (first and last step), and when it does the result states the
  true total and marks itself abbreviated — abbreviation is never silent, and the
  default is unabbreviated.
- *(v3.5.0)* **Steps are grouped, never merged.** The returned text of every step is
  the stored text; no summarizing, deduplication, or rewriting happens on the read
  path (INV-6, and COR-A-012's laundering guard applies unchanged).

**Derived requirements:** SR-005, SR-006, SR-007, SR-030, SR-031, SR-032

---

### SCN-003: Search results are quietly enriched with prior engagement
**Given** a session record references a note that matches a later search
**When** Robin runs `librarian-search` and that note appears in the results
**Then** the system shall annotate that one result with a prior-engagement signal
(what Robin concluded/touched and when) — and shall stay silent on results with no
prior engagement, without changing ranking.

**Acceptance criteria:**
- A result whose note is referenced by a session record carries a prior-engagement
  annotation naming the prior engagement and its date.
- A result with no referencing session record carries no annotation (quiet when
  unprompted — no nagging, no empty "not seen before" noise).
- The annotation is additive metadata only; result set and ranking order are
  identical to the un-enriched S1 search for the same query.

**Derived requirements:** SR-008, SR-009, SR-010

---

### SCN-004: Stateful use is instrumented so the desirability gate is measurable
**Given** the desirability gate is "Robin reaches for stateful behavior unprompted
≥3×/week for 2 weeks"
**When** Robin invokes a stateful behavior (`librarian-recent`, or a search that
surfaces a prior-engagement signal)
**Then** the system shall record a local, timestamped stateful-use event and expose a
per-ISO-week count sufficient to evaluate the gate.

**Acceptance criteria:**
- Each `librarian-recent` invocation appends one timestamped event to a local
  stateful-use log.
- Each `librarian-search` call that surfaces at least one prior-engagement signal
  appends one timestamped event.
- The log yields a per-ISO-week stateful-use count over any date range.
- (Open) Classifying an invocation as *unprompted* is deferred to manual wish-log
  review; instrumentation captures all invocations with timestamps to support it.

**Derived requirements:** SR-011, SR-012

---

### SCN-005: Captured entries carry workspace provenance, derived automatically
**Given** Robin works across several efforts in a day (different repos, folders,
projects) and the Stop hook fires from a Claude Code session running in some working
directory
**When** a session directive is captured
**Then** the resulting entry shall carry workspace provenance — the working directory,
a project name derived automatically from it, and the repository remote identity where
resolvable by local file reads — with zero explicit user action, so that any later
reader can tell which effort a record belongs to without standing in its folder.

**Acceptance criteria:**
- An entry captured with a working directory available records `workspace` provenance:
  the directory, an automatically derived project name (no user-supplied naming —
  requiring one would break SCN-001's ambient contract), and the repository remote
  identity when resolvable.
- Repository identity is resolved by local filesystem reads only — no subprocess, no
  network (INV-1).
- A capture with no working directory available, or with unresolvable repository
  identity, omits the missing fields and completes normally — provenance never blocks
  or fails a capture.
- The `workspace` field is **additive-optional** on `session-record@1`: records
  written before v3.1.0 (no `workspace`) remain valid; no migration, no schema-id
  bump. *(Dissent-0002 checked against this change: not reactivated.)*
- Idempotence identity is unchanged: a repeat capture with an unchanged directive
  stays a byte-identical no-op regardless of provenance (SR-013 keys on directive
  content, not workspace).
- Provenance values are stored and rendered as inert text (SR-101 applies).

**Derived requirements:** SR-015, SR-016, SR-017, SR-018

---

### SCN-006: The librarian teaches its clients when to reach for memory
**Given** a fresh MCP client connects to the librarian (any client, any project,
no librarian-specific configuration on the client side)
**When** the client considers how to answer a recency question ("what was I working
on?") or a prior-engagement question ("have I seen this before?")
**Then** the server's own declared guidance shall direct it to the stateful tools
(`librarian-recent`, `librarian-search`) before reading files directly — and
`librarian-recent` shall present each entry's project and accept a project filter, so
cross-project recall is usable once provenance exists.

**Acceptance criteria:**
- The server declares MCP server-level `instructions` naming `librarian-recent` for
  recency questions and `librarian-search` for prior-engagement/content questions,
  to be consulted before direct file reads. The guidance ships with the server —
  no CLAUDE.md or other per-repo client configuration is required anywhere.
- `librarian-recent` output shows each entry's project name when the entry carries
  workspace provenance (quiet on entries without it — no placeholder noise).
- A supplied project filter restricts `librarian-recent` results to entries whose
  project name matches case-insensitively; entries without provenance are excluded
  from filtered results, never fabricated into a match.
- Result ordering and instrumentation (SCN-004) are unchanged by display or filter.
- *(v3.4.0)* **Capture works with no user-authored contract text.** The declared
  instructions carry everything a client needs to leave a summary: that one should be
  emitted and when, the literal directive syntax, and how to write it. A user who
  registers the Stop hook and connects the server gets working capture without adding
  any rule to `CLAUDE.md` or equivalent.
- *(v3.7.0)* **The trigger is per outcome, and says so once.** The instructions ask for
  a line per separable thing as it lands, and nowhere state or imply one-per-session
  count or end-of-session timing — the two framings cannot both appear, because a
  client told to send one line at the end will pack a session into it.
- *(v3.4.0)* **The contract has one in-repo source.** `SERVER_INSTRUCTIONS` is
  authoritative; README and `docs/memory-of-use.md` quote it verbatim rather than
  restating it, and a divergence between them is a test failure.

**Derived requirements:** SR-019, SR-020, SR-025, SR-026, SR-027, SR-028

---

### SCN-007: Recorded memory reads clearly at recall time
**Given** a session summary is authored at capture time by a session deep in its own
context (its own codenames, version tags, and shorthand) and read later — by Robin or
by an assisting client — with none of that context available
**When** a client authors a `librarian-session` directive, and when a client reports
recalled summaries to the user
**Then** the system's own guidance shall carry a plain-language style contract for
authoring summaries and shall direct clients to render recalled summaries in plain
language — while the server itself stores every directive verbatim, never rewriting,
truncating, or rejecting one on style grounds.

The style contract (normative content, wording may vary): *write the summary for a
smart reader in a hurry who was not in this session* — lead with what was decided or
produced; use common words over session shorthand; expand or avoid codenames,
version tags, and abbreviations the session invented (terms the vault itself uses
are fine); aim for about 40 words and stop by 60 — one line, no build-log density;
and where a session did several separable things, a line for each as it finishes
rather than one long line at the end.

**Acceptance criteria:**
- *(v3.6.0)* **The length budget is a number.** The style contract states an explicit
  word target and ceiling, and the numbers it states are the same ones the capture
  path reports against — a contract whose budget and code disagree is drift, and the
  tests fail on it.
- *(v3.6.0)* **Reported, never enforced.** An over-budget summary is stored
  byte-verbatim, the record body carries no word-count annotation, and the capture
  path reports the overage as a diagnostic. Length is never grounds for rewriting,
  truncating, or rejecting (this is SR-023 applied to length specifically). The only
  hard bound on a summary remains the SR-101 oversized-input guard, which exists for
  an unrelated reason and the advisory ceiling stays well inside it.
- The server-level `instructions` include the authoring style contract for
  `librarian-session` summary directives (all four elements: later-reader framing,
  lead-with-outcome, common-words-over-shorthand, expand-session-jargon).
- The server-level `instructions` direct clients to report recalled session
  summaries (`librarian-recent` output, prior-engagement annotations) in plain
  language for the asking reader — explicitly covering records authored before this
  contract existed (no retrofit of stored records; read-time guidance is the only
  layer that reaches them).
- The client-side capture directive rule (currently the global CLAUDE.md line)
  states the same style requirement — verified at ship as a deployment step, like
  the Stop-hook install.
- A captured directive is stored byte-verbatim regardless of style: the server
  never rewrites, truncates, or rejects a summary on style grounds (no model in the
  server, INV-6; no data loss).
- Existing session records are not migrated, edited, or re-summarized (INV-3).
- Capture identity and idempotence (SR-013), record schema (`session-record@1`),
  result ordering, and instrumentation (SCN-004) are all unchanged.

**Derived requirements:** SR-021, SR-022, SR-023

---

## Requirements

EARS notation is mandatory. Scenario-derived SRs name their parent. Non-functional
SRs (SR-100+) have no parent.

### Functional (scenario-derived)

- **SR-001** — When a Stop event fires and the session transcript contains a
  `librarian-session` directive not yet recorded for that session, the capture
  mechanism shall append exactly one session-summary entry to that day's session
  record. *(event-driven)* `# ← SCN-001; revised v3.0.0`
- **SR-002** — When a session summary is captured, the system shall persist it in
  `_librarian/sessions/<YYYY-MM-DD>.md` as durable markdown with mdbase-compatible
  frontmatter. *(event-driven)* `# ← SCN-001`
- **SR-003** — When a captured summary references a store note, the system shall
  record that reference by versioned identity (vault-relative path plus content-hash
  or git ref captured as-read), not by path alone. *(event-driven)* `# ← SCN-001`
- **SR-004** — If a session yields no summary content, then the system shall append
  no entry and shall not create an empty session-record file. *(unwanted-behavior)*
  `# ← SCN-001`
- **SR-005** — When `librarian-recent` is invoked, the system shall return session
  summaries in reverse-chronological order, each with its date and the versioned
  provenance of referenced notes. *(event-driven)* `# ← SCN-002`
- **SR-006** — Where a time window or count limit is supplied to `librarian-recent`,
  the system shall restrict results to that window or limit. *(optional-feature)*
  `# ← SCN-002`
- **SR-007** — If no session records exist when `librarian-recent` is invoked, then
  the system shall return an explicit empty-state message rather than an error.
  *(unwanted-behavior)* `# ← SCN-002`
- **SR-008** — When `librarian-search` returns a note referenced by a session record,
  the system shall annotate that result with a prior-engagement signal naming the
  prior engagement and its date. *(event-driven)* `# ← SCN-003`
- **SR-009** — If a returned search result has no referencing session record, then the
  system shall return it with no prior-engagement annotation. *(unwanted-behavior)*
  `# ← SCN-003`
- **SR-010** — The prior-engagement annotation shall be additive metadata only and
  shall not alter search result membership or ranking order. *(ubiquitous)*
  `# ← SCN-003`
- **SR-011** — When a stateful behavior is invoked (`librarian-recent`, or a search
  that surfaces ≥1 prior-engagement signal), the system shall append one timestamped
  stateful-use event to a local instrumentation log. *(event-driven)* `# ← SCN-004`
- **SR-012** — The system shall expose a per-ISO-week count of stateful-use events
  over an arbitrary date range, sufficient to evaluate the ≥3×/week-for-2-weeks gate.
  *(ubiquitous)* `# ← SCN-004`
- **SR-013** — If a capture invocation carries a session id and directive content
  identical (after inert-line normalization) to an entry already recorded for that
  session, then the system shall append nothing and leave the session record
  byte-identical. *(unwanted-behavior)* `# ← SCN-001; added v3.0.0`
- **SR-014** — When a capture invocation carries an already-recorded session id but a
  changed directive, the system shall append a new entry for that session, preserving
  all earlier entries. *(event-driven)* `# ← SCN-001; added v3.0.0`
- **SR-015** — When a capture invocation carries a working directory, the capture
  mechanism shall record workspace provenance on the resulting entry — the working
  directory, a project name derived automatically from it, and the repository remote
  identity where resolvable — with zero explicit user action. *(event-driven)*
  `# ← SCN-005; added v3.1.0`
- **SR-016** — If the working directory is absent or the repository identity is
  unresolvable, then the system shall omit the missing provenance fields and complete
  the capture normally (provenance never blocks or fails a capture).
  *(unwanted-behavior)* `# ← SCN-005; added v3.1.0`
- **SR-017** — Repository-identity resolution shall use only local filesystem reads;
  it shall spawn no subprocess and make no network call. *(ubiquitous)*
  `# ← SCN-005; added v3.1.0; refines INV-1`
- **SR-018** — Workspace provenance shall not participate in idempotence identity: a
  capture whose directive content is unchanged per SR-013 shall remain a
  byte-identical no-op regardless of provenance differences. *(ubiquitous)*
  `# ← SCN-005; added v3.1.0`
- **SR-019** — When `librarian-recent` returns entries, each entry carrying workspace
  provenance shall display its project name; where a project filter is supplied, the
  system shall return only entries whose project name matches case-insensitively,
  excluding (never fabricating a match for) entries without provenance.
  *(event-driven + optional-feature)* `# ← SCN-006; added v3.1.0`
- **SR-020** — The server shall declare MCP server-level instructions that direct
  connected clients to invoke `librarian-recent` for recency questions and
  `librarian-search` for prior-engagement/content questions before reading files
  directly. *(ubiquitous)* `# ← SCN-006; added v3.1.0`
- **SR-021** — The server-level instructions shall include a plain-language
  authoring style contract for `librarian-session` summary directives: write for a
  later reader without this session's context, lead with what was decided or
  produced, prefer common words over session shorthand, expand or avoid
  session-local codenames and abbreviations, and keep to a stated word budget —
  an explicit target and ceiling — directing a session that did several separable
  things to emit a line for each rather than one long line.
  *(ubiquitous)* `# ← SCN-007; added v3.2.0; amended v3.6.0 (word budget)`
- **SR-022** — The server-level instructions shall direct clients to report
  recalled session summaries in plain language for the asking reader, including
  records authored before v3.2.0. *(ubiquitous)* `# ← SCN-007; added v3.2.0`
- **SR-023** — If a captured directive's summary violates the style contract, then
  the system shall store it byte-verbatim regardless: the server shall never
  rewrite, truncate, or reject a directive on style grounds. *(unwanted-behavior)*
  `# ← SCN-007; added v3.2.0; refines INV-6`
- **SR-025** — The server-level instructions shall state that a session summary
  directive is to be emitted, and when: one line for each separable thing a session
  decides or produces, emitted as that thing lands rather than accumulated for the end
  of the session, and omitted entirely for trivial work.
  *(event-driven)* `# ← SCN-006; added v3.4.0; amended v3.7.0 (per-outcome trigger)`
- **SR-035** — The server-level instructions shall not state or imply that a session
  emits a single directive, nor that directives are emitted at session end: no
  one-per-session count and no end-of-session timing. *(unwanted-behaviour)*
  `# ← SCN-006; added v3.7.0; guards SR-025 against SR-033/SR-021`
- **SR-026** — The server-level instructions shall include the literal directive
  syntax the capture path parses, so a client that has never read the repository docs
  can emit a well-formed directive. *(ubiquitous)* `# ← SCN-006; added v3.4.0`
- **SR-027** — `SERVER_INSTRUCTIONS` shall be the single source of the capture
  contract: any other in-repo copy (README, `docs/memory-of-use.md`) shall quote it
  verbatim, and the system's tests shall fail if a copy diverges from it.
  *(unwanted-behavior)* `# ← SCN-006; added v3.4.0`
- **SR-028** — Enabling ambient capture shall require no user-authored contract text
  in client configuration. Registering the Stop hook may remain external — MCP cannot
  install a hook — but shall be scriptable from the repository. *(ubiquitous)*
  `# ← SCN-006; added v3.4.0`
- **SR-029** — If a directive's summary is an unfilled template (wrapped in angle
  brackets), then the system shall treat it as no directive and capture nothing,
  rather than storing the template text as a summary. *(unwanted-behavior)*
  `# ← SCN-001; added v3.4.0`
- **SR-030** — `librarian-recent` shall return entries grouped into sessions, keyed by
  session id and project, ordered newest-session-first by each session's most recent
  step, with steps oldest-first within a session and no step omitted. A step with no
  session id shall form its own single-step session. *(event-driven)*
  `# ← SCN-002; added v3.5.0`
- **SR-031** — A supplied count shall limit the number of SESSIONS returned, not the
  number of steps. *(event-driven)* `# ← SCN-002; added v3.5.0; BREAKING`
- **SR-032** — When an abbreviated detail level is requested, the result shall report
  each session's true step total and mark itself abbreviated; the system shall never
  omit steps silently, and the unabbreviated view shall be the default.
  *(unwanted-behavior)* `# ← SCN-002; added v3.5.0`
- **SR-033** — The capture contract shall instruct that a directive emitted later in a
  session describes only what is new since that session's previous directive, and does
  not restate it. *(ubiquitous)* `# ← SCN-001; added v3.5.0; refines SR-021`
- **SR-034** — If a captured summary exceeds the style contract's stated word ceiling,
  then the capture path shall report its word count and the contract's budget as a
  diagnostic, and shall store the summary byte-verbatim with no annotation on the
  record. The word budget shall be advisory only: the system shall never rewrite,
  truncate, or reject a directive on length grounds, and the stated ceiling shall
  remain inside the SR-101 bound. *(unwanted-behaviour)*
  `# ← SCN-007; added v3.6.0; refines SR-023`
- **SR-024** — A referenced note's content hash shall not participate in idempotence
  identity: a repeat capture for the same session whose summary and referenced note
  paths are unchanged shall remain a byte-identical no-op even if a referenced note's
  contents changed between Stop firings. The hash shall still be recorded on the
  entry, and the FIRST-read hash shall be retained (the no-op writes nothing, so the
  stored identity stays the version captured as-read). *(unwanted-behavior)*
  `# ← SCN-001; added v3.3.0; refines SR-013, mirrors SR-018`

### Non-functional (no scenario parent)

- **SR-100** — Session-record frontmatter shall conform to a typed schema compatible
  with mdbase collection validation, so that adopting mdbase at H2 is a drop-in.
  *(ubiquitous)*
- **SR-101** — If a captured session summary, a referenced identity, or a workspace
  provenance value contains markup, control characters, YAML-control content, or
  path-traversal sequences, then the system shall store and render it as inert text
  (no execution, no frontmatter injection, no traversal outside `_librarian/`).
  *(unwanted-behavior)* `# guard widened to provenance @ v3.1.0`
- **SR-102** — If session content or vault content would be committed to the code
  repository, then the system shall prevent it (memory-of-use lives in the vault /
  its own overlay repo, never in the code repo). *(unwanted-behavior)*
- **SR-103** — When a development stage ships (a spec version's behavior is
  implemented and released), the project shall update the user-facing "how-to"
  documentation (`README.md` / `docs/`) to cover every new or changed user-visible
  behavior in that stage. *(event-driven)* `# added at HITL approval, 2026-07-25`

---

## Traceability

| Scenario | Acceptance criteria → | Derived SRs | Related INV | Dataset (pending) | Grader (pending) |
|----------|------------------------|-------------|-------------|-------------------|------------------|
| SCN-001 | capture, idempotence, revision, storage, versioned ref, empty no-op, unfilled template, incremental authoring | SR-001, SR-002, SR-003, SR-004, SR-013, SR-014, SR-024, SR-029, SR-033 | INV-2, INV-3 | correctness-real-v1 | correctness |
| SCN-002 | order, provenance, window, empty-state, grouped, count-caps-sessions, detail, never-merged | SR-005, SR-006, SR-007, SR-030, SR-031, SR-032 | INV-6 | correctness-real-v1 | correctness |
| SCN-003 | annotate, quiet, no re-rank | SR-008, SR-009, SR-010 | — | correctness-real-v1 | correctness |
| SCN-004 | log events, weekly count | SR-011, SR-012 | INV-4 | correctness-real-v1 | correctness |
| SCN-005 | auto provenance, local-reads-only, never-blocks, additive-optional, dedupe-unchanged, inert | SR-015, SR-016, SR-017, SR-018 | INV-1, INV-2 | correctness-real-v1, security-adv-v1 | correctness, security |
| SCN-006 | server instructions, project display, project filter, no-behavior-drift, no-user-authored-contract, single-source, per-outcome-trigger | SR-019, SR-020, SR-025, SR-026, SR-027, SR-028, SR-035 | — | correctness-real-v1 | correctness |
| SCN-007 | authoring contract in instructions, read-time render guidance, directive-rule deployment, verbatim storage, no retrofit, no-behavior-drift, length-budget | SR-021, SR-022, SR-023, SR-034 | INV-3, INV-6 | correctness-real-v1, correctness-adv-v1 | correctness |
| — | mdbase-compatible frontmatter | SR-100 | — | schema-real-v1 | schema-conformance |
| — | untrusted-input handling | SR-101 | INV-2 | adversarial-input-v1 | safety |
| — | repo hygiene | SR-102 | — | repo-hygiene-v1 | safety |
| — | docs currency at ship | SR-103 | — | docs-currency-real-v1 | docs-currency |
| — | local-first | (INV-1) | INV-1 | adversarial-network-v1 | invariant-local-first |
| — | store immutability | (INV-2) | INV-2 | adversarial-write-v1 | invariant-store-immutable |
| — | no hard-delete | (INV-3) | INV-3 | adversarial-delete-v1 | invariant-no-hard-delete |
| — | rebuildability | (INV-4) | INV-4 | rebuild-real-v1 | invariant-rebuildable |
| — | stdout purity | (INV-5) | INV-5 | adversarial-stdout-v1 | invariant-stdout-pure |
| — | no LLM in server | (INV-6) | INV-6 | adversarial-inference-v1 | invariant-no-llm |

---

## Invariants

`INV-*` are stronger than `SR-*`: they must hold across every valid implementation and
every generation. Each requires a dedicated grader (not shared with an SR grader), a
real + adversarial dataset pair, and a threshold of **1.0** (no failure tolerance).

- **INV-1 — Local-first / no egress.** All capture, storage, and retrieval shall use
  only the local filesystem; the librarian shall make no network calls during any
  operation. Nothing leaves the machine.
- **INV-2 — Store immutability.** The librarian shall write only within `_librarian/`
  and `data/`; it shall never create, modify, or delete store (vault) content.
- **INV-3 — No hard-delete of memory-of-use.** Session records shall only be appended,
  archived, or invalidated; the system shall never hard-delete a memory-of-use record.
- **INV-4 — Rebuildability.** The SQLite index shall be fully reconstructible from the
  vault plus `_librarian/`; no load-bearing state shall exist only in the DB, and a
  delete-and-rebuild shall preserve all session-record-derived behavior.
- **INV-5 — Stdout purity under stdio.** Under stdio transport the server shall emit
  only MCP protocol frames on stdout; all diagnostics go to stderr.
- **INV-6 — No LLM in the server.** The server shall perform no model inference; all
  reasoning and summary generation is the client's. The server is code + storage.

---

## Conformance tests

**Status: mapping-pending.** No `evals/` datasets or graders exist yet (S1.5 is the
first spec). This spec seeds the correctness dataset from the scenario acceptance
criteria and names the graders/datasets each SR and INV will map to (see Traceability
and `evals/harness.yaml` draft). Before `flow-generate` may proceed, `flow-eval` must:

1. Create the correctness dataset (`correctness-real-v1`) with one task per acceptance
   criterion across SCN-001…SCN-004.
2. Create the non-functional datasets/graders (schema, safety, repo hygiene).
3. Create the six INV grader + real/adversarial dataset pairs at threshold 1.0.

Until then every mapping carries `mapping-pending: true`. This spec is not to be
finalized without an explicit `mapping-pending` acknowledgment from the orchestrator.

---

## Glossary

- **Store** — the knowledge content itself (Robin's Obsidian vault of `*.md` notes; or
  a shared vault). Objective, shareable, the source of truth. The librarian reads it
  but never mutates it.
- **Memory-of-use** — how a specific person engaged the store: what they looked at,
  concluded, connected, kept, or forgot. Subjective and inherently personal even over
  a shared store. **The product.** Lives in `_librarian/`.
- **Session record** — a durable markdown file at `_librarian/sessions/<YYYY-MM-DD>.md`
  holding one curated summary line per Claude Code session (the S1.5 unit of
  memory-of-use), with mdbase-compatible frontmatter.
- **Versioned ref (versioned identity)** — a reference to a store item by durable
  identity: vault-relative path plus a content-hash or git ref captured as-read, so
  the reference survives the store changing underneath it.
- **Ambient capture** — memory that accrues without user proactivity: it records a
  session's outcome at session end via a hook, not by the user routing actions through
  the librarian. (Contrast the rejected tool-call log, which is search-on-demand, not
  memory.)
- **Appraisal** — the judgment that keeps captured memory good rather than noise
  (avoiding the collector's fallacy). In S1.5 appraisal is light/ambient: one curated
  line per session, not the raw transcript. Deeper appraisal (grading, forgetting) is
  H2.
- **Stop event** — the Claude Code hook event the capture mechanism is wired to. It
  fires at the end of *every* assistant turn and around clear/compact — not only at
  session termination (v3.0.0; confirmed by post-ship observation). This is why
  capture must be idempotent per distinct directive, not merely once-per-session.
- **Workspace provenance** — the automatically derived record of *where* a session
  happened: the working directory, a project name extracted from it (never
  user-supplied — that would break ambient capture), and the repository remote
  identity when resolvable by local file reads. Additive-optional on
  `session-record@1`; makes records legible across concurrent projects. *(v3.1.0)*
- **Style contract (recall clarity)** — the plain-language authoring requirement for
  session summaries: written for a smart reader in a hurry who was not in the
  session — lead with the outcome, common words over session shorthand, expand
  session-local jargon. Carried in the capture directive rule and the server-level
  instructions; read-time guidance covers pre-contract records. Instructional only —
  the server stores directives verbatim and never enforces style. *(v3.2.0)*
- **Stateful behavior** — a librarian behavior that depends on accrued memory-of-use:
  `librarian-recent`, and search results carrying prior-engagement signals. The
  desirability gate measures Robin reaching for these unprompted.

---

## Architectural context

*(Context, not normative — for agents reading the spec. See DESIGN.md / HANDOFF.md.)*

- **Stack:** TypeScript ESM, Node ≥22, `node:sqlite` (built-in, FTS5, zero native
  deps — chosen because `better-sqlite3` does not compile on the current Node/V8),
  gray-matter, Zod, `@modelcontextprotocol/sdk`, npm. MCP server over **stdio**.
- **Three storage layers:** (1) **store** — vault `*.md`, source of truth, git-backed,
  read-only to the librarian; (2) **`_librarian/` memory-of-use** — `*.md`, durable,
  git-committed, human-legible, where session records live; (3) **SQLite index**
  (`data/librarian.db`) — disposable cache, rebuilt from (1)+(2). The `_librarian/`
  directory is already reserved and excluded from the S1 FTS index.
- **S1 (shipped, not re-specced here):** FTS5 search + two read-only tools
  (`librarian-search`, `librarian-get-note`). S1.5 adds capture, storage, and
  `librarian-recent`, and enriches `librarian-search` output.
- **Server holds state; the client is the brain** — the server contains no LLM
  (INV-6). Summary generation is the connected client's; the server stores and serves.
