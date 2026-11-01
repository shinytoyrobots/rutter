---
version: "17.0.0"
status: active
effort:
  - s1-5-ambient-capture   # converged
  - decision-graph         # active (v3.8.0 Phase 0 shipped; v3.12.0 Phase A drafted; v4.0.0 panel amendments; v5.0.0 SR-056 baseline correction; v6.0.0 wire-format ratification; v7.0.0 Phase B drafted; v8.0.0 retired-stub content pinned; v9.0.0 fold timing pinned; v10.0.0 response envelope pinned; v11.0.0 incremental-clause dropped; v12.0.0 attribution semantics pinned; v13.0.0 dormancy/retirement exemption pinned; v14.0.0 not-found shape + match scope pinned; v16.0.0 Phase A position capture retired, Phase B kept as a legacy read-only surface; v17.0.0 Phase B retired, librarian-positions removed)
last-amended: 2026-11-01
mapping-pending: true      # SR-012/SR-074/SR-105 (amended v17.0.0) + SR-106/SR-107 (v17.0.0) + SCN-015/SR-073..SR-075 (v16.0.0, position retirement) + SR-056 (re-parented to SCN-006 at v16.0.0) + SCN-012/SCN-013/SR-066..SR-072 (v15.0.0, client label) + SR-104 (bound pending gen-1 calibration) — entirely unmapped, evals/ owned by flow-eval
# NOTE: the per-version snapshots named in the 'History:' pointers below (spec/history/) and the
#   panel records and proposed amendments in spec/.staging/ are kept locally and are not part of
#   the published repository; earlier commits still contain them.
pending-amendment: true    # code is ahead of this spec (rutter v0.3.0); see PENDING AMENDMENT below. No version bump until /flow-spec runs.
# PENDING AMENDMENT -- noted 2026-10-02, NOT ratified; fold in with /flow-spec.
#   Shipped in v0.3.0 (PRs #45-#47) without an amendment. Tests were updated to match;
#   the spec text below has not been.
#   1. Read-time guidance moved. SR-020/021/022 and SR-062 place read-time reporting
#      guidance (plain language, one account per session, stance attribution) in
#      SERVER_INSTRUCTIONS. It now lives in the librarian-recent and librarian-positions
#      tool descriptions. Why: Claude Code truncates server instructions at 2,048
#      characters (debug log: "truncated from 4260 to 2048 chars"); ours had reached
#      4,245, so everything after ~char 2,048 -- including the position-line instruction
#      (SR-056), which began at 2,937 -- never reached any client. SERVER_INSTRUCTIONS is
#      now ~1,940 chars, held by test/instructions-budget.test.ts. SR-056's size
#      baseline (v5.0.0) and the instruction-budget decision should be restated as a
#      TOTAL cap with the client limit as the reason. Likely also explains zero positions
#      captured since the 2026-08-13 ship (see the 2026-12-20 check-in).
#      v16.0.0: RESOLVED for SR-056 (ratified as a total cap, re-parented to SCN-006) and
#      SR-062 (now names the librarian-positions tool description). STILL PENDING for
#      SR-022 (its guidance lives in the librarian-recent description). SR-020/021 are
#      routing and authoring guidance and did stay in SERVER_INSTRUCTIONS.
#   2. New behavior with no scenario or requirement: the server builds and refreshes its
#      own index at start (src/startup-index.ts; index_meta table). It only ever calls
#      reindex(), so SR-058 (reindex is the position fold's only trigger) still holds; the
#      "disclosed lag" wording around SR-058/SR-063 should mention it. Needs its own
#      scenario: first start builds; unchanged start does not rebuild; never rebuild from a
#      partial vault walk (missing/unreadable folder keeps the existing index); a failed
#      rebuild cannot leave a stale "up to date" stamp.
#      v16.0.0: still pending. SR-058's lag clause now speaks of any change to the stream
#      on disk rather than a capture, since no capture path remains.
#   3. The server's reported version is read from package.json (single source), kept in
#      step with the plugin manifest and CHANGELOG by test/version.test.ts. Non-functional.
#      v16.0.0: still pending.
# v17.0.0 (major — position recall retired: product release v1.0.0 removes librarian-positions;
# rulings F1-F7, panel-2026-11-01.md; spec and product versions are separate numbering).
#   REMOVED: SCN-011, SR-058..SR-065, SR-076 (IDs not reused). ADDED: SR-106, SR-107. AMENDED:
#   SR-012, SR-066, SR-074, SR-105, SCN-006, SCN-012, SCN-015, scope, traceability, glossary.
#   Change record: spec-change-record-v17.0.0.md (kept locally); v16.0.0 text: spec/spec.md @ v0.10.0.
# v16.0.0 (major — position capture retired; Robin's decision 2026-11-01, Branch D of
# docs/positions-plan.md, recorded in docs/position-retirement-2026-11.md; code on branch
# feat/retire-positions). Constitution escalation trigger 1 (capture semantics) applies:
# ratification is HITL. Change record: spec-change-record-v16.0.0.md (spec/.staging, kept
# locally — see NOTE above); the full v15.0.0 text is spec/spec.md at commit d94a6fe.
#   REMOVED: SCN-010 and SR-047..SR-055, SR-057 (position capture). The IDs are retired and
#   are not reused. The positions stream they wrote is kept, frozen (SR-105), and read
#   through the legacy librarian-positions tool (SCN-011).
#   RE-PARENTED + AMENDED: SR-056 (SCN-010 -> SCN-006). Ratifies the PENDING AMENDMENT's
#   restatement as a total cap of 2,033 characters (Grok) with a 24-character label
#   allowance, no longer tied to teaching a position directive.
#   AMENDED: SCN-006 (+1 criterion); SCN-011 (legacy read-only: Given, cross-month,
#   materialization, retire-stub, attribution, topic-key, non-interference criteria; +1
#   criterion); SR-058, SR-062 (the guidance's home is the tool description), SR-065;
#   SR-059/SR-060 derivation comments only; SCN-012/SR-069 (the label is written on session
#   entries only); SCN-013/SR-071/SR-072 (one capture plus the retirement check); Purpose,
#   Phase A scope (replaced by a Retired note), Phase B scope, traceability, conformance,
#   glossary.
#   ADDED: SCN-015 (a position line emitted after retirement is reported, not stored),
#   SR-073..SR-076, SR-105. SCN-014 is skipped: docs/decision-still-holds-plan.md already
#   names a planned SCN-014.
#   Not changed: INV-1..INV-6, the constitution, session-record@1, note-identity@1,
#   position-event@1-provisional. The changelog entries below (v3.12.0..v15.0.0) still name
#   SCN-010 and SR-047..SR-057; they are history, left verbatim.
#   Mapping: every new and amended ID is mapping-pending: true (evals/ owned by flow-eval);
#   the change record lists the existing branch tests and the missing ones per ID.
# v15.0.0 (major — client label, docs/archived/client-label-plan.md): adds SCN-012 (a captured record
# names the host client that wrote it, when established) and SCN-013 (a capture never destroys
# a record it cannot read), SR-066..SR-072. Amends SR-018 and SR-049 (the label joins the
# fields excluded from idempotence identity) and deliberately extends the position-event
# field set that dissent-2026-08-13-0004 condition 4 pinned (test updated, rollout order is
# that dissent's mixed-version answer). Reverses the 0.4.0 README/CHANGELOG statement that
# records do not name the client. Per-version snapshots are untracked (see NOTE above), so no
# spec/history file was written. Mapping for SCN-012/013 pending in evals/ (flow-eval).
# v14.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b-reprobe.md
# follow-up): closes Divergence 1 (the last of that re-probe's four routed
# divergences) plus its single-reader match-scope flag, both on SR-061. v10.0.0
# pinned response cardinality (topic-key never a list) but left the not-found
# wire shape unpinned (structured field vs isError vs text — all defensible,
# and the cited precedent, librarian-get-note, isn't shown in spec text since
# S1 tools predate this spec); separately, 1 of 3 re-probe readers found SR-061
# never states whether free-text/note-identity search scans a topic's live
# event only or its full chain.
#   AMENDED: SR-061 and SCN-011's "Query modes" criterion. Not-found response:
#   a normal, non-error MCP result with one text block naming the unmatched
#   key — never isError, never a structured field. Match scope: full event
#   chain, not live-only, so a superseded stance is never silently unfindable.
#   Resolved by reading actual shipped source this time, not spec text alone
#   (the v6.0.0 discipline, extended here since the citation pointed at code):
#   src/server.ts:130-134 (librarian-get-note) and :110-116 (librarian-search)
#   both already return a plain-text sentinel in a normal success result, no
#   isError anywhere in this server. Match-scope resolved by citing the first
#   panel's own convergent FTS-over-full-event-table sketches plus this
#   project's repeated "never silently" ethos (SR-049 v4.0.0).
#   Dissent check: relevant conditions key on code landing, not spec text; none
#   fire (this amendment reads existing S1 source for precedent, generates
#   nothing).
#   Panel status: all four routed divergences from panel-2026-08-13-phase-b-reprobe.md
#   now closed, plus its single-reader flag. Two low-priority, never-routed gaps
#   remain from the first Phase B panel (gap 2: versioned-note-identity match
#   precision; gap 3: SR-064's field scope) — recommended for a future patch,
#   not decisions requiring a stop.
#   Panel: not re-run — cites shipped code convention and the panel's own
#   architecture sketches, not new interpretive surface.
#   History: spec/history/spec-v14.0.0-2026-08-13.md.
# v13.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b-reprobe.md
# follow-up): closes Divergence 4, the last of that re-probe's routed
# divergences. All 3 readers found that SR-063's dormancy computation ("not
# reaffirmed or referenced within a window") has no exemption for retired
# topics — a retired topic trivially satisfies any inactivity window, so an
# unguarded implementation would double-label it "retired" AND "dormant."
#   AMENDED: SR-063 and SCN-011's Dormant criterion. Retired topics are now
#   exempt: the dormancy check does not run for a topic whose live view is a
#   retired stub. Resolved by citing already-ratified spec text, not re-derived
#   from panel readings alone (the pattern used all round): the glossary's own
#   "Live position / dormant" entry (written at v7.0.0, before either panel found
#   this) already frames the two as distinct — dormancy flags unexplained
#   inactivity, retirement is an explained, deliberate closure.
#   Dissent check: relevant conditions key on code landing, not spec text; none fire.
#   Panel status: all four routed divergences from panel-2026-08-13-phase-b-reprobe.md
#   are now addressed except Divergence 1 (SR-061's not-found response shape),
#   still open. Also still open: the re-probe's single-reader match-scope flag,
#   and the first panel's gap 2 (versioned-note-identity match precision) and
#   gap 3 (SR-064's field scope).
#   Panel: not re-run — applies an already-ratified glossary distinction to a
#   question it already answered, not new interpretive surface.
#   History: spec/history/spec-v13.0.0-2026-08-13.md.
# v12.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b-reprobe.md
# follow-up + first Phase B panel's gap 1): closes two related findings in one
# pass — Divergence 3 of the re-probe (does a retire event's timestamp count as
# "most recent revision date," newly posable only after SR-060 pinned the
# retired stub's fields) and gap 1 of the first Phase B panel (does "revision
# date" advance on reaffirm or only revise — logged underspecified, never
# routed). Both are the same design question: which event kinds count as a
# "revision" for attribution purposes?
#   AMENDED: SR-062 and SCN-011's "Attribution, never blending" criterion.
#   "Most recent revision date" now advances ONLY on `revise` events; `reaffirm`
#   re-endorses without changing content and does not advance it. A retired
#   topic's stub additionally states its own retirement date, labeled explicitly
#   as a retirement, never presented as a "revision."
#   Resolved by citing already-ratified spec text, not re-derived from panel
#   readings alone (the pattern used all round): the glossary's own "Position"
#   entry (v3.12.0, Phase A) already glosses formed (assert) / changed (revise) /
#   re-endorsed (reaffirm) / withdrawn (retire) as four distinct meanings — only
#   `revise` is a content change, and `retire` withdraws rather than changes.
#   Dissent check: relevant conditions key on code landing, not spec text; none fire.
#   Not addressed this round (queued): Divergence 4 (SR-060 vs. Dormant), Divergence
#   1 (SR-061 not-found shape), the re-probe's single-reader match-scope flag, and
#   the first panel's gaps 2/3 — each a future amendment.
#   Panel: not re-run — applies an already-ratified glossary distinction to a
#   question it already answered, not new interpretive surface.
#   History: spec/history/spec-v12.0.0-2026-08-13.md.
# v11.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b-reprobe.md
# follow-up): closes Divergence 2 from the Phase B re-probe (run after v8/v9/v10
# amended SCN-011/SR-058/060/061), rated the sharpest of that round's four
# findings by all 3 readers. SR-058 (v9.0.0) commits every reindex to a full
# re-read of every positions file and forbids any other trigger; SR-059
# (unchanged since v7.0.0) required a full rebuild and "an incremental update
# after one new event" to agree byte-for-byte — presuming a second, incremental
# code path that SR-058's plain reading leaves no room for, degrading the clause
# into a comparison of one algorithm with itself.
#   AMENDED: SR-059 and SCN-011's "Deterministic fold, rebuildable" criterion.
#   Dropped the incremental-update clause entirely; restated as pure
#   rebuild-determinism (two full rebuilds from an unchanged event stream
#   produce byte-for-byte identical output). Resolved by citing existing project
#   convention (the v5.0.0/v6.0.0/v8.0.0/v9.0.0/v10.0.0 pattern): SCN-008's
#   note-identity ledger — this project's only other read-surface projection —
#   never had an incremental path either; SR-040/SR-041 test exactly this same
#   rebuild-twice-agrees guarantee and nothing more. Building a real incremental
#   algorithm just to give the dropped clause something to test against would add
#   complexity this project has never needed for its one analogous feature.
#   Dissent check: relevant conditions key on code landing, not spec text; none fire.
#   Not addressed this round (queued, same re-probe): Divergence 1 (SR-061 not-found
#   shape), Divergence 3 (SR-060 vs. Attribution), Divergence 4 (SR-060 vs.
#   Dormant), and the single-reader match-scope flag — each a future amendment.
#   Panel: not re-run — removes an untested claim to match what SR-058 already
#   committed to, using SR-040/041 as the template, not new interpretive surface.
#   History: spec/history/spec-v11.0.0-2026-08-13.md.
# v10.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b.md follow-up):
# closes Divergence 3, the last of the panel's three routed divergences. SR-061
# named three query modes without stating the response envelope; 2 of 3 blind
# readers had topic-key mode return a singular object, 1 of 3 argued for a
# uniform list across all three modes.
#   AMENDED: SR-061 and SCN-011's "Query modes" acceptance criterion. Topic-key
#   mode (exact match on a key unique in the fold by construction) returns a
#   single result or not-found, never a list; free-text and note-identity modes
#   (either can match multiple topics) return a list of zero or more results.
#   Resolved by citing this project's own established convention, not re-derived
#   from panel readings alone (the v5.0.0/v6.0.0/v8.0.0/v9.0.0 pattern): S1's two
#   existing read-only tools already encode this exact distinction by name —
#   `librarian-get-note` (singular lookup) vs `librarian-search` (list). Topic-key
#   mode is structurally a get; free-text/note-identity are structurally a search.
#   Dissent check: dissent-2026-08-05-0001 condition 2 keys on code landing, not
#   spec text; does not fire.
#   Panel status: all three routed divergences from panel-2026-08-13-phase-b.md
#   now closed (v8.0.0, v9.0.0, this version). Its 3 convergent-but-underspecified
#   gaps remain open by design (not routed as decisions): revision-date scope
#   (reaffirm vs. revise-only), versioned-note-identity match precision
#   (exact-version vs. version-agnostic), and SR-064's field scope (topic_key
#   alone vs. stance/refs/session-id too).
#   Panel: not re-run — cites established convention, not new interpretive
#   surface. History: spec/history/spec-v10.0.0-2026-08-13.md.
# v9.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b.md follow-up):
# closes Divergence 2 from /flow-panel's first read of Phase B. SR-058 named
# "when a reindex runs" as the fold's trigger; SR-059 required a full rebuild and
# an incremental update to agree byte-for-byte without saying what triggers the
# incremental update. 1 of 3 blind readers wired it synchronously into SCN-010's
# write path (instant read-after-write); 1 of 3 kept it reindex-only; the third
# left it genuinely open in their own sketch.
#   AMENDED: SR-058 (reindex is the fold's ONLY trigger; no code path outside
#   reindex, including SCN-010's write path, may invoke it). ADDED: a new SCN-011
#   acceptance criterion ("Materialization is reindex-triggered only") stating the
#   user-observable consequence — a position is not visible to librarian-positions
#   until the next reindex runs — as observable behavior, not just system wording.
#   Resolved by citing existing project convention, not re-derived from panel
#   readings alone (the v5.0.0/v6.0.0/v8.0.0 pattern): SCN-008's note-identity
#   ledger is this project's only other read-surface projection over an
#   append-only _librarian/ stream, and its own text says its tables are
#   "rebuilt at reindex" — no feature here has ever used a write-time hook. This
#   keeps SR-065's non-interference guarantee true BY CONSTRUCTION (Phase B code
#   never runs near Phase A's write path) rather than by proving a hook
#   additive-only after the fact.
#   Dissent check: dissent-2026-08-05-0001 condition 2 and dissent-2026-08-13-0004
#   conditions 1/4 all key on code landing, not spec text; none fire.
#   Not addressed this round (queued, same panel): Divergence 3 (query response
#   envelope shape) — its own future amendment. Panel: not re-run — cites
#   established convention, not new interpretive surface.
#   History: spec/history/spec-v9.0.0-2026-08-13.md.
# v8.0.0 (major — effort decision-graph, panel-2026-08-13-phase-b.md follow-up):
# closes Divergence 1 from /flow-panel's first read of Phase B (run immediately
# after v7.0.0 drafted SCN-011). 3 blind readers split on whether the default-view
# "retired stub" a topic renders includes the retire event's own client-authored
# stance, or suppresses it: 2 of 3 suppressed, 1 of 3 included.
#   AMENDED: SCN-011's "Retire is a terminal marker" acceptance criterion, SR-060.
#   Resolved by checking already-ratified Phase A text rather than re-deriving from
#   panel readings alone (the v5.0.0/v6.0.0 pattern): SR-057 already requires every
#   valid retire directive to carry a non-empty stance, no carve-out for retire —
#   so suppressing that stance from the stub would discard real client-authored
#   content on EVERY retirement, not an edge case. The stub now carries the retire
#   event's own kind, timestamp, session id, refs, and stance in full, using the
#   same uniform event shape SR-048 already gives every event — no new field.
#   Dissent check: dissent-2026-08-05-0001 condition 2 and dissent-2026-08-13-0004
#   condition 4 both key on code landing, not spec text; neither fires (spec-only
#   change, no new field, no Phase B code exists yet).
#   Not addressed this round (queued, same panel): Divergence 2 (fold materialization
#   timing vs. SR-065 non-interference) and Divergence 3 (query response envelope
#   shape) — each its own future amendment. Panel: not re-run — codifies an answer
#   already derivable from ratified SR-057 text, not new interpretive surface.
#   History: spec/history/spec-v8.0.0-2026-08-13.md.
# v7.0.0 (major — effort decision-graph, Phase B): drafts SCN-011 (position
# recall with supersession — the read path for docs/decision-graph-plan.md's
# capability #3) and its derived requirements SR-058..SR-065, per escalation
# trigger 5's gates (both cleared 2026-08-12, covering Phases A-C, not just
# Phase A — see docs/gate-verdict-2026-08.md and the wish-log entries dated
# 2026-08-11/12). Folds in one more spec-vs-code correction found while
# drafting this round: SR-048 (and every other normative reference) still
# named the schema `position-event@1`, but the shipped schema id is
# `position-event@1-provisional` (`src/positions.ts#SCHEMA_ID` — the
# dissent-2026-08-13-0004 M1 mitigation). Since Phase B's fold reads exactly
# this schema, an uncorrected reference here would have been the same
# spec-vs-code gap class this effort just spent two rounds closing for the
# wire format — corrected in the same pass rather than inherited.
#   AMENDED (schema-id correction, folded into this round, not a separate
#   bump): SR-048, SCN-010's Then-clause and "Separate stream" criterion, the
#   Phase A scope summary, and the glossary's "Positions stream" entry — all
#   five normative references corrected `position-event@1` ->
#   `position-event@1-provisional`. The v3.12.0 changelog entry describing
#   what Phase A originally proposed is left untouched (historically accurate
#   at the time it was written).
#   ADDED: SCN-011 + SR-058..SR-065 (Phase B scope section below; full
#   scenario in Behavioral scenarios). Mechanism matches
#   docs/decision-graph-plan.md's Phase B section as designed, plus five
#   corrections HANDOFF.md's ground-truth notes (2026-08-13 session) surfaced
#   from Phase A's actual implementation that the 2026-08-04 plan doc
#   couldn't have known: (1) the wire format is the ratified v6.0.0 tag, not
#   the plan's assumed shared channel; (2) the fold must read across ALL
#   month files, mirroring SR-049's already-corrected cross-month scope, not
#   just the current one; (3) `retire` is a terminal marker computed at read
#   time — there is no stored deleted state to query; (4) `topic_key` is
#   unsanitized/unbounded at storage (SG-10) and must go through the same
#   inert-rendering treatment other client-authored text already gets before
#   this read surface prints one to a terminal; (5) instrumentation exclusion
#   is ALREADY DECIDED by constitution prohibition 9 — SR-062 below cites it,
#   does not re-derive it.
#   Escalation trigger 4 (light -> standard weight-class promotion review) is
#   NOT cleared by this spec round and applies again here: Phase B's read-time
#   attribution guidance (SR-062) extends SERVER_INSTRUCTIONS, which is
#   exactly the surface trigger 4 names. This round satisfies trigger 1
#   (capture/appraisal-semantics HITL — nothing here touches capture, but the
#   trigger's spirit of "load-bearing, still-open design" HITL is honored via
#   the Mode-1 gate below) and trigger 5 (already cleared for Phases A-C), not
#   trigger 4 — that stays a separate, not-yet-cleared gate before any
#   `/flow-generate` dispatch, exactly as Phase A's own spec round flagged for
#   itself.
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

