---
version: "6.0.0"
status: active
effort:
  - s1-5-ambient-capture   # converged
  - decision-graph         # active (v3.8.0 Phase 0 shipped; v3.12.0 Phase A drafted; v4.0.0 panel amendments; v5.0.0 SR-056 baseline correction; v6.0.0 wire-format ratification)
last-amended: 2026-08-13
mapping-pending: true      # SR-104 (bound pending gen-1 calibration) + SCN-010/SR-047..057 (Phase A, entirely unmapped — evals/ owned by flow-eval)
# v6.0.0 (major — effort decision-graph, panel-2026-08-13 follow-up): ratifies
# the wire format the panel found still unsettled in spec TEXT despite already
# being settled — twice over — at the implementation level (gen-3/var-2-
# maintainability's decision-ledger D1-D-stance-sanitization, chavruta
# dissents-2026-08-13-0003/-0004's provisional-resolution). SCN-010's
# When-clause still literally said positions ride "the same sentinel channel
# session directives use" — unchanged since v3.12.0 — while shipped code uses
# a DISTINCT `librarian-position` HTML-comment tag. This amendment closes that
# gap by writing down what was already built and already reasoned through, not
# by making a new design decision.
#   AMENDED: SCN-010 (When-clause; three acceptance-criteria bullets), SR-047,
#   SR-048, SR-049, SR-052. Every change below states, in spec text, a behavior
#   that ALREADY SHIPS in `src/position-directive.ts` and `src/positions.ts` —
#   none of it is new implementation. Verified against source before writing,
#   not re-derived from panel readings alone (panel-2026-08-13.md's own
#   closing recommendation).
#   1. **SCN-010/SR-047 — wire format pinned.** Positions ride a distinct
#      `<!-- librarian-position POSITION <kind> <topic-key>: <stance> -->`
#      HTML comment — NOT the `librarian-session` tag, and NOT a bare unwrapped
#      line (the panel's 4th and 5th readers, respectively, had each committed
#      to one of these two rejected readings). "Same sentinel channel" now
#      means: same general mechanism (an HTML comment the Stop hook scans for,
#      invisible in rendered markdown), not the same literal tag. Reason
#      (already reasoned through at gen-3/var-2-maintainability's D2, restated
#      here as spec text): a shared tag would let `directive.ts`'s
#      keep-the-LAST-occurrence rule silently displace a session summary with
#      a position (or vice versa) emitted in the same turn — a session-record
#      behavior change caused by the mere presence of position capture, which
#      SR-055 explicitly forbids. Two disjoint regexes over the same text make
#      the two extractions independent by construction, not by careful
#      sequencing.
#   2. **SR-047 — malformed/unrecognized kind, and empty topic-key, both
#      resolved (closes the `SG-9` gap and a new gap the 2026-08-13 panel
#      found, "empty topic-key").** A `librarian-position` comment whose kind
#      token isn't one of the four literals, or whose topic-key is empty/
#      missing, fails the grammar match entirely and is silently treated as no
#      directive at all — no stderr diagnostic, no append, exactly like an
#      absent comment. This is the ALREADY-SHIPPED behavior
#      (`parsePositionDirective` returns `null` uniformly for every grammar
#      failure; only SR-057's specific empty-STANCE case gets a diagnostic, via
#      a separate detector function). `SG-9`'s adversarial test wanted a
#      diagnostic no SR required — this amendment resolves that by stating
#      plainly that no diagnostic is required here, rather than by adding one.
#   3. **SR-049 — idempotence scope pinned: every month, not just the current
#      one (closes `SG-2`).** The duplicate-check scans the FULL logical
#      positions stream (`readAllPositionStreams()` across all
#      `<YYYY-MM>.md` files), not just the file a new event would land in —
#      mirroring `session-record.ts`'s identical cross-day handling for the
#      same reason (a session can straddle the boundary). Already tested
#      (`test/position.test.ts`'s cross-month idempotence case); the panel's
#      own readers split 2-2 on this exact question, with only half guessing
#      the shipped answer.
#   4. **SR-052 (and SR-048) — `revises:`/ref syntax pinned: derived from
#      inside the stance, never stripped out.** Neither `revises:<event-id>`
#      nor a `[[wikilink]]`-style ref is a separate grammar slot — both are
#      read-only scans over the byte-verbatim stance text the client already
#      wrote, layered on top of storage, never edited out of it. This is the
#      ONE place the panel's own readers did not converge on the right answer
#      even partially: all readers who addressed `revises:` proposed a
#      separate grammar slot (a trailing token, a second line) — none proposed
#      "embedded in the stance and left there," which is what actually ships.
#   Dissent check: this amendment directly and intentionally arms
#   `dissent-2026-08-13-0003`'s reactivation condition 1 (SCN-010/SR-047 text
#   changes) — expected, since ratifying the wire format is exactly what that
#   dissent's `provisional-resolution` called for once `/flow-spec` acted. This
#   amendment resolves TOWARD that dissent's provisional-resolution (distinct
#   tag), not away from it — recommend `/flow-dissent resolve
#   dissent-2026-08-13-0003` as a follow-up, not reopening the shared-vs-
#   distinct debate. `dissent-2026-08-13-0004`'s conditions are unaffected (it
#   concerns whether/when SERVER_INSTRUCTIONS teaches the grammar, already
#   answered at ship; this amendment only pins the grammar's own text).
#   Not addressed this round (deliberately deferred, still open): `SG-12`
#   (a topic key containing a colon mis-parses under first-colon-wins) is
#   documented as a known, disclosed limitation in SR-047's derivation note
#   below, not elevated to a hard spec requirement — the decision that
#   produced it (gen-4/var-1-graft's G1) already rates it MEDIUM severity and
#   admits a different, equally defensible implementation exists; ratifying
#   "first colon wins" as correct-forever spec text would foreclose a genuine
#   future improvement this round has no basis to decide.
# v5.0.0 (major — effort decision-graph, ship-close correction): SR-056's cited
# OBS-1 baseline was stale. The requirement said the SERVER_INSTRUCTIONS addition
# teaching the position directive must total at most 350 characters over a
# pre-change baseline of 2,093 characters (OBS-1, ship-2026-07-27-0004). By the
# time SR-056 was authored and Phase A shipped (v4.0.0), several intervening
# ships (workspace provenance SR-015..020, note identity, the rutter rename,
# user-label templating) had already grown the real SERVER_INSTRUCTIONS string
# well past that figure — both the gen-3 and gen-4 evaluators independently
# measured the actual pre-change baseline via a live dist/stdio.js spawn + real
# JSON-RPC initialize handshake and got ~3,030 characters, reconfirmed here
# against `main` @ `631640e` (the last commit before the position-teaching text
# landed). Read literally, SR-056's ceiling was `2093 + 350 = 2443` chars —
# already 587 chars below the real pre-change baseline alone, meaning no
# implementation, however frugal, could have satisfied it. The actual shipped
# addition was 279-281 characters — comfortably inside the intended 350-char
# budget once measured against the real baseline.
#   AMENDED: SR-056. Baseline corrected 2,093 -> 3,030 characters, pinned to
#   `main` @ `631640e` for reproducibility. The 350-character delta budget
#   itself is UNCHANGED — only the stale reference point is corrected. SCN-010's
#   "Instruction budget" acceptance-criteria bullet (which restated the same
#   figure) is corrected in the same pass for internal consistency.
#   This is a MAJOR bump per the version-semantics table (existing SR-056 text
#   modified) even though the change is a factual correction, not an intent
#   change — the requirement's testable numeric threshold changes.
#   Dissent check: this edit touches SCN-010 acceptance-criteria text (the
#   instruction-budget bullet), which is one of the literal triggers
#   dissent-2026-08-13-0003 watches — but that dissent is about which sentinel
#   tag encodes a position directive (shared vs. distinct channel); this change
#   is an unrelated baseline-accounting correction and does not touch encoding.
#   Re-checked 2026-08-13: dissent-2026-08-13-0003 and -0004 both remain
#   `active`, non-blocking, reactivation-count 0 — noted, not reactivated.
#   Not addressed this round (separately tracked, not urgent): SG-9's
#   unrecognized-directive-kind diagnostic gap.
#   Follow-up owed to /flow-eval, not done here: `correctness-real-v1.jsonl`'s
#   COR-R-050 task repeats the same stale 2,093 figure in its setup/expected/pass
#   fields and will keep testing the wrong number until updated.
# v4.0.0 (major — effort decision-graph, Phase A): /flow-panel ran 3 independent
# sonnet readers over SCN-010/SR-047..056 (no code touched, no build dispatched —
# this is a pre-implementation spec probe). Verdict: 2 real divergences (routed by
# HITL, AskUserQuestion, both resolved AMEND — majority reading in each case), 2
# convergent-but-underspecified textual gaps noted for a future patch (not amended
# here), and 1 apparent divergence (SR-054's 40-vs-60 trigger) that dissolved on
# checking its own cited precedent (SR-034 already uses the ceiling, not the
# target — no amendment needed). Full panel record: spec/.staging/panel-2026-08-12.md.
#   AMENDED: SR-049. 2 of 3 readers flagged that its enumerated identity tuple
#   ("kind, topic key, stance, and referenced note paths") omits `revises:`, so a
#   directive differing only in an added/changed `revises:` would silently collide
#   with a prior one and drop the client's correction — in tension with this
#   project's own stance (HANDOFF §1): "weighs openly, attributably, reversibly —
#   never silently." SR-049 now explicitly includes `revises` (present-or-absent,
#   and its value) in the identity tuple, and states the non-identical case appends.
#   +SR-057 (new, derived from SCN-010): an empty-or-whitespace-only stance after a
#   well-formed `topic-key:` is treated as no directive at all — same precedent as
#   SCN-001's unfilled-`<template>` rule — reported on stderr, nothing appended to
#   either stream. 2 of 3 readers held this reading (the third would have stored an
#   empty string verbatim, absent an explicit minimum). SCN-010 gains one new
#   acceptance criterion naming this; its Given/When/Then and the other nine
#   acceptance criteria are unchanged.
#   This is a MAJOR bump per the version-semantics table (existing SCN-010 and
#   SR-049 text modified) even though both changes are narrow corrections to
#   same-day, not-yet-dispatched text — no code exists yet that could regress, and
#   constitution escalation trigger 4 (light -> standard class-promotion review)
#   remains separately un-cleared, so this amendment changes nothing about
#   readiness to build.
# v3.12.0 (minor, additive — effort decision-graph, Phase A): position capture, the
# write path for capability #3 (belief-lifecycle). Escalation trigger 5's two gates
# both cleared 2026-08-12: the desirability-gate verdict passed
# (docs/gate-verdict-2026-08.md), and two wish-log entries (2026-08-11, 2026-08-12)
# recorded real operator demand — a cross-month consistency check performed by hand
# (referencing decisions from September and November 2025), generalized same-day to
# the actual primitive needed (a topic's full trajectory over a date range, not a
# two-point diff), plus recurring mid-session belief drift tracked today only by
# hand-built handoffs and session-ID cross-referencing. This supersedes the
# 2026-08-04 draft wish-log entry noted in docs/decision-graph-plan.md's sequencing
# constraints, which was never actually logged.
#   +SCN-010 (a formed stance is captured as a position event, exactly once per
#   distinct directive): new sentinel-channel directive
#   `POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance>`, routed by kind;
#   stored in a wholly separate append-only stream (`_librarian/positions/<YYYY-MM>.md`,
#   schema `position-event@1`) so `session-record@1` and all existing capture behavior
#   (SCN-001, SCN-002) stay byte-for-byte unchanged — the plan's own HITL
#   recommendation (separate stream over extending session-record@1) is adopted.
#   +SR-047..SR-056: grammar/kind routing; stream shape and event fields; idempotence
#   (SR-013's pattern); retire-appends-never-deletes (INV-3); supersession as
#   deterministic fold order with no model judgment (INV-6) — free-form topic keys,
#   reported not enforced (the plan's other adopted HITL recommendation); an optional
#   `revises:` field; the stance's word budget, reported not enforced (SR-034
#   pattern); session non-interference as a required test; and an instruction-budget
#   cap (≤350 chars over the OBS-1 baseline of 2,093) on the SERVER_INSTRUCTIONS
#   addition that teaches the directive.
#   Deliberately NOT in this round: anything that reads positions back — the
#   trajectory query, supersession chains, drift detection. That is Phase B, a
#   separate future round; Phase A only guarantees the stored events support it.
#   All ten SRs and the SCN-010 traceability row enter mapping-pending: true
#   (evals/ owned by flow-eval).
#   Constitution escalation trigger 4 is a SEPARATE, NOT-YET-CLEARED gate: because
#   SR-047 and SR-056 touch the capture contract and SERVER_INSTRUCTIONS, a light →
#   standard weight-class promotion review is required BEFORE this version is
#   dispatched to flow-generate. Approving this spec round does not clear it.
#   No existing SCN/SR/INV text modified. Desirability-gate clock unaffected
#   (verdict already PASSED, see docs/gate-verdict-2026-08.md); prohibition 9 keeps
#   any future decision-graph read path out of the gate arithmetic regardless.
# v3.11.0 (minor — effort s1-5-ambient-capture): the gate's "unprompted" axis is
# INTENT, not call origin. HITL 2026-08-05 (operator, pre-verdict): "what have I been
# working on?" is model-executed but human-intended — the assistant is the delivery
# mechanism, and memory reached through conversation is still memory reached. The
# previously planned instrumentation split (model-initiated vs human-initiated,
# HANDOFF item 1) is REJECTED: excluding model-executed calls excludes the librarian
# doing its job, and a call-origin field would make the gate under-count the exact
# behavior it exists to detect. What counts toward the gate: an invocation pulled by
# a live human question or task in the session. What does not: an invocation made
# under standing server instructions alone (SR-020 ambient reach). Classification
# remains manual wish-log review — mechanism unchanged, axis now named. SCN-004
# Given re-glossed, its open AC re-worded, glossary entry added; first amendment to
# modify SCN-004 scenario text. No SR or INV text changed. Read-value (did the
# recall change what happened next) is promoted to primary kill condition in
# docs/roadmap.md — roadmap-tracked; it lands here as an SR only with the roadmap's
# Phase 1 read-value signal.
# v3.10.2 (patch, clarification — ring-0 day-one production finding): "path no longer
# resolves" in SR-036/SR-037 means the file is ABSENT FROM DISK at its vault-relative
# path (within confinement) — NOT absent from the markdown notes index. Capture
# legitimately refs any confined vault file (.html, .yaml, dotfiles, _librarian/*);
# a ref to an existing non-note file is LIVE and never enters the dead-ref pass.
# The shipped notes-index reading mislabeled 27 of 31 live-vault dead refs. Glossary
# entry added; no scenario, requirement, or invariant semantics changed — this pins
# the intended meaning against a demonstrated misreading (all gen-1/gen-2 variants
# shared it; no decision ledger ever surfaced it — panel+population blind spot).
# Suite 0.8.0 adds COR-R-038 (real) + COR-A-021 (holdout, incl. over-correction guards).
# v3.10.1 (patch): SR-046 mapping-pending cleared — eval suite 0.7.0 (flow-eval,
# 2026-08-04, eval-first before gen-2 dispatch) authored 3 additive adversarial
# holdouts: COR-A-018 (confirmed binding preserved + conflict surfaced against a later
# exact-hash detection), COR-A-019 (only a fresh SR-044 confirmation supersedes;
# append-only under supersede), COR-A-020 (SR-043 enrichment-surface silence
# discriminator — gen-1 cull found COR-A-016 under-probed that surface). No scenario,
# requirement, or invariant text changed.
# v3.10.0 (minor, additive — effort decision-graph): +SR-046, confirmed bindings are
# sticky. Gen-1 population fork (var-1 HIGH, var-3 MEDIUM independently): SR-045's
# "newest binding wins" did not say whether a LATER AUTOMATIC exact-hash detection may
# supersede a HUMAN-confirmed binding. HITL 2026-08-04: it may not — confirmed is
# preserved, the conflict is surfaced at read time, only a fresh human confirmation
# supersedes. SR-045 is thereby scoped to automatic bindings. All three gen-1 variants
# implement uniform newest-wins and predate this SR — expected nonconformance recorded
# for cull; gen-2 refinement item. No existing SCN/SR/INV text modified.
# v3.9.0 (minor, additive — effort decision-graph): the gen-1 interpretation panel
# (3 independent readers, pre-dispatch) converged on projection-only unresolved state,
# idempotent ledger appends, refs.ts hashing reuse, and drop-and-rebuild projections —
# but split on three points, all resolved by HITL 2026-08-04 and encoded here:
#   +SR-044 (confirmation surface = local CLI, never an MCP tool — a model-driveable
#   confirmation would launder auto-binds past prohibition 8);
#   +SR-045 (strict (path, hash) keying; direct rebinding from the originally recorded
#   pair against the current vault; newest binding wins; no chain composition).
# No existing SCN/SR/INV text modified.
# v3.8.1 (patch): mapping-pending cleared — eval suite 0.6.0 (flow-eval DESIGN pass,
# 2026-08-04) authored 19 additive tasks (COR-R-028..037, COR-A-013..017, SEC-A-014/015,
# SEC-R-006, PERF-R-006 report-only) and registered every SCN-008/009 + SR-036..043
# mapping. SR-104 remains mapping-pending: calibration on its harness entry — PERF-R-006
# produces the gen-1 baseline; the bound lands here by patch amendment. No scenario,
# requirement, or invariant text changed.
# v3.8.0 (minor, additive — effort decision-graph, Phase 0): durable note identity.
# First amendment by the second effort; this spec is now the shared living artifact of
# both. HITL pre-resolved at flow-init decision-graph (2026-08-04): scope = Phase 0 of
# docs/decision-graph-plan.md ONLY, weight class light, constitution v3.0.0 alongside
# (prohibitions 8-9, escalation triggers 4-5, effort-scoped budgets).
#   The defect: refs key on path + sha256, the hash is a version rather than an
#   identity, path is the de facto identity, and Obsidian renames freely — 2 of 106
#   distinct ref paths already dead over a measured 10 days (~2%). Every event written
#   before the fix carries the weaker identity, so this gets more expensive the longer
#   it waits, and it is a data-integrity fix exempt from the desirability gate.
#   +SCN-008 (a recorded ref survives a vault rename: exact-hash, single-candidate
#   deterministic auto-bind, appended to a new append-only ledger
#   _librarian/note-identity.md, note-identity@1; read surfaces resolve through it);
#   +SCN-009 (ambiguous disappearance — rename+edit or duplicate content — is surfaced
#   with candidates and NEVER auto-bound, constitution prohibition 8; human-confirmed
#   bindings append as detected: confirmed). +SR-036..043; +SR-104 (identity-pass perf
#   bound, deliberately uncalibrated — no defensible figure in the docs; TODO
#   flow-eval: calibrate at gen-1). SQLite identity projections rebuild from vault +
#   sidecar (INV-4) and are deterministic across repeated reindexes.
# NO capture-contract, SERVER_INSTRUCTIONS, README-quoted-block, session-record@1, or
# instruction-anchor change; no existing SCN/SR/INV text modified; no retrofit of
# stored records (resolution is read-time, ledger-mediated). Phases A-C are OUT of
# scope pending the gate verdict AND the wish-log entry (constitution escalation
# trigger 5). Desirability-gate clock NOT restarted (verdict stays ~2026-08-09);
# decision-graph reads never count toward the gate metric (prohibition 9).
# All v3.8.0 mappings are mapping-pending: true (evals/ owned by flow-eval).
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

