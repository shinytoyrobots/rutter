# Roadmap — rutter

**Written:** 2026-08-03
**Amended:** 2026-08-05 — gate axis reframed from call origin to intent (Phase 0, kill
conditions); discursive-librarian direction added (Phase 5).
**Amended:** 2026-10-10 — unprompted recall noted as a future possibility, outside Phase 5.
**Amended:** 2026-10-18 — Phase 6 added: state the host-integration rules once.
**Amended:** 2026-10-19 — Phase 7 added: a Grok install path that needs no Claude Code.
**Amended:** 2026-10-19 — brought up to date: Phases 0–2, 6 and 7 are done, Phase 3's
Phases A–B shipped, and the work that shipped outside the phases (npm, the MCP Registry, the
client label, Copilot CLI, Muse Code, the Actions Node 24 move) is recorded under "Since the
phases were written".
**Status:** proposal, not ratified. `spec/spec.md` remains the executable source of truth;
nothing here is a requirement until it lands there.
**Purpose:** high-level sequencing for work after the S1.5 desirability gate. Phases are
ordered by dependency, not by calendar. Each carries an explicit exit condition.

---

## Where this stands (2026-10-19)

v0.8.2. The desirability gate and the read-value question both came back PASS (Phases 0
and 1). The repo is public and MIT (Phase 2). Position capture and position recall
shipped (Phase 3, Phases A–B). Spec is at v15.0.0. Six clients have a supported hook.

Open: decision-graph Phases C–D and the backfill decision (Phase 3), the Phase 5 and
unprompted-recall directions (no build scheduled), and the site work under "Since the
phases were written".

The two live problems named on 2026-08-03 are closed: the gate's blind spot to call
intent (Phase 0) and summary-length drift (Phase 1, spec v3.6.0 with a drift test).

---

## Since the phases were written

Work that shipped without its own phase. Plans for it are in `docs/archived/`.

- **npm and the MCP Registry.** `rutter-memory` is on npm and `server.json` lists it in the
  official Registry, first in v0.6.2. Releases are staged for manual approval, then
  published from CI. (`archived/npm-plan.md`, `archived/mcp-registry-plan.md`)
- **Client label** (spec v15.0.0, SCN-012). Captured records carry the host client that
  wrote them. (`archived/client-label-plan.md`)
- **GitHub Copilot CLI** (v0.7.0) and **Meta Muse Code** (v0.8.0), bringing the supported
  clients to six. (`archived/copilot-cli-plan.md`, `archived/muse-code-plan.md`)
- **Actions off Node 20** (v0.8.2). `actions/checkout` and `actions/setup-node` are at v7,
  and `registry.yml` smoke-tests the pinned `mcp-publisher`, including on Ubuntu 26.04.
  (`archived/actions-node24-plan.md`)