### Effort: decision-graph (Phase 0; Phases A and B retired) *(v3.8.0, v3.12.0, v16.0.0, v17.0.0)*

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
2026-08-11/12). **Phase A (position capture) entered scope at v3.12.0 and was
retired at v16.0.0** (Robin, 2026-11-01; `docs/position-retirement-2026-11.md`) —
see the Retired notes in the Phase A scope section and at SCN-010. **Phase B
(position recall with supersession) entered scope at v7.0.0 and was retired at
v17.0.0**, when product release v1.0.0 removes the `librarian-positions` tool — see
the Retired note in the Phase B scope section. **Phases C–D (drift visibility and threads,
optional backfill) remain OUT of scope.** With capture retired they have no new data
to build on; re-entering scope would first require reversing the retirement (the
conditions that would do so are listed in `docs/position-retirement-2026-11.md`).

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

### Effort: decision-graph (Phase A) — scope *(v3.12.0; retired v16.0.0)*

**Retired.** Position capture — the `librarian-position` directive, its routing, and
every write to `_librarian/positions/` — was retired by Robin on 2026-11-01
(`docs/position-retirement-2026-11.md`). Nothing remains in scope here: no production
code path writes a position event (SR-105), a position line that still arrives is
reported and not stored (SCN-015), and the server-level instructions no longer teach
it (SR-073). The stream already on disk is kept, frozen, as the user's own history
(SR-105); from v17.0.0 nothing reads it. The v15.0.0 text of this section, of
SCN-010, and of SR-047..SR-055 and SR-057 is archived in the v16.0.0 change record
(`spec-change-record-v16.0.0.md`, kept locally with the other per-version records)
and in `spec/spec.md` at commit `d94a6fe`.