### Effort: decision-graph (Phase 0 + Phase A) *(v3.8.0, v3.12.0)*

From v3.8.0 this spec is the shared living artifact of two efforts:
**s1-5-ambient-capture** (converged — everything above reads unchanged) and
**decision-graph** (active). The decision-graph effort contributes **Phase 0 of
`docs/decision-graph-plan.md`** (shipped 2026-08-05): a durable note-identity ledger.
Refs key on vault-relative path plus content hash; the hash is deliberately a
*version*, not an identity, so path is the de facto identity — and Obsidian renames
freely (~2% of recorded ref paths dead over a measured 10 days). Phase 0 makes a
recorded ref survive a vault rename, deterministically where that is safe and
non-silently where it is not, and nothing else.

**Phases A–C were OUT of scope pending the desirability-gate verdict and the
operator's wish-log entry recording demand (constitution escalation trigger 5); both
cleared 2026-08-12** (`docs/gate-verdict-2026-08.md`; wish-log entries dated
2026-08-11/12). **Phase A (position capture) is IN scope as of v3.12.0** — see
SCN-010 below. **Phases B–D (position recall with supersession, drift visibility and
threads, optional backfill) remain OUT of scope**, gated on nothing further than
ordinary spec/build sequencing — there is no outstanding evidence gate on them, only
the normal build order (Phase A's write path lands before Phase B's read path has
anything to read).

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