- **Docs site.** The 2026-10-09 revision plans and the homepage positioning plan are
  archived. The cold-reader fixes were ported to gh-pages (PR #130), followed by a
  field-log redesign (#132) and the Grok callout (#134). Still open: the site motto
  (`cold-reader-fixes-plan.md`), and whether the field-log redesign closes
  `field-log-design-plan.md` (proposed).

---

## Phase 0 — Close the gate honestly (now → ~08-09)

The verdict is worth more than the deadline. Do not let a technically-passing number
authorize the next build.

- ~~Separate **model-initiated** from **human-initiated** calls in SCN-004
  instrumentation.~~ **Reframed 2026-08-05: call origin is the wrong axis.** "What have
  I been working on?" is model-executed but human-intended — the assistant is the
  delivery mechanism, and memory reached through conversation is still memory reached.
  Excluding model-initiated calls would exclude the librarian doing its job. Classify
  each stateful call by **what pulled it** instead: a live human question in the
  session, or the standing server instructions alone. Intent attribution, not caller
  identity. Without this the gate is still unfalsifiable; the reframe just makes the
  instrumentation measure the right thing.
- Either restart the wish log or accept that it already answered. It stopped 07-27 with
  six entries, **none** of them asking for belief-lifecycle — all six were capture/recall
  plumbing defects.
- Write the verdict against **memory-of-use**, which is what the project's thesis
  already says the tool is, rather than against H2 (belief-lifecycle) from the
  validate-plan. The validate-plan itself flagged H2's value as "inferred, not
  observed"; two weeks of real use have not changed that.

**Exit:** a written verdict naming which thesis the observed behavior supports, and an
instrumentation change that makes the next gate falsifiable.

**Status (2026-08-12): DONE — see `docs/gate-verdict-2026-08.md`.** Verdict: PASS,
both on the raw count (W31: 8, W32: 16, both well over the ≥3/week bar) and on the
intent axis (every logged call traces to a live human question or task, per Robin's
own 2026-08-05 ruling that model-executed-but-human-intended recall counts). Thesis
supported: memory-of-use, not H2 — the wish log stayed silent on belief-lifecycle
through two more gate-passing weeks. The instrumentation-change half of the exit
condition is carried forward as a non-blocking recommendation (a self-reported
trigger tag at call time), queued alongside Phase 1's read-value signal rather than
done here.

---

## Phase 1 — Summary discipline (immediately after, small)

The live regression. Cheap to fix, and it gates Phase 2: a record averaging 192
words/step makes the abbreviated recall view not actually cheap, which defeats the one
control that decouples recall cost from stored size.

- ~~Enforce SR-021 mechanically at capture time.~~ **Done, spec v3.6.0 (2026-08-04).**
  Corrected on contact with the spec: "refuses" was never available — SR-023 and the
  SCN-007 acceptance criteria forbid rejecting *or* truncating on style grounds, and
  annotating the record body is forbidden too (COR-R-027 requires the body line to be
  time + summary and nothing else). What shipped instead: an explicit word budget in
  the contract (40 target / 60 ceiling, the authoring-time lever), overflow channelled
  into per-thing directives via SR-033, and the capture path reporting overage on
  stderr while storing verbatim (+SR-034).
- ~~Add a drift test on summary length.~~ **Done** — the contract's stated numbers and
  `config.summaryWordCeiling` must agree or the suite fails, so the contract and the
  code cannot drift apart.
- Consider making `detail` default to abbreviated, with the existing non-silent
  abbreviation notice.
- ~~Add a **read-value** signal.~~ **Settled qualitatively, 2026-08-12 — no
  instrument built.** See `docs/archived/read-value-verdict-2026-08.md`: Robin's direct account
  is that captures reduce rework and often drive new directions, which the
  architecture (no model in the server) puts on the human side to judge, not a proxy
  metric. `docs/archived/read-value-signal-plan.md` scoped a mechanical alternative and is
  retired, kept only for its tier-1 blind-spot finding.

**Exit:** average summary length back inside the contract, and a test that fails if it
drifts again.

---

## Phase 2 — Open-source release (after Phase 1)

Publish as a **dated artifact**, not as a maintained project. That distinction is the
whole cost/benefit: an artifact carries the positioning value; a project carries a
standing support obligation.

Mechanical work (~half a day, no blockers found):

- Add `LICENSE` (MIT — dependency tree is `@modelcontextprotocol/sdk`, `gray-matter`,
  `zod`, all MIT; no AGPL, because the Basic Memory fork was correctly avoided).
- `package.json`: drop `"private": true`; repo visibility private → public.
- De-personalize `SERVER_INSTRUCTIONS` and the tool descriptions in `src/server.ts` —
  they say "Robin's work" / "a result Robin engaged" and ship to every client. Source
  comments naming Robin are cosmetic and can stay.
- Fix three hardcoded `/Users/shinytoyrobots/...` paths in `README.md` and
  `docs/overview.md`.
- README must state (a) what it is *for* — memory-of-use, not retrieval, not
  belief-lifecycle; (b) that it is a personal tool shared as reference, unsupported;
  (c) any known limitation honestly.

No content scrubbing needed: `data/` and `_librarian/` are gitignored and memory-of-use
is kept out of the code repo by spec (SR-102 / prohibition 6). Nothing personal is
tracked.

**Timing note — the real reason not to let this drift.** Ideas from this codebase have
begun informing the author's professional work. Publishing promptly establishes the
mechanism as independently authored prior art, shown by the timeline rather than argued
after the fact.

**Exit:** public repo, MIT, README that claims the right thing.

**Status (2026-08-05): DONE — and out of order.** Published and tagged `v0.1.0` ahead of
the Phase 0 gate verdict, on an explicit operator call; the timing argument above won.
Recorded plainly: publication was originally gated on the verdict and shipped without
it. The gate work is unchanged, the verdict (~2026-08-09) is still owed, and a public
repo does not count as evidence the stateful behavior gets reached for.

---

## Phase 3 — The next pillar, chosen by evidence (after the verdict)

Deliberately unspecified here. Candidates, from the ACH: H3 (ingestion), H4
(guide-to-collection), H2 (belief-lifecycle). The ACH ranked H3/H4 co-equal at −0.5 and
flagged the tie as brittle; H2 was most-corroborated but least-observed.

**Rule:** do not build H2 on inference alone. It is the pillar with the strongest
research support and the weakest behavioral evidence, and the instrument built to
detect demand for it (the wish log) conspicuously never asked for it.

**Exit condition to even start:** Phase 0's verdict names a pillar, supported by
observed use rather than analysis.

**Status (2026-08-12): NAMED — H2 (belief-lifecycle).** Two wish-log entries (dated
2026-08-11 and 2026-08-12) supply what the rule required: real, dated friction, not
analysis. The Kellie-letter entry — a cross-month consistency check performed by
hand, referencing decisions from September and November 2025 — was generalized
same-day to the actual primitive needed: a topic's full trajectory of positions over
a date range, not a two-point diff. A second entry names recurring mid-session belief
drift, tracked today only by hand-built handoffs and session-ID cross-referencing.
This supersedes the 2026-08-04 draft entry noted in `docs/decision-graph-plan.md`
§Sequencing, which was never actually logged.

The design and build plan already exist, from an earlier (2026-08-04) pass that
correctly declined to build ahead of evidence: `docs/decision-graph.md` (positions as
a projection over the event log — two graphs, only one of them authored) and
`docs/decision-graph-plan.md` (Phase 0, durable note identity, **already shipped**
2026-08-05; Phase A, position capture (SCN-010), and Phase B, position recall
(SCN-011), **shipped 2026-08-13**; Phases C–D — drift visibility, optional backfill
— not started). Phase B's supersession-chain design
already matches today's trajectory generalization without rework. Phase D (backfill)
is newly load-bearing: the Kellie case predates position capture entirely, so nothing
answers "what did I decide in September 2025" until either backfill runs or enough
new positions accumulate to make old history moot.

Original candidates, kept for the record: H3 (ingestion) and H4
(guide-to-collection), ACH-ranked co-equal at −0.5 with the tie flagged as brittle.
Neither gained evidence; H2 did.

**Next action:** the backfill decision — `docs/decision-graph-plan.md`'s HITL point #5,
deferred to two weeks after Phase B shipped, so due ~2026-08-27. Phases A–B already went
through ratification and the standard pipeline (flow-spec → HITL → gen → cull → ship);
Phases C–D would follow the same pipeline if taken up.

---

## Phase 4 — Org scale (watch item, not a build)

Keep as a question, not a project. Single-user use teaches almost nothing about the
hard parts at team scale: ratification authority, privacy surface, cross-user conflict.
The June concept bake-off already scored the nearest neighbor (H5 "Remembrancer") last
at −7.0, sunk by integration burden and privacy sensitivity.

Any commercial move here also has to clear the employer-conflict question first, since
it overlaps the author's professional work. That is a gate, not a risk.

---

## Phase 5 — The discursive librarian (direction, not yet a build)

Added 2026-08-05. Stephenson's Librarian was discursive — you talked to it and it
talked back, with a manner. The long direction for this tool is the same: a librarian
you converse with rather than an index you query. More discursive answers first;
possibly a pseudo-personality later.

The no-model rule survives this. The server already ships `SERVER_INSTRUCTIONS` to
every client that connects; a voice is just more instruction, performed by the client,
where the reasoning already lives. The record underneath stays inert, append-only,
checkable. Constitution principle 3 ("quiet when unprompted, discursive on demand")
already names the boundary — this extends the discursive-on-demand half without
touching the quiet half.

**Exit condition to even start:** Phase 0 and the Phase 1 read-value signal show recall
is real and acted on. A personality on a write-only record is a costume.

**Entry condition met (2026-08-12):** both halves are now verdicted PASS —
`docs/gate-verdict-2026-08.md` (Phase 0) and `docs/archived/read-value-verdict-2026-08.md`
(read-value, decided qualitatively). This clears the gate; Phase 5 is still a
direction, not scheduled, until someone decides to build it.

---

## Phase 6 — State the host-integration rules once (done 2026-10-18)

**Done:** the "Host integration" section is in `docs/memory-of-use.md`, and the Copilot and Muse
plans cite it. The gh-pages port and `sources.json` rehash for `memory-of-use` followed with
the cold-reader port.

Added 2026-10-18. `spec/constitution.md` and the spec invariants (INV-1..6) cover the
server, but nothing states the rules for plugging rutter into a host client. They live
plan by plan (`archived/copilot-cli-plan.md`, `archived/muse-code-plan.md`, `grok-stop-adapter.md`) or only
in code, so each new client re-derives them:

- A capture hook fails open: it never blocks or aborts the user's turn.
- Installers touch only user-level files, edit only their own marked entries, are
  idempotent on re-run, and never write project `AGENTS.md`/`CLAUDE.md`.
- Hosts that clear the environment get a baked-in vault path and an absolute `node`.
- MCP registration is optional, never required (Muse's `mode: "required"` aborts the run).
- Capture never rejects or rewrites a record (SR-023; provenance never blocks a capture).

**Shape:** a "Host integration" section in `docs/memory-of-use.md`, next to "Host
differences", that per-client plans cite. Promote the fail-open rule to a constitution
prohibition (major version, HITL) only if a new client tempts breaking it.

**Exit:** the section exists, and the Copilot and Muse plans cite it instead of restating it.

---

## Phase 7 — Grok without Claude Code (done 2026-10-19, v0.8.1)

**Done:** `install-hook --client grok` shipped in v0.8.1 and was verified with Grok 1.0.62 on a
Linux machine that never had Claude Code, from install to a captured `client: grok` record and
a working recall. The plan is `archived/grok-native-install-plan.md`.

Added 2026-10-19. The Grok setup docs say "install the Claude Code plugin", because Grok
runs the plugin's server and hook through its Claude compatibility layer. Someone with Grok
and no Claude Code has no documented route. Every other client installs from npm and
writes only its own files. Every probe so far also ran on a Mac that has Claude Code, so
"works without it" is unproven for all clients.

**Shape:** a Grok-native installer (`install-hook --client grok`, writing
`~/.grok/hooks/` and registering the server), gated on a probe on a machine with no Claude
Code. Plan, probe checklist, and the double-fire risk: `docs/archived/grok-native-install-plan.md`.

**Follow-up:** when the Claude Code plugin and a native `grok mcp add` registration coexist, Grok may load two rutter servers. Only hook double-firing was probed. Check it and make the installer say so; until then it is a known issue in the [FAQ](./faq.md#known-issues).

**Exit:** a person with Grok and no Claude Code reaches a captured `client: grok` record and
a working `librarian-recent`, tested on a machine that has never had Claude Code.

---

## Future possibility — unprompted recall (not phased)

Added 2026-10-10. Noted so the idea isn't lost; deliberately **not** part of Phase 5,
which stays about how the librarian answers when asked.

The idea: an opt-in mode where rutter offers a past record without being asked, when the
current conversation clearly connects to it — e.g. one line, *"Possibly related:
2026-09-14, decided X (notes cited)."* This goes beyond the inspiration; Stephenson's
Librarian answers, it does not volunteer.

Likely shape, if ever built: a deterministic prompt hook (full-text search over the
prompt, no model) that hands the client one line of context on a strong match, leaving
the client to decide whether to mention it. Instruction-only nudging is the cheaper
alternative but is unreliable and unmeasurable.

Guardrails it would need: off by default; strong matches only; at most one line per
prompt and each record at most once per session; provenance on every suggestion.

**Before any build:**
- Clarify constitution principle 3. "Surface only when relevant" arguably permits this
  and opting in arguably counts as "invited", but "never at-you" should be settled in
  writing, not by reading.
- Tag these calls separately in instrumentation (pulled by: unprompted). Otherwise they
  are exactly the "consulted only under standing instruction" calls the first kill
  condition counts against the tool.

---

## Non-goals

- Retrieval quality as a value thesis — commoditized (ACH: H1 second-worst, above only
  the null).
- Server-side summarizing, merging, or rewriting on the read path — INV-6, COR-A-012.
- Becoming a supported open-source product with roadmap obligations to strangers.
- Multi-user / team features while the single-user thesis is still unverified.

## Kill conditions

*(Reframed 2026-08-05. The first condition previously keyed on call origin — "unprompted
human use once model-initiated calls are excluded." That axis doesn't survive contact
with real usage: recall flows through the assistant by design, so excluding
model-initiated calls excludes the librarian doing its job.)*

- Phase 0 verdict shows no stateful call traces back to a human question — the memory
  is consulted only under standing instruction, never through conversation → the tool
  is agent infrastructure, not a librarian; re-scope or stop.
  **Evaluated 2026-08-12: does not hold.** PASS — see `docs/gate-verdict-2026-08.md`.
- Read-value signal (Phase 1) shows recalls are written but never acted on → the record
  has gone write-only; fix that before building any new pillar. **This is the primary
  condition.** A recall that changes nothing downstream fails regardless of who
  initiated it; one that changes what happens next is the tool working, whoever placed
  the call.
  **Evaluated 2026-08-12: does not hold.** PASS, decided qualitatively — see
  `docs/archived/read-value-verdict-2026-08.md`.