### Effort: decision-graph (Phase B) — scope *(v7.0.0; retired v17.0.0)*

**Retired.** Position recall — the reindex fold, its projection tables, and the
`librarian-positions` tool — is removed in product release v1.0.0. Nothing remains in
scope: the server registers no such tool (SR-107), and reindex neither reads the
positions files nor keeps position tables (SR-105). The v16.0.0 text of this section is
in `spec/spec.md` as published in v0.10.0; SCN-011, SR-058..SR-065 and SR-076 are also
archived in the v17.0.0 change record (`spec-change-record-v17.0.0.md`, kept locally).

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
- *(v16.0.0)* **No position contract, and the whole text fits.** The declared
  instructions, and every client rules file the installer writes from them, neither
  teach a position line nor route any question to `librarian-positions` — position
  capture is retired (SCN-015). The whole instruction text stays within the tightest
  client's limit (2,033 characters, with a 24-character display name allowed for),
  so nothing a client needs is cut off.

**Derived requirements:** SR-019, SR-020, SR-025, SR-026, SR-027, SR-028, SR-035,
SR-056, SR-073

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
are fine); credit the user when they decided, chose, ruled on, or corrected the
outcome, not merely for asking, and keep any reason given; aim for about 40 words
and stop by 60 — one line, no build-log density;
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