### Effort: decision-graph (Phase 0) — scope *(v3.8.0)*

In scope:
- **Durable note identity**: an append-only ledger `_librarian/note-identity.md`
  (schema `note-identity@1`, mdbase-compatible frontmatter) binding a recorded ref
  whose path no longer resolves to the current note that carries its content.
  Deterministic auto-bind **only** on an exact content-hash match with exactly one
  candidate; anything else is surfaced as unresolved with candidates and bound only
  by human confirmation (SCN-008, SCN-009; constitution prohibition 8).
- **Identity projection**: SQLite gains identity tables rebuilt at reindex from
  vault + `_librarian/` sidecar (INV-4), deterministic across repeated reindexes.
- **Read-surface resolution**: `librarian-recent` and search enrichment resolve
  recorded refs through the ledger; unresolved refs render non-silently.

Out of scope for Phase 0 (boundaries):
- Writing stable ids (or anything else) into vault notes — the ledger approach
  exists precisely because the librarian never writes to the vault (INV-2,
  constitution prohibition 5).
- Content-similarity / fuzzy rename detection — only exact-hash matching is
  specified; near-matches are unresolved by design.
- Backfill or retrofit of any stored session record.

### Effort: decision-graph (Phase A) — scope *(v3.12.0)*

In scope:
- **Position capture**: a new sentinel-channel directive
  (`POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance>`), routed by
  `capture-cli` alongside the existing session-summary directive, stored in a wholly
  separate append-only stream (`_librarian/positions/<YYYY-MM>.md`, schema
  `position-event@1`). See SCN-010, SR-047..SR-056.

