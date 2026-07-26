---
version: "3.1.0"
status: active
effort: s1-5-ambient-capture
last-amended: 2026-07-26
mapping-pending: false
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
  (identical normalized summary and refs) appends nothing and leaves the record
  byte-identical — regardless of how many Stop events fire.
- **Revision:** a capture for the same session with a changed directive appends a new
  entry for that session; earlier entries are preserved, never overwritten or deleted.
- A summary entry that names a store note records that note by vault-relative path
  plus a content-hash or git ref captured as-read (not path alone).
- A session that yields no summary (empty/failed hook) adds no entry and creates no
  empty record file; existing entries are unchanged.
- Capture requires zero explicit user action within the session (ambient).

**Derived requirements:** SR-001 (revised), SR-002, SR-003, SR-004, SR-013, SR-014

---

### SCN-002: Robin recalls recent work with `librarian-recent`
**Given** one or more session records exist in `_librarian/sessions/`
**When** Robin invokes `librarian-recent` (optionally with a time window or count)
**Then** the system shall return recent session summaries in reverse-chronological
order, each carrying its date and provenance (the store items it references).

**Acceptance criteria:**
- Results are ordered most-recent-first by session date.
- Each returned entry shows its date and the versioned provenance of referenced notes.
- A supplied window (e.g. last 7 days) or count limit restricts results accordingly.
- With no session records present, the tool returns an explicit empty-state message,
  not an error or an empty/ambiguous response.

**Derived requirements:** SR-005, SR-006, SR-007

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

**Derived requirements:** SR-019, SR-020

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
| SCN-001 | capture, idempotence, revision, storage, versioned ref, empty no-op | SR-001, SR-002, SR-003, SR-004, SR-013, SR-014 | INV-2, INV-3 | correctness-real-v1 | correctness |
| SCN-002 | order, provenance, window, empty-state | SR-005, SR-006, SR-007 | — | correctness-real-v1 | correctness |
| SCN-003 | annotate, quiet, no re-rank | SR-008, SR-009, SR-010 | — | correctness-real-v1 | correctness |
| SCN-004 | log events, weekly count | SR-011, SR-012 | INV-4 | correctness-real-v1 | correctness |
| SCN-005 | auto provenance, local-reads-only, never-blocks, additive-optional, dedupe-unchanged, inert | SR-015, SR-016, SR-017, SR-018 | INV-1, INV-2 | correctness-real-v1, security-adv-v1 | correctness, security |
| SCN-006 | server instructions, project display, project filter, no-behavior-drift | SR-019, SR-020 | — | correctness-real-v1 | correctness |
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