### SCN-010: *Retired v16.0.0* — position capture *(was: v3.12.0, effort decision-graph, Phase A)*

Position capture was retired on 2026-11-01 (`docs/position-retirement-2026-11.md`).
This scenario and its derived requirements SR-047..SR-055 and SR-057 are removed;
SR-056 is re-parented to SCN-006. The IDs are not reused. The archived text is in the
v16.0.0 change record (`spec-change-record-v16.0.0.md`, kept locally with the other
per-version records) and in `spec/spec.md` at commit `d94a6fe`. What a client now
sees when it still emits a position line: SCN-015.

---

### SCN-011: *Retired v17.0.0* — position recall *(was: v7.0.0, effort decision-graph, Phase B)*

Position recall is removed in product release v1.0.0 (Robin, 2026-11-01;
`panel-2026-11-01.md` F4). This scenario and its derived requirements SR-058..SR-065
and SR-076 are removed; SR-065's guarantee that indexing and queries leave session
records unchanged survives as SR-106, and the removed tool's behavior is SR-107. The
IDs are not reused. The archived text is in the v17.0.0 change record
(`spec-change-record-v17.0.0.md`, kept locally) and in `spec/spec.md` as published in
v0.10.0.

---

### SCN-012: A captured record names the host client that wrote it, when that is established *(v15.0.0, client label; amended v16.0.0, v17.0.0)*
**Given** one notes folder is written by Claude Code, Grok, Codex, and Antigravity
through the same Stop hook
**When** the hook captures a session summary
**Then** the entry shall carry a `client` label — exactly one of `claude`,
`grok`, `codex`, `agy` — only where the original envelope's shape and the
installer-supplied identity agree, and no label otherwise, so a reader can tell which
client stopped writing summaries without reading logs or guessing.