Out of scope for Phase A (boundaries):
- **Phases B–D of `docs/decision-graph-plan.md`** — position recall with
  supersession (the read path, including the trajectory-over-a-date-range query the
  2026-08-12 wish-log correction asked for), drift visibility and threads, and
  optional backfill of the ~193 pre-position records. Phase A stores events in a
  shape that makes Phase B possible; it specifies no query, no fold interpretation
  at read time, and no retrofit.
- Any change to `session-record@1`, capture idempotence identity (SR-013/SR-018/
  SR-024), read-path grouping (SR-030..032), or instrumentation (SCN-004) — SR-055
  makes this a required test, not just an intention.
- Dispatch to `flow-generate` — constitution escalation trigger 4 (a light →
  standard weight-class promotion review) is a separate, not-yet-cleared gate; this
  spec round satisfies escalation trigger 1 (capture-semantics HITL) and trigger 5
  (the evidence gate), not trigger 4.

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
≥3×/week for 2 weeks" — *unprompted* naming intent, not call origin: pulled by a live
human question or task in the session, whoever places the tool call *(v3.11.0)*
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
- (Open) Classifying an invocation as *unprompted* — attributing it to a live human
  question versus standing server instructions alone (intent, not call origin: a
  model-executed call serving a human question counts; an SR-020 ambient reach with
  no human question behind it does not) — is deferred to manual wish-log review;
  instrumentation captures all invocations with timestamps to support it.
  *(axis named v3.11.0)*

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

### SCN-008: A recorded ref survives a vault rename *(v3.8.0, effort decision-graph)*
**Given** a session record references a store note by versioned identity
(vault-relative path plus content hash), and that note has since been renamed in the
vault with its content unchanged
**When** a reindex encounters the recorded ref — its path no longer resolves on disk,
and exactly one current vault note's content hash equals the ref's last-recorded hash
**Then** the system shall bind the disappeared path to that current note
deterministically, append the binding to the note-identity ledger, and the read
surfaces (`librarian-recent`, search enrichment) shall resolve the old ref through the
binding — writing nothing to the vault and rewriting no stored session entry.

**Acceptance criteria:**
- With exactly one exact-hash candidate, the ref binds automatically and a binding is
  appended to `_librarian/note-identity.md` (schema `note-identity@1`,
  mdbase-compatible frontmatter, append-only) carrying an identity id, the from-path,
  the to-path, the content hash, a timestamp, and `detected: exact-hash`.
- Binding is deterministic: the same vault + sidecar state always produces the same
  binding — no heuristics, no similarity scores, no model (INV-6).
- `librarian-recent` and prior-engagement enrichment resolve the renamed ref through
  the binding: the prior engagement surfaces against the note's current path, while
  the stored session entry's bytes are unchanged (no retrofit — INV-3; resolution is
  read-time and ledger-mediated).
- SQLite gains identity projection tables rebuilt at reindex from vault +
  `_librarian/` sidecar alone (INV-4); running reindex twice with no vault or sidecar
  change yields byte-identical identity projections.
- The identity pass writes nothing to the vault; its only durable write is the ledger
  under `_librarian/` (INV-2 / constitution prohibition 5 apply — cited, not
  restated).
- The identity pass completes within SR-104's wall-time bound.

**Derived requirements:** SR-036, SR-039, SR-040, SR-041, SR-042

---

### SCN-009: An ambiguous disappearance is surfaced, never guessed *(v3.8.0, effort decision-graph)*
**Given** a session record references a note whose path no longer resolves, and
exact-hash matching over current vault notes yields either zero candidates (the note
was renamed *and* edited) or more than one candidate (duplicate content)
**When** a reindex encounters the ref, and when a read surface later renders it
**Then** the system shall record and render the ref as **unresolved** together with
its candidate set and shall bind nothing — a binding for such a ref enters the ledger
only by human confirmation, appended and attributed `detected: confirmed`.

**Acceptance criteria:**
- Zero exact-hash candidates → the ref is recorded as unresolved and no binding is
  appended (constitution prohibition 8: never auto-bind an ambiguous match).
- More than one exact-hash candidate → the ref is recorded as unresolved with every
  candidate listed, and no binding is appended — duplicate content is ambiguity, not
  a tie to break.
- Read surfaces (`librarian-recent`, search enrichment) render an unresolved ref
  explicitly as unresolved with its candidates — never silently dropped, never
  silently bound.
- A subsequently human-confirmed binding is appended to the ledger attributed
  `detected: confirmed`; all earlier ledger entries are preserved (the ledger is
  append-only — never rewritten, reordered, or compacted).
- Nothing on this path writes to the vault or mutates a stored session entry
  (INV-2, INV-3).

**Derived requirements:** SR-037, SR-038, SR-039, SR-043

---