**Acceptance criteria:**
- The label names the host client, never the model, and is metadata only: the summary
  stays byte-verbatim (SR-023, INV-6), and the label is shown in frontmatter, not the
  human-readable body.
- The host is classified from the ORIGINAL envelope, before Antigravity normalization
  rewrites it, by the table in `src/client.ts`: Antigravity shape => `agy`; camelCase
  `lastAssistantMessage` => `grok`; the installer identity (`--client` or
  `RUTTER_CLIENT`) supplies the rest. `last_assistant_message` distinguishes nothing.
- Any case the table cannot settle gets no label: conflicting identity and shape,
  contradictory shape, a direct capture payload, an unrecognized identity (a typo, a
  different case, a future client — never treated as absent), two disagreeing identity
  sources, and Codex with no identity. Entries from hooks registered before the identity
  existed, and all pre-existing records, show none.
- The field is **additive-optional** on `session-record@1` (schema id unchanged).
  Stored as a plain string: an unfamiliar value is preserved on rewrite and ignored by
  readers, never an error.
- The label never participates in idempotence identity.
- Rollout is two releases: label-preserving readers and writers ship, and every active
  writer is confirmed on them, before any writer emits a label — an older writer
  strips unknown keys on every append.

**Derived requirements:** SR-066, SR-067, SR-068, SR-069, SR-070

---

### SCN-013: A capture never destroys a record it cannot read *(v15.0.0, client label; amended v16.0.0)*
**Given** a day's session file already exists but fails validation (hand-edited,
truncated, or written by something else)
**When** a capture targets that file
**Then** the file shall be left byte-identical, the capture shall report that nothing
was recorded and why, and the retired-position check in the same hook run (SCN-015)
shall still run.

**Acceptance criteria:**
- An existing file that fails validation is never rewritten; an absent file still
  starts a fresh record.
- The result is `failed` with a reason (`unparseable-record` or `write-error`), never
  `captured`; stderr names the file and is distinct from "nothing to capture"; the hook
  still exits 0 (INV-5, a hook failure must never break the session).
- Session capture and the retired-position check run independently: a failure or
  unexpected throw in one never skips the other. A positions file that fails
  validation has no effect on session capture.

**Derived requirements:** SR-071, SR-072

---

### SCN-015: A position line emitted after retirement is reported, not stored *(v16.0.0, position retirement; amended v17.0.0)*

*(v17.0.0)* This scenario has no sunset: it stays in force after product release v1.0.0
removes `librarian-positions`.

**Given** position capture is retired, and a client still emits a `librarian-position`
comment — from a rules file installed before the retirement, a session started before
the upgrade, or a model that remembers the old grammar — or a caller sends a direct
`position` field
**When** the Stop hook runs for that turn
**Then** nothing is stored as a position, the hook writes one stderr line saying
position capture is retired and the position line was not stored, and a session line
in the same turn is captured exactly as it would be without the position line.

**Acceptance criteria:**
- **Nothing stored.** No file under `_librarian/positions/` is created, appended to,
  or modified by the run.
- **One notice.** The run writes exactly one stderr line containing "position capture
  is retired" and "not stored". A malformed position comment (empty stance,
  unrecognized kind, empty topic key) gets the same notice. Nothing is written to
  stdout, and the hook exits 0 (INV-5).
- **Scope of the check.** The notice is triggered by a direct `position` field or by
  a `librarian-position` comment in the turn reply (see Glossary). It is never
  triggered by the session's accumulated transcript, so a session that only discusses
  the tag, or a user message that echoes it, gets no notice.
- **Session line unaffected.** A session directive in the same turn is stored with
  the same summary, refs, workspace provenance, and client label as the same turn
  would produce without the position line; replaying the turn stays a byte-identical
  no-op (SR-013).
- **Disclosed limitation.** A host whose Stop event carries no turn reply, and whose
  transcript the hook does not read per turn, gets no notice for a position comment.
  Nothing is stored in that case either.

**Derived requirements:** SR-074, SR-075

---

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
  Historical `librarian-positions` lines in `stateful-use.jsonl` remain in the log, and
  every reader of the log shall skip them without error and without counting them.
  *(ubiquitous)* `# ← SCN-004; amended v17.0.0 (historical lines from the removed tool; TODO(flow-eval): no test reads a log containing one; mapping-pending: true)`
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
- **SR-018** — Workspace provenance and the host-client label (SR-066) shall not
  participate in idempotence identity: a capture whose directive content is unchanged
  per SR-013 shall remain a byte-identical no-op regardless of provenance or client
  differences. *(ubiquitous)*
  `# ← SCN-005; added v3.1.0; amended v15.0.0 (client)`
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
- **SR-047..SR-055, SR-057** — *Retired v16.0.0* with SCN-010 (position capture:
  grammar and routing, stream shape, idempotence, retire-as-event, fold order,
  `revises`, topic-key and stance-budget diagnostics, session non-interference,
  empty-stance handling). The IDs are not reused. The text is archived in the v16.0.0
  change record and in `spec/spec.md` at commit `d94a6fe`.
  `# retired v16.0.0 (Robin, 2026-11-01; docs/position-retirement-2026-11.md)`
- **SR-056** — The server-level instructions shall total at most 2,033 characters —
  the tightest client limit (Grok) — even when the display name is 24 characters
  long, each occurrence of the label counted at that length. *(ubiquitous)*
  `# ← SCN-006 (re-parented from SCN-010 at v16.0.0); added v3.12.0; amended v5.0.0 (baseline corrected 2,093 -> 3,030 chars); amended v16.0.0 — ratifies the PENDING AMENDMENT's restatement as a total cap with a 24-char label allowance (replacing the 350-character increment over a 3,030-character baseline) and drops the "when extended to teach the position directive" trigger, since no position directive is taught any longer; held by test/instructions-budget.test.ts; guards SR-020/SR-026 ubiquity against instruction bloat; SR-027 propagation (README quoted block, anchor tests) applies unchanged; mapping-pending: true`
- **SR-058..SR-065** — *Retired v17.0.0* with SCN-011 (position recall: cross-month
  fold, reindex-only trigger, deterministic fold, retired stub, query modes,
  attribution, dormancy, inert topic keys, non-interference). The IDs are not reused;
  SR-065's session-record guarantee survives as SR-106. The text is archived in the
  v17.0.0 change record and in `spec/spec.md` as published in v0.10.0.
  `# retired v17.0.0 (Robin, 2026-11-01; panel-2026-11-01.md F4)`

- **SR-066** — Session entries shall accept an optional `client`
  field stored as a plain string, with schema ids unchanged; a stored value this build
  does not recognize shall be preserved on rewrite and ignored by readers, and shall
  never cause a record to fail validation. *(ubiquitous)*
  `# ← SCN-012; added v15.0.0; amended v17.0.0 (position-event clause dropped: nothing reads position events); mapping-pending: true`
- **SR-067** — When the capture hook receives a Stop envelope, the system shall classify
  the host client from the original envelope, before any normalization, and shall write
  `client` only for a (shape, explicit identity) pair the `src/client.ts` table
  resolves to `claude`, `grok`, `codex`, or `agy`. *(event-driven)*
  `# ← SCN-012; added v15.0.0; mapping-pending: true`
- **SR-068** — If the shape and identity conflict, the shape is contradictory, the
  payload is a direct capture, the explicit identity is unrecognized or its sources
  disagree, or the host is Codex without an identity, then the system shall omit the
  `client` field. *(unwanted-behavior)*
  `# ← SCN-012; added v15.0.0; mapping-pending: true`
- **SR-069** — The `client` label shall not participate in idempotence identity
  (SR-013) and shall never appear in or alter summary text.
  *(ubiquitous)* `# ← SCN-012; added v15.0.0; extends SR-018; amended v16.0.0 (position idempotence and stance text retired with SCN-010); mapping-pending: true`
- **SR-070** — No writer shall emit a `client` label until a release that preserves it
  has shipped and every active writer is confirmed on it, and each capture diagnostic
  shall name the build version so a stale writer is observable. *(ubiquitous)*
  `# ← SCN-012; added v15.0.0; process requirement, verified by the mixed-version append probe test; mapping-pending: true`
- **SR-071** — If the destination session file exists and fails validation, then the
  system shall append nothing, leave it byte-identical, and report `failed` (reason
  `unparseable-record`, or `write-error` for a failed atomic write) rather than
  `captured`. *(unwanted-behavior)*
  `# ← SCN-013; added v15.0.0; refines INV-3; amended v16.0.0 (positions files are no longer a capture destination); mapping-pending: true`
- **SR-072** — The system shall run session capture and the retired-position check
  (SR-074) each in its own guard, so a failure or unexpected error in one never
  prevents the other. *(ubiquitous)*
  `# ← SCN-013; added v15.0.0; amended v16.0.0 (position capture replaced by the retirement check; verified by test/record-guard.test.ts "a corrupt session day is reported, and the retired position field still writes nothing"); mapping-pending: true`
- **SR-073** — The server-level instructions, and any client rules text the
  installer derives from them, shall neither include the position directive's syntax
  nor direct any question to `librarian-positions`; the string `librarian-position`
  shall not appear in either. *(ubiquitous)*
  `# ← SCN-006; added v16.0.0 (position retirement); verified by test/instructions-budget.test.ts "position capture is retired" and test/install-hook.test.ts (Antigravity rules file); TODO(flow-eval): no test asserts this for the other installer-written rules files (they are built from the instructions, so the instructions test covers them only indirectly); mapping-pending: true`
- **SR-074** — If a capture invocation carries a direct `position` field, or its turn
  reply contains an HTML comment whose first token is `librarian-position`
  (terminated or not; a plain-prose mention does not count), then the
  capture path shall store no position event, shall create or modify no file under
  `_librarian/positions/`, and shall write exactly one stderr line stating that
  position capture is retired and the position line was not stored; the check shall
  read only the direct field and the turn reply, never the session's accumulated
  transcript. *(unwanted-behavior)*
  `# ← SCN-015; added v16.0.0 (position retirement); amended v17.0.0 (trigger defined, F7; matches the shipped pattern /<!--\s*librarian-position\b/ in src/capture-cli.ts, which a "librarian-positions" token does not match); verified by test/codex-capture.test.ts (CODEX-2, CODEX-4b), test/antigravity-capture.test.ts (AGY-6), test/record-guard.test.ts (direct field); TODO(flow-eval): no test counts the notice lines (tests match, not count) or proves that a mention outside the turn reply gets no notice; mapping-pending: true`