### SCN-010: A formed stance is captured as a position event, exactly once per distinct directive *(v3.12.0, effort decision-graph, Phase A)*
**Given** a Claude Code session in which the client formed, changed, reaffirmed, or
retired a stance on a topic — expected ≪ 1 per session, against ~19.3 outcome entries
per day — with the librarian registered and the Stop hook installed
**When** the client emits a position directive on the same general sentinel
mechanism session directives use — a client-authored HTML comment, invisible in
rendered markdown, that the Stop hook scans for — under its own distinct tag,
`<!-- librarian-position POSITION <assert|revise|reaffirm|retire> <topic-key>:
<stance> -->` *(v6.0.0 — pins the wire format; NOT the `librarian-session` tag,
NOT a bare unwrapped line: see SR-047)*, and the capture hook lifts it
**Then** the capture path shall route the directive by kind and append exactly one
position event per distinct directive to a separate positions stream
`_librarian/positions/<YYYY-MM>.md` (schema `position-event@1`), storing the stance
byte-verbatim with workspace provenance and versioned refs — while `session-record@1`
and all existing session capture behavior remain byte-for-byte unchanged.

**Acceptance criteria:**
- **Grammar and kind routing.** A `<!-- librarian-position POSITION
  <assert|revise|reaffirm|retire> <topic-key>: <stance> -->` comment is routed by
  `capture-cli` to the position write path; a `librarian-session` directive routes
  to session capture exactly as before, via a disjoint regex that cannot see the
  position tag or vice versa — the two extractions are independent by
  construction, not by careful sequencing *(v6.0.0)*. Kind is the only
  router — no content heuristics, no model (INV-6 / constitution prohibition 1, cited
  not restated). A comment matching the `librarian-position` tag whose kind token
  is not one of the four literals, or whose topic key is empty or missing, fails
  the grammar match entirely and is treated as no directive at all — silently,
  with no stderr diagnostic and nothing appended, exactly as an absent comment
  would be *(v6.0.0 — closes `SG-9` and the empty-topic-key gap panel-2026-08-13
  found; SR-057's empty-STANCE case is the one and only grammar failure that
  gets a diagnostic)*.
- **Separate stream.** The event is appended to `_librarian/positions/<YYYY-MM>.md` —
  append-only, schema `position-event@1`, mdbase-compatible frontmatter (constitution
  preference 2) — never to a session record. Writes stay under `_librarian/` (INV-2 /
  constitution prohibition 5).