- **SR-075** — When a capture invocation carries both a session directive and a
  position line, the system shall capture the session directive exactly as it would
  if the position line were absent: the stored entry shall be identical in every
  field except capture time, and a replay of the same turn shall remain a
  byte-identical no-op (SR-013). *(event-driven)*
  `# ← SCN-015; added v16.0.0 (position retirement); verified in part by CODEX-3, CODEX-5, AGY-1, AGY-4, CP-1 (summary and replay); TODO(flow-eval): docs/positions-plan.md 2.D step 2 promised a field-by-field comparison against a position-free control turn — not present on the branch; mapping-pending: true`
- **SR-076** — *Retired v17.0.0* with SCN-011 (the legacy tool's "retired" title and
  description). The ID is not reused; what replaces it is SR-107. The text is archived
  in the v17.0.0 change record and in `spec/spec.md` as published in v0.10.0.
  `# retired v17.0.0 (Robin, 2026-11-01; panel-2026-11-01.md F3/F4)`

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
- **SR-105** — No production code shall create, change or delete any file under
  `_librarian/positions/`, and reindex shall neither read those files nor keep any
  position table (a table left by an earlier build is dropped at the next reindex);
  the files stay on disk as the user's own history. *(ubiquitous)*
  `# added v16.0.0 (position retirement); restated v17.0.0 (F2); refines INV-3 / constitution prohibition 3; no scenario parent; capture side verified by the "no positions file" assertions in test/codex-capture.test.ts, test/antigravity-capture.test.ts and test/record-guard.test.ts; TODO(flow-eval): no surviving test for the reindex side (no read, tables dropped) — its former verifier, test/position-recall.test.ts "SR-065 (MANDATORY)", is deleted with the tool; mapping-pending: true`
- **SR-106** — Reindexing and every tool query shall leave each `session-record@1`
  file byte-for-byte unchanged and shall not change SCN-001/SCN-002 behavior.
  *(ubiquitous)*
  `# added v17.0.0; carries forward the general part of retired SR-065 (re-parented as SR-056 was at v16.0.0); refines INV-3; TODO(flow-eval): no surviving test — its former verifier, test/position-recall.test.ts "SR-065 (MANDATORY)", is deleted with the tool; mapping-pending: true`
- **SR-107** — The server shall register no tool named `librarian-positions`, and a
  call to that name shall get the same standard unknown-tool error the MCP SDK gives
  any unregistered tool, with no stub handler. *(ubiquitous)*
  `# added v17.0.0 (F1, Robin 2026-11-01); no scenario parent; TODO(flow-eval): no test yet (none in the repo calls an unregistered tool); mapping-pending: true`

---

## Traceability

| Scenario | Acceptance criteria → | Derived SRs | Related INV | Dataset (pending) | Grader (pending) |
|----------|------------------------|-------------|-------------|-------------------|------------------|
| SCN-001 | capture, idempotence, revision, storage, versioned ref, empty no-op, unfilled template, incremental authoring | SR-001, SR-002, SR-003, SR-004, SR-013, SR-014, SR-024, SR-029, SR-033 | INV-2, INV-3 | correctness-real-v1 | correctness |
| SCN-002 | order, provenance, window, empty-state, grouped, count-caps-sessions, detail, never-merged | SR-005, SR-006, SR-007, SR-030, SR-031, SR-032 | INV-6 | correctness-real-v1 | correctness |
| SCN-003 | annotate, quiet, no re-rank | SR-008, SR-009, SR-010 | — | correctness-real-v1 | correctness |
| SCN-004 | log events, weekly count, historical lines tolerated *(v17.0.0)* | SR-011, SR-012 *(amended v17.0.0; mapping-pending)* | INV-4 | correctness-real-v1 | correctness |
| SCN-005 | auto provenance, local-reads-only, never-blocks, additive-optional, dedupe-unchanged, inert | SR-015, SR-016, SR-017, SR-018 | INV-1, INV-2 | correctness-real-v1, security-adv-v1 | correctness, security |
| SCN-006 | server instructions, project display, project filter, no-behavior-drift, no-user-authored-contract, single-source, per-outcome-trigger, no-position-contract + total cap *(v16.0.0)* | SR-019, SR-020, SR-025, SR-026, SR-027, SR-028, SR-035, SR-056 *(re-parented v16.0.0; mapping-pending)*, SR-073 *(v16.0.0; mapping-pending)* | — | correctness-real-v1 | correctness |
| SCN-007 | authoring contract in instructions, read-time render guidance, directive-rule deployment, verbatim storage, no retrofit, no-behavior-drift, length-budget | SR-021, SR-022, SR-023, SR-034 | INV-3, INV-6 | correctness-real-v1, correctness-adv-v1 | correctness |
| SCN-012 *(amended v16.0.0, v17.0.0)* | host label (session entries), classify-from-original-envelope, absent-beats-wrong, additive-optional/tolerant, not-identity, two-release rollout | SR-066 *(amended v17.0.0)*, SR-067, SR-068, SR-069 *(amended v16.0.0)*, SR-070 | INV-6 | (pending) | (pending) |
| SCN-013 *(amended v16.0.0)* | no-overwrite, failed-not-captured, independent session capture and retirement check | SR-071 *(amended v16.0.0)*, SR-072 *(amended v16.0.0)* | INV-3, INV-5 | (pending) | (pending) |
| SCN-015 *(v16.0.0; no sunset, v17.0.0)* | nothing stored, one notice, scope of the check (turn reply only), session line unaffected, disclosed limitation | SR-074 *(amended v17.0.0)*, SR-075 | INV-3, INV-5 | mapping-pending: true — existing repo tests listed on each SR (TODO flow-eval) | (pending) |
| — | mdbase-compatible frontmatter | SR-100 | — | schema-real-v1 | schema-conformance |
| — | untrusted-input handling | SR-101 | INV-2 | adversarial-input-v1 | safety |
| — | repo hygiene | SR-102 | — | repo-hygiene-v1 | safety |
| — | docs currency at ship | SR-103 | — | docs-currency-real-v1 | docs-currency |
| — | frozen positions stream, not read by reindex *(v16.0.0; restated v17.0.0)* | SR-105 | INV-3 | mapping-pending: true (TODO flow-eval) | (pending) |
| — | indexing and queries leave session records unchanged *(v17.0.0, from SR-065)* | SR-106 | INV-3 | mapping-pending: true (TODO flow-eval) | (pending) |
| — | removed tool gets the standard unknown-tool error *(v17.0.0)* | SR-107 | — | mapping-pending: true (TODO flow-eval) | (pending) |
| — | local-first | (INV-1) | INV-1 | adversarial-network-v1 | invariant-local-first |
| — | store immutability | (INV-2) | INV-2 | adversarial-write-v1 | invariant-store-immutable |
| — | no hard-delete | (INV-3) | INV-3 | adversarial-delete-v1 | invariant-no-hard-delete |
| — | rebuildability | (INV-4) | INV-4 | rebuild-real-v1 | invariant-rebuildable |
| — | stdout purity | (INV-5) | INV-5 | adversarial-stdout-v1 | invariant-stdout-pure |
| — | no LLM in server | (INV-6) | INV-6 | adversarial-inference-v1 | invariant-no-llm |
| SCN-008 *(v3.8.0)* | exact-hash auto-bind, deterministic, ledger shape/append, projection rebuild, reindex determinism, read-surface resolution, no vault writes | SR-036, SR-039, SR-040, SR-041, SR-042, SR-045 *(v3.9.0)* | INV-2, INV-3, INV-4, INV-6 | correctness-real-v1 (COR-R-028..032, 037) + correctness-adv-v1 (COR-A-013, 015) | correctness |
| SCN-009 *(v3.8.0)* | zero-candidate unresolved, multi-candidate unresolved, non-silent render, confirmed-binding append, ledger append-only | SR-037, SR-038, SR-039, SR-043, SR-044 *(v3.9.0)*, SR-045 *(v3.9.0)*, SR-046 *(v3.10.0)* | INV-2, INV-3 | correctness-real-v1 (COR-R-033..037) + correctness-adv-v1 (COR-A-014, 016, 017; @0.7.0: 018/019 SR-046 confirmed-sticky, 020 SR-043 enrichment surface); ledger confinement/injection: security-adv-v1 (SEC-A-014/015) + SEC-R-006 control | correctness, security |
| — | identity-pass reindex performance *(v3.8.0)* | SR-104 | INV-4 | performance-real-v1 (PERF-R-006, report-only — bound calibration pending at gen-1) | performance |
| SCN-010 *(retired v16.0.0)* | — (position capture retired; archived in the v16.0.0 change record and `spec/spec.md` @ `d94a6fe`) | — (SR-047..SR-055, SR-057 retired; SR-056 re-parented to SCN-006) | — | — (its mapping-pending debt is retired with it) | — |
| SCN-011 *(retired v17.0.0)* | — (position recall removed in product v1.0.0; archived in the v17.0.0 change record and `spec/spec.md` @ v0.10.0) | — (SR-058..SR-065, SR-076 retired; SR-065's session guarantee survives as SR-106) | — | — (its mapping-pending debt is retired with it) | — |

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
required first and is not satisfied by this spec ratification). *(v16.0.0: retired.
SCN-010 and SR-047..SR-055/SR-057 are removed, and their mapping-pending debt goes
with them; SR-056 survives, re-parented to SCN-006, and is still pending.)*

*(v16.0.0, position retirement)* SCN-015, SR-073..SR-076 and SR-105 enter
`mapping-pending: true`, as do the amended SR-056, SR-058, SR-062, SR-065, SR-069,
SR-071 and SR-072 (evals/ owned by flow-eval; this spec does not edit it). Interim:
the repo's own test suite on branch `feat/retire-positions` guards most of this
behavior. Each new SR's derivation comment names the tests that verify it and the
tests still missing: a count of the retirement notice and a turn-reply-only proof
(SR-074); a field-by-field control-turn comparison (SR-075); the tool's retired
title and description (SR-076); and a structural no-production-writer check for the
positions stream (SR-105).

*(v17.0.0, position recall retired)* SCN-011, SR-058..SR-065 and SR-076 are removed,
and their mapping-pending debt goes with them; `test/position-recall.test.ts` goes
with the tool. SR-106 and SR-107 enter `mapping-pending: true`, as do the amended
SR-012, SR-066, SR-074 and SR-105. Missing tests: session records unchanged by
reindex and queries (SR-106), the unknown-tool error for `librarian-positions`
(SR-107), reindex ignoring the positions files and dropping old tables (SR-105), and a
log containing historical `librarian-positions` lines (SR-012).

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
- **Turn reply** — the assistant text the capture hook attributes to the current turn:
  the Stop event's own assistant-message field where the host sends one (Claude, Grok,
  Codex), or, for hosts that send none (Antigravity, Copilot CLI), the current turn's
  assistant text read from the host's transcript. Never the session's accumulated
  transcript as a whole. *(v16.0.0)*
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
  stored mutable object. *(v3.12.0)* *(v16.0.0: capture is retired — no new
  positions are recorded.)* *(v17.0.0: recall is retired too — the server no longer
  reads positions; existing ones stay on disk as the user's own history, SR-105.)*
- **Position event** — one append-only entry in the positions stream: event id,
  directive kind, topic key, stance byte-verbatim, timestamp, workspace provenance,
  refs by versioned identity, and an optional `revises: <event-id>`. Every lifecycle
  state is attributable to a moment; a retirement is an event, not a deletion
  (INV-3 / constitution prohibition 3). *(v3.12.0)*
- **Positions stream (`position-event@1-provisional`)** — the monthly append-only sidecar
  `_librarian/positions/<YYYY-MM>.md` (mdbase-compatible frontmatter, constitution
  preference 2), deliberately separate from `session-record@1` so the session schema,
  dedupe identity, and read-time grouping stay untouched. Never rewritten, reordered,
  or compacted. *(v3.12.0)* *(v16.0.0: frozen — no production code path writes to it
  at all, SR-105.)* *(v17.0.0: and nothing reads it; reindex ignores it.)*
- **Topic key** — the free-form kebab-case key a client chose to name a position's
  topic. Client-chosen, never server-enforced or normalized (departures were
  reported, not corrected, by the retired capture path). *(v3.12.0; v16.0.0;
  v17.0.0: no read surface remains, so nothing groups or folds by it.)*

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