- **Event shape.** Each event carries an event id, the directive kind, the topic key,
  the stance byte-verbatim, a timestamp, workspace provenance (SR-015's derivation,
  SR-016's never-blocks rule), and any named refs by versioned identity hashed as-read
  exactly as session refs are (SR-003 pattern) — so a future read path can resolve
  them later without retrofit. Named refs are `[[wikilink]]`-style tokens found
  anywhere in the stance text, using the same wikilink convention `refs.ts`
  already applies elsewhere; extraction is a read-only scan and never removes
  the token from the stored stance *(v6.0.0 — closes the ref-extraction-syntax
  gap both panels flagged; see SR-048)*.
- **Idempotence.** A repeat capture of an unchanged position directive (same session
  id, kind, topic key, stance, and referenced-path set — referenced-note content
  hashes inert, per SR-024's rule) appends nothing and leaves the positions stream
  byte-identical, regardless of how many Stop events fire (SCN-001/SR-013 pattern). A
  `reaffirm` differs by kind or by session and is a distinct directive that appends
  normally — idempotence guards hook re-firing, never the lifecycle. The check
  scans every month's positions file, not just the one a new event would land
  in, mirroring `session-record@1`'s identical cross-day handling for the same
  reason — a session can straddle the boundary *(v6.0.0 — closes `SG-2`; see
  SR-049)*.
- **Retire is an event.** A `retire` directive appends a new position event; no
  earlier event is modified, removed, or compacted (INV-3 / constitution
  prohibition 3). The stream is never rewritten, reordered, or compacted.
- **Supersession is deterministic fold order.** For events sharing a topic key,
  supersession is implicit in the stream's append order — a deterministic fold
  computable by code alone, no model judgment (INV-6 / constitution prohibition 1) —
  with an explicit `revises: <event-id>` field, where supplied, stored verbatim on the
  event for precision. `revises:<event-id>` (also `(revises: <event-id>)`) is not a
  separate grammar slot — it is derived by a read-only scan of the stance text
  itself, the same "derive without stripping" principle named-ref extraction uses,
  so it remains visible verbatim in the stored stance alongside the derived field
  *(v6.0.0 — pins the syntax; see SR-052)*. Phase A guarantees the data supports the fold; querying that
  fold for recall is a separate future round and is deliberately NOT specced here.
- **Topic keys are reported, never enforced.** Topic keys are free-form kebab-case,
  client-chosen, grouped only at read time; a key departing from the convention is
  reported as a stderr diagnostic and stored byte-verbatim — never rejected,
  rewritten, or normalized (constitution preference 3's quiet-when-unprompted spirit;
  the SR-034 report-don't-enforce pattern applied to a new field).
- **Stance budget is reported, never enforced.** The stance line carries the style
  contract's 40/60 word budget; an over-budget stance is reported on stderr and
  stored byte-verbatim with no annotation on the record (SR-034 shape; refines
  SR-023 / INV-6 — never rewrite, truncate, or reject on style or length grounds).
- **Session capture untouched.** `session-record@1`, every existing session record's
  bytes, and SCN-001/SCN-002 observable behavior are byte-for-byte unchanged by the
  presence or absence of position capture — positions are a wholly separate write
  path, and a session-record byte-compare before/after a position capture is a
  required test.
- **Instruction budget.** The `SERVER_INSTRUCTIONS` addition teaching the directive
  (its emission trigger — only when a stance was formed, changed, reaffirmed, or
  retired — and its literal grammar, per SR-026's rule) adds at most 350 characters
  to the pre-change baseline (3,030 chars, corrected v5.0.0 — measured via a live
  `dist/stdio.js` initialize handshake against `main` @ `631640e`; see SR-056);
  SR-027's single-source rule applies unchanged, so the README quoted block
  regenerates and the instruction-anchor tests move deliberately, not accidentally.
- **Empty stance is no directive.** *(v4.0.0, flow-panel divergence 2)* A directive
  whose stance portion — the text after the topic key's colon — is empty or
  whitespace-only fails to match the grammar and is treated as no directive at all,
  the same treatment SCN-001 gives an unfilled `<template>`: reported as a stderr
  diagnostic, nothing appended to either stream. A non-empty stance of any length is
  always a valid directive; SR-054's word budget is advisory only and never
  establishes a minimum.

**Derived requirements:** SR-047, SR-048, SR-049, SR-050, SR-051, SR-052, SR-053,
SR-054, SR-055, SR-056, SR-057

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
- **SR-036** — When a reindex encounters a recorded ref whose vault-relative path no
  longer resolves and exactly one current vault note's content hash equals that ref's
  last-recorded content hash, the system shall bind the ref to that note
  deterministically and append the binding to the note-identity ledger attributed
  `detected: exact-hash`. *(event-driven)*
  `# ← SCN-008; added v3.8.0 (decision-graph); mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-037** — If a recorded ref's path no longer resolves and exact-hash matching
  yields zero current-note candidates (rename plus edit) or more than one candidate
  (duplicate content), then the system shall record the ref as unresolved together
  with its candidate set and shall bind nothing. *(unwanted-behavior)*
  `# ← SCN-009; added v3.8.0; enforces constitution prohibition 8; mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-038** — When a human-confirmed binding is supplied for an unresolved ref, the
  system shall append it to the note-identity ledger attributed `detected: confirmed`,
  preserving all earlier ledger entries. *(event-driven)*
  `# ← SCN-009; added v3.8.0; mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-039** — The note-identity ledger shall live at `_librarian/note-identity.md`
  as an append-only markdown file with mdbase-compatible frontmatter under schema
  `note-identity@1`, and each binding shall carry an identity id, the from-path, the
  to-path, the content hash, a timestamp, and a provenance field
  `detected: exact-hash | confirmed`. *(ubiquitous)*
  `# ← SCN-008, SCN-009; added v3.8.0; frontmatter per constitution preference 2; writes confined to _librarian/ per INV-2 / constitution prohibition 5 (cited, not restated); mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-040** — When a reindex runs, the system shall rebuild the SQLite identity
  projection tables from the vault plus the `_librarian/` sidecar alone, holding no
  load-bearing identity state only in the database. *(event-driven)*
  `# ← SCN-008; added v3.8.0; refines INV-4; mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-041** — If a reindex is run twice with no change to the vault or the
  `_librarian/` sidecar between runs, then the two runs shall yield identical identity
  projections. *(unwanted-behavior)*
  `# ← SCN-008; added v3.8.0; mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-042** — When `librarian-recent` output or a prior-engagement enrichment
  surfaces a ref whose recorded path carries a ledger binding, the system shall
  resolve the ref through that binding to the note's current path while leaving the
  stored session entry's bytes unchanged. *(event-driven)*
  `# ← SCN-008; added v3.8.0; read-time only, no retrofit (INV-3); mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-043** — If a surfaced ref is unresolved, then the read surface shall render it
  explicitly as unresolved together with its candidates — never silently dropped and
  never silently bound. *(unwanted-behavior)*
  `# ← SCN-009; added v3.8.0; enforces constitution prohibition 8; mapping registered @ suite 0.6.0 (v3.8.1)`
- **SR-044** — Where a human confirms a binding for an unresolved ref, the
  confirmation shall be supplied through a local CLI command (an npm script peer of
  the recent/gate CLIs) that validates the chosen candidate against the current vault
  and appends the `detected: confirmed` entry; the confirmation surface shall not be
  exposed as an MCP tool. *(optional-feature)*
  `# ← SCN-009; added v3.9.0 (interpretation-panel divergence D-confirm, HITL 2026-08-04): an MCP confirmation tool would let a connected model confirm bindings — auto-bind laundering under constitution prohibition 8. Mapped @ suite 0.6.1 to COR-R-036/COR-A-017 (they grade the observable ledger effect through whatever surface exists; this SR fixes the surface).`
- **SR-045** — When the identity pass matches or resolves, it shall key strictly on
  the recorded ref's (path, content-hash) pair — a binding applies only to refs whose
  recorded hash equals the binding's hash — and each pass shall evaluate the
  originally recorded pair directly against the current vault, so that a
  multiply-renamed note yields a fresh direct binding (newest binding wins) and
  ledger entries are never composed into chains. *(event-driven)*
  `# ← SCN-008/SCN-009; added v3.9.0 (interpretation-panel divergences D-key + D-chain, HITL 2026-08-04): path-level keying lets an old-version ref resolve silently through a newer version's move — the quiet guess SCN-009 exists to prevent; chain composition adds graph-closure logic and a bug class the direct model cannot have. Mapped @ suite 0.6.1 to COR-R-029/COR-R-030/COR-A-013; the strict-keying discriminator (old-hash ref must stay unresolved through a new-hash binding) is recorded suite debt for the cull's decision-ledger audit.`
- **SR-046** — If an automatic exact-hash detection conflicts with an existing
  `detected: confirmed` binding for the same recorded (path, content-hash) ref, then
  the system shall preserve the confirmed binding, append no automatic binding for
  that ref, and surface the conflict explicitly at read surfaces ("confirmed X; the
  hash now matches Y"); only a fresh human confirmation (SR-044) supersedes a
  confirmed binding. *(unwanted-behavior)*
  `# ← SCN-009; added v3.10.0 (gen-1 population fork: var-1 HIGH ambiguity + var-3 MEDIUM echo — SR-045's newest-wins did not carve out confirmed bindings; HITL 2026-08-04: confirmed is sticky, conflict surfaced, never silently outvoted by automation). Scopes SR-045: newest-wins governs AUTOMATIC bindings only. Mapping registered @ suite 0.7.0 (v3.10.1): COR-A-018 conflict preserve+surface, COR-A-019 fresh-confirmation supersede. NOTE: all three gen-1 variants predate this SR (uniform newest-wins) — nonconformance expected at cull, gen-2 refinement item.`
- **SR-047** — When a capture invocation carries a `<!-- librarian-position
  POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance> -->` HTML
  comment — a distinct tag from `librarian-session`, sharing only the general
  Stop-hook-scanned comment mechanism — `capture-cli` shall route it by
  directive kind to the position write path and append exactly one position
  event per distinct directive, leaving session-summary routing unchanged. A
  comment matching this tag whose kind token is not one of the four literals,
  or whose topic key is empty or missing, shall be treated as no directive at
  all: no diagnostic, no append, never misrouted to session-summary handling.
  *(event-driven)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); amended v6.0.0 (panel-2026-08-13, divergence 1: pins the wire format — a distinct tag prevents directive.ts's keep-the-LAST-occurrence rule from letting a position silently displace a session summary in the same turn, which SR-055 forbids; closes SG-9's malformed-kind gap and panel-2026-08-13's empty-topic-key gap by stating both fail the grammar match and collapse to silent no-directive, mirroring SCN-001's unfilled-template precedent); routing is by kind alone — no content heuristics, no model (INV-6 / constitution prohibition 1); KNOWN LIMITATION, not resolved by this amendment: a topic key containing a colon is split on the FIRST colon, which can mis-parse a key that itself looks like "HH:MM" — disclosed, not spec-mandated as correct, since a different parse is equally defensible and this round has no basis to pick between them; mapping-pending: true`
- **SR-048** — Position events shall be persisted in `_librarian/positions/<YYYY-MM>.md`
  as an append-only markdown stream under schema `position-event@1` with
  mdbase-compatible frontmatter, each event carrying an event id, the directive kind,
  the topic key, the stance byte-verbatim, a timestamp, workspace provenance per
  SR-015/SR-016 (derived automatically, never blocking a capture), and any named refs
  by versioned identity hashed as-read per SR-003. Named refs are `[[wikilink]]`-style
  tokens found anywhere in the stance text, extracted by a read-only scan that never
  removes the token from the stored stance. *(ubiquitous)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); amended v6.0.0 (panel-2026-08-13 gap 3, carried from panel-2026-08-12 gap 2: pins the ref-marker syntax that was previously assumed, never stated — [[wikilink]] tokens, reusing refs.ts's existing convention, derived without stripping); frontmatter per constitution preference 2; writes confined to _librarian/ per INV-2 / constitution prohibition 5 (cited, not restated); parallels SR-039 (note-identity ledger) and SR-100 (session-record schema); mapping-pending: true`
- **SR-049** — If a position capture invocation carries a session id and directive
  content identical (after inert-line normalization) to a position event already
  recorded for that session — kind, topic key, stance, referenced note paths, and the
  `revises` field (present-or-absent, and its value where present) all unchanged,
  referenced-note content hashes inert per SR-024's rule — then the system shall
  append nothing and leave the positions stream byte-identical. This check shall scan
  every month's positions file, not only the file a new event would be written to.
  If only the `revises`
  field differs (added, removed, or changed in value) from an otherwise-identical
  prior directive, the two directives are not identical and the later one shall
  append as a new event. *(unwanted-behavior)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); amended v4.0.0 (flow-panel 2026-08-12, divergence 1: revises is client-authored directive content, not derived metadata like a timestamp — excluding it from identity risked silently dropping a supersession correction the client explicitly typed, contrary to HANDOFF §1's 'never silently' stance); amended v6.0.0 (panel-2026-08-13, divergence 2: pins cross-month scope, closing SG-2 — mirrors session-record.ts's identical cross-day handling for the same reason, a session can straddle the boundary; panel readers split 2-2 on this exact question, only half guessing the shipped answer); SR-013's idempotence pattern applied to the positions stream; a reaffirm differs by kind or session and is a distinct directive; mapping-pending: true`
- **SR-050** — When a `retire` directive is captured, the system shall append a new
  position event attributed to it and shall never modify, remove, reorder, or compact
  any earlier event in the positions stream. *(event-driven)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); enforces INV-3 / constitution prohibition 3 — retirement is an event, not a deletion; mapping-pending: true`
- **SR-051** — Supersession among position events sharing a topic key shall be
  implicit in the stream's deterministic fold order (append order, stable event ids),
  computable by code alone with no model judgment and no load-bearing state beyond
  the events themselves. *(ubiquitous)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); INV-6 / constitution prohibition 1; rebuildable per INV-4; querying this fold for recall/trajectory is a separate future round and deliberately not specced here; mapping-pending: true`
- **SR-052** — Where a position directive's stance contains a `revises:<event-id>`
  (or `(revises: <event-id>)`) substring, the system shall derive the referenced
  event id by scanning the stance for it and store the derived value verbatim on
  the resulting event, without removing the substring from the stored,
  byte-verbatim stance. *(optional-feature)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); amended v6.0.0 (panel-2026-08-13, divergence 3: pins the syntax — revises: is not a separate grammar slot but a read-only scan over the stance text, the same "derive without stripping" principle SR-048's ref extraction uses; the panel's own readers did not converge on this answer, each proposing an unshipped separate-slot alternative); precision override for SR-051's implicit order; interpretation belongs to a future read-path round; mapping-pending: true`
- **SR-053** — If a position directive's topic key departs from free-form
  kebab-case, then the capture path shall report a diagnostic on stderr and store the
  key byte-verbatim — never rejecting, rewriting, or normalizing it; topic keys are
  client-chosen and grouped only at read time. *(unwanted-behavior)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); report-don't-enforce (SR-034 pattern; constitution preference 3); diagnostics to stderr per INV-5 / constitution prohibition 4; mapping-pending: true`
- **SR-054** — If a captured stance line exceeds the style contract's stated word
  budget (target 40, ceiling 60 — the same numbers SR-021 states), then the capture
  path shall report the word count and the budget on stderr and store the stance
  byte-verbatim with no annotation on the record; length shall never be grounds for
  rewriting, truncating, or rejecting a position directive. *(unwanted-behavior)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); SR-034 applied to the stance line; refines SR-023 / INV-6; the ceiling stays inside the SR-101 oversized-input bound; mapping-pending: true`
- **SR-055** — The position write path shall write only to `_librarian/positions/`;
  the `session-record@1` schema, every existing session record's bytes, and the
  observable behavior of SCN-001 and SCN-002 shall be byte-for-byte unchanged before
  and after any position capture. *(ubiquitous)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); the separate-stream decision (plan HITL point 1) exists to make this provable — session schema, dedupe identity, and read-time grouping untouched; mapping-pending: true`
- **SR-056** — When the server-level instructions are extended to teach the position
  directive (its emission trigger — only when a stance was formed, changed,
  reaffirmed, or retired — and its literal grammar per SR-026's rule), the addition
  shall total at most 350 characters over the pre-change baseline of 3,030
  characters (measured via a live `dist/stdio.js` spawn and real JSON-RPC
  initialize handshake against `main` @ `631640e`, the last commit before this
  addition). *(event-driven)*
  `# ← SCN-010; added v3.12.0 (decision-graph, Phase A); AMENDED v5.0.0 — baseline corrected 2,093 -> 3,030 chars (the OBS-1 figure was stale by the time this SR was authored; independently measured by both gen-3 and gen-4 evaluators; see the v5.0.0 changelog entry above); guards SR-020/SR-026 ubiquity against instruction bloat; SR-027 propagation (README quoted block, anchor tests) applies unchanged; mapping-pending: true`
- **SR-057** — If a position directive's stance portion is empty or whitespace-only,
  then the capture path shall treat the directive as no directive at all — reporting
  a stderr diagnostic and appending nothing to either stream — rather than storing an
  empty stance. *(unwanted-behavior)*
  `# ← SCN-010; added v4.0.0 (decision-graph, Phase A; flow-panel 2026-08-12, divergence 2); mirrors SCN-001's unfilled-<template>-is-no-directive precedent (SR-029); does not establish a minimum word count — SR-054's budget stays advisory-only above zero; mapping-pending: true`

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
- **SR-104** — When a reindex runs, the note-identity pass (dead-ref detection,
  exact-hash matching, and identity-projection rebuild) shall complete within a
  stated wall-time bound at the live vault's scale (~2,300 notes, ~420 recorded
  refs). *(event-driven)*
  `# added v3.8.0 (decision-graph); the numeric bound is deliberately uncalibrated — no defensible figure exists in docs/decision-graph*.md; mapping-pending: true — TODO(flow-eval): calibrate the bound at gen-1 from measured baseline, then fix the number here by patch amendment`

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
| SCN-008 *(v3.8.0)* | exact-hash auto-bind, deterministic, ledger shape/append, projection rebuild, reindex determinism, read-surface resolution, no vault writes | SR-036, SR-039, SR-040, SR-041, SR-042, SR-045 *(v3.9.0)* | INV-2, INV-3, INV-4, INV-6 | correctness-real-v1 (COR-R-028..032, 037) + correctness-adv-v1 (COR-A-013, 015) | correctness |
| SCN-009 *(v3.8.0)* | zero-candidate unresolved, multi-candidate unresolved, non-silent render, confirmed-binding append, ledger append-only | SR-037, SR-038, SR-039, SR-043, SR-044 *(v3.9.0)*, SR-045 *(v3.9.0)*, SR-046 *(v3.10.0)* | INV-2, INV-3 | correctness-real-v1 (COR-R-033..037) + correctness-adv-v1 (COR-A-014, 016, 017; @0.7.0: 018/019 SR-046 confirmed-sticky, 020 SR-043 enrichment surface); ledger confinement/injection: security-adv-v1 (SEC-A-014/015) + SEC-R-006 control | correctness, security |
| — | identity-pass reindex performance *(v3.8.0)* | SR-104 | INV-4 | performance-real-v1 (PERF-R-006, report-only — bound calibration pending at gen-1) | performance |
| SCN-010 *(v3.12.0; amended v4.0.0, v5.0.0, v6.0.0)* | grammar+kind routing (wire format pinned), separate append-only stream, event shape (ref syntax pinned), idempotence (incl. revises in identity; cross-month scope pinned), retire-appends, deterministic fold order, explicit revises (syntax pinned), topic-key report-not-enforce, stance-budget report-not-enforce, session non-interference, instruction budget, empty-stance-is-no-directive | SR-047 *(amended v6.0.0)*, SR-048 *(amended v6.0.0)*, SR-049 *(amended v4.0.0, v6.0.0)*, SR-050, SR-051, SR-052 *(amended v6.0.0)*, SR-053, SR-054, SR-055, SR-056 *(amended v5.0.0)*, SR-057 *(v4.0.0)* | INV-2, INV-3, INV-5, INV-6 | mapping-pending: true — correctness-real-v1 + correctness-adv-v1 expected (TODO flow-eval) | correctness |

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

*(v3.8.0, effort decision-graph)* The v3.8.0 additions — SCN-008, SCN-009,
SR-036..043, SR-104 — entered entirely `mapping-pending: true` (the eval suite is
owned by `flow-eval`; this spec does not edit `evals/`). The `mapping-pending`
acknowledgment for v3.8.0 was given by the operator at flow-init decision-graph
(2026-08-04).

*(v3.8.1)* Resolved by eval suite 0.6.0 (flow-eval DESIGN pass, same day): every
SCN-008/SCN-009 acceptance criterion has a deterministic task in
`correctness-real-v1` (COR-R-028..037), the metric-gaming holdouts live in
`correctness-adv-v1` (COR-A-013..017), ledger path-confinement and
candidate-injection probes in `security-adv-v1` (SEC-A-014/015, benign control
SEC-R-006), and PERF-R-006 (report-only, no threshold) produces the gen-1 baseline
that will calibrate SR-104's wall-time bound — the one mapping still open, carried as
`mapping-pending: calibration` on its harness entry and closed by patch amendment
here after gen-1. Known suite debt, deliberately not widened into this pass:
SR-024..035 (spec v3.3.0–v3.7.0) were never mapped into the suite — a backfill
flow-eval pass is recommended; their behaviors are currently guarded by the repo's
own test suite (94 tests) rather than the eval harness.

*(v3.12.0, effort decision-graph, Phase A; v4.0.0 adds SR-057)* SCN-010 and
SR-047..057 entered entirely `mapping-pending: true` — evals/ is owned by flow-eval
and untouched by this spec round. Interim: none; Phase A has not yet been dispatched
(constitution escalation trigger 4 — a light → standard weight-class review — is
required first and is not satisfied by this spec ratification).

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
- **Unprompted (gate sense)** — an invocation pulled by a live human question or task
  in the session, whoever places the tool call. Intent attribution, not caller
  identity: "what have I been working on?" answered via `librarian-recent` is
  unprompted use even though the model executes the call; the same call made only
  because the server instructions (SR-020) tell clients to prefer these tools, with
  no human question behind it, is not. *(v3.11.0)*
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
  desirability gate measures Robin reaching for these unprompted. *(v3.8.0: reads
  from decision-graph-introduced tools or read-paths are excluded from the gate
  metric — constitution prohibition 9.)*
- **Note-identity ledger** — the append-only sidecar `_librarian/note-identity.md`
  (schema `note-identity@1`, mdbase-compatible frontmatter) recording identity
  bindings from a recorded ref path that no longer resolves to the current note that
  carries its content. Never rewritten, reordered, or compacted; the only durable
  artifact of the identity pass. *(v3.8.0)*
- **Identity binding** — one ledger entry: identity id, from-path, to-path, content
  hash, timestamp, and provenance — `detected: exact-hash` for a deterministic
  single-candidate match, `detected: confirmed` for a human-confirmed one. Those two
  are the only provenance values; there is no heuristic third kind. *(v3.8.0)*
- **Unresolved ref** — a recorded ref whose path no longer resolves and whose
  exact-hash match found zero candidates (rename plus edit) or more than one
  (duplicate content). Recorded and rendered as unresolved with its candidates;
  never auto-bound (constitution prohibition 8). *(v3.8.0)*
- **Path resolution (identity pass)** — a recorded ref's path *resolves* iff a file
  exists on disk at that vault-relative path, inside vault confinement, regardless of
  file type or whether it is an indexed markdown note. Capture may reference any
  confined vault file (the ref's hash is computed from actual bytes as-read), so the
  identity pass treats only genuinely missing paths as dead; a ref to an existing
  non-note artifact is live and is never rendered unresolved. A deleted file of any
  type is genuinely dead and follows SR-036/SR-037 exactly as a note would.
  *(v3.10.2 clarification — production finding: the notes-index reading produced 27
  false dead refs on ring-0 day one)*
- **Position** — a stance Robin holds on a topic, authored client-side (the server
  infers nothing — INV-6): formed (`assert`), changed (`revise`), re-endorsed
  (`reaffirm`), or withdrawn from listings (`retire`). A position is a projection
  over its events — rebuildable and disposable, the same rule as SQLite — never a
  stored mutable object. *(v3.12.0)*
- **Position event** — one append-only entry in the positions stream: event id,
  directive kind, topic key, stance byte-verbatim, timestamp, workspace provenance,
  refs by versioned identity, and an optional `revises: <event-id>`. Every lifecycle
  state is attributable to a moment; a retirement is an event, not a deletion
  (INV-3 / constitution prohibition 3). *(v3.12.0)*
- **Positions stream (`position-event@1`)** — the monthly append-only sidecar
  `_librarian/positions/<YYYY-MM>.md` (mdbase-compatible frontmatter, constitution
  preference 2), deliberately separate from `session-record@1` so the session schema,
  dedupe identity, and read-time grouping stay untouched. Never rewritten, reordered,
  or compacted. *(v3.12.0)*
- **Topic key** — the free-form kebab-case key a client chooses to name a position's
  topic. Client-chosen, never server-enforced or normalized (departures are reported,
  not corrected — SR-053); grouping and fold order over a topic key are read-time
  concerns. *(v3.12.0)*

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
