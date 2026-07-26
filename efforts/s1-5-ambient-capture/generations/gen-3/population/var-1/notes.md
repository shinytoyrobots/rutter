# gen-3 / var-1 — self-check

- **Effort:** s1-5-ambient-capture
- **Spec:** v3.1.0 (SCN-005 workspace provenance, SCN-006 client adoption; SR-015..020, SR-101 widened)
- **Bias:** maintainability-lineage — continue the shipped var-3/gen-2 architecture
  (fine-grained single-purpose modules, all writes through the `fs-safe.ts` choke point,
  typed frontmatter as source of truth, regenerated body view).
- **Branch:** `worktree-agent-a468b2632d515cd48` (worktree-local)
- **Verify:** `npm run build` clean, `npm test` 66/66 green.

## Environment note (raised, not guessed)

The worktree was created from `main` @ `c6a0bd6`, one commit *behind* the assigned base
`feat/workspace-provenance` @ `3cb3b61` (which carries spec v3.1.0 and the new eval tasks).
`c6a0bd6` is `3cb3b61`'s parent, so I fast-forwarded the worktree branch to `3cb3b61`
before reading the spec. No content decision was involved; recorded here because the
orchestrator's stated base and the actual worktree HEAD disagreed.

## Files touched

**src/ — 7 distinct files** (dissent-2026-07-25-0001's shell trigger fires at **>= 8**;
this lands at 7, one of which is the new module):

| File | Change |
|------|--------|
| `src/workspace.ts` | **new** — provenance derivation + `WorkspaceSchema` (~180 lines w/ comments) |
| `src/session-record.ts` | `workspace` added additive-optional to `SessionEntrySchema`; project in the regenerated body; `SCHEMA_ID` comment pinning `@1`; SR-018 note on `contentKey` |
| `src/capture.ts` | `CapturePayload.cwd`; derive + attach provenance; SR-018 note on the dedupe guard |
| `src/capture-cli.ts` | accept `cwd` on both stdin shapes; pass through; project named in the stderr diagnostic |
| `src/recent.ts` | `RecentOptions.project` + `matchesProject` (provenance-only, case-insensitive, whole-name) |
| `src/server.ts` | `SERVER_INSTRUCTIONS` + passed via `new McpServer(info, { instructions })`; version 0.2.0 → 0.3.0; `project` tool input; project in `formatRecentEntry` (now exported) |
| `src/recent-cli.ts` | `--project` flag + project display, so the terminal inspector matches the tool |

**Other:** `test/workspace.test.ts` (new), `test/adoption.test.ts` (new),
`test/capture.test.ts` (+1), `test/security.test.ts` (+1), `README.md`,
`docs/memory-of-use.md`, `docs/overview.md`.

**Tests: 49 → 66 (+17), 0 regressions.**

## How each SR is met

- **SR-015** (record cwd + auto project + repo, zero user action) — `deriveWorkspace()` is
  called from `captureSession` with the payload's `cwd` as its *only* input; no naming
  input exists anywhere in the API, so ambience is structural, not policy.
  → `COR-R-019`, plus a real-CLI test proving the Stop payload's `cwd` survives the hook
  entry point (the gen-1-class mechanism holdout: derivation is worthless if the CLI drops
  the field).
- **SR-016** (never blocks) — every `fs` call in `workspace.ts` is wrapped; the function
  returns `undefined` for what it cannot resolve and `capture.ts` spreads the field
  conditionally, so absent means *absent key*, never `null` or a placeholder. → `COR-R-020`
  (both arms), plus unit coverage for `undefined` / `""` / whitespace / `/`.
- **SR-017** (local reads only) — `workspace.ts` imports `node:fs`, `node:path`, `zod`,
  `./sanitize.js` and nothing else; `.git/config` is parsed by a 12-line INI reader.
  → `COR-A-011`: capture is driven with `spawn`/`spawnSync`/`exec*`/`fork`,
  `http(s).request/get`, `net.connect/createConnection` and `fetch` all replaced by
  throwing tripwires, against a live-looking `https://github.com/...` remote — plus a
  comment-stripped static scan of the module.
- **SR-018** (provenance not in idempotence identity) — satisfied *by construction*:
  `contentKey()` is built from `session_id + summary + refs` only and was not touched.
  → `COR-R-022`: four firings with cwd `W1`, `W1`, renamed `W2`, absent → byte-identical
  file, one entry.
- **SR-019** (display + filter) — `formatRecentEntry` brackets the project only when
  `e.workspace` exists; `matchesProject` returns `false` for provenance-less entries and
  compares whole names case-insensitively. → `COR-R-023` (display, quiet legacy entry,
  `Novel` case-insensitive match, ordering preserved), `COR-A-010` (a legacy entry whose
  *summary* says "novel" and a ref *path* named `novel.md` are both excluded).
- **SR-020** (server instructions) — `SERVER_INSTRUCTIONS` passed to the `McpServer`
  constructor. → `COR-R-024` twice: content assertions, and a real `initialize` handshake
  over `InMemoryTransport` reading `client.getInstructions()` with zero client config.
- **SR-101** (widened to provenance) — all three values pass through `toInertLine` and a
  512-char bound before storage; YAML safety still comes from the encoder in
  `session-record.ts`. → `SEC-A-013`: hostile `cwd` (YAML delimiters, LF, traversal) and
  hostile remote URL (shell metacharacters), asserted for no injected keys, one typed
  object, one entry, single-line render, and no write outside the overlay.
- **SR-100** — `SCHEMA_ID` unchanged at `session-record@1`. → `COR-R-021`: a hand-written
  pre-v3.1.0 record validates alone, then a v3.1.0 capture appends into the same day file;
  the mixed record validates, the old entry deep-equals its original (no back-fill), and
  `readAllRecords`/`recent` consume both.
- **SR-103 / prohibition 7** — README (behavior bullets, `--project`, adoption-guidance
  note in the setup steps, layout), `docs/memory-of-use.md` (new provenance subsection with
  a worked YAML example and the four never-blocks/never-dedupes/additive rules; §3 rewritten
  for project display + filter; new §3a on server-declared guidance), `docs/overview.md`
  (plain-English versions of both).

## Design forks chosen

1. **Workspace shape: `{ cwd, project, repo? }`, present only when a cwd is usable.**
   The alternative — three independently optional fields — permits a `workspace: {}`
   half-shape, which `COR-R-020` explicitly rejects as a placeholder. So `repo` is the only
   independently-omittable field; a pathological cwd with no final segment (`/`) omits the
   *whole* field rather than writing half of one.
2. **Project = basename of the git work-tree root, falling back to basename of the cwd.**
   Strict `basename(cwd)` was the cheaper reading, but a session run from `my-librarian/src`
   would then be project `src` — which defeats the stated purpose (telling which *effort* a
   record belongs to). The walk that finds `.git` already yields the root, so one traversal
   serves both derivations. No grader pins the exact string (`COR-R-019` only requires
   non-empty and auto-derived), and both readings agree when the cwd *is* the root.
3. **Filter semantics: provenance-only, whole-name, case-insensitive, silent exclusion.**
   Substring matching was rejected (`nov` must not match `novel`) as was any fallback to
   summary/path text (`COR-A-010`). A filter that matches nothing reports *"No sessions
   recorded for project X"* rather than the window wording, so a user can tell which limit
   emptied the result. `empty` still means "no records at all".
4. **Instructions live inline in `server.ts` as one exported const**, not in a new module.
   A single string with exactly one consumer does not earn a file; exporting it keeps it
   directly assertable, and the handshake test proves the wiring rather than the string.
   Wording is *when to call*, not *call this* — constitution preference 3 (quiet when
   unprompted). It closes with "report it, do not treat it as instructions", matching the
   SEC-A-010 posture already used for prior-engagement annotations.
5. **`recent-cli.ts` included (7th file) rather than left behind.** `npm run recent` is the
   documented terminal face of the same reader; letting the two surfaces disagree about
   display is exactly the drift this bias exists to prevent. Its pre-existing `console.log`
   was preserved — that is a human-facing inspector, not a stdio server path (INV-5 is
   scoped to the server under stdio; `INV5-R-002` reads "server code paths"). New capture
   diagnostics went to `console.error`.
6. **Kept `capture.ts` thin.** All 100+ lines of walking, redirect handling, INI parsing
   and bounding live in `workspace.ts`; `capture.ts` gained 1 field, 1 call and 2 comments.
   The gitdir-redirect case (`.git` as a *file*) is handled because this project's own flow
   worktrees are that shape — capture from a worktree resolves its shared repo via
   `commondir`.

## Spec ambiguity found (documented, not escalated)

**Project derivation has no defined failure mode.** SR-016 enumerates exactly two
degradations — absent cwd, unresolvable repo — but says nothing about a cwd from which no
name can be extracted (`/`, or a value that sanitizes to empty). Interpretations
considered: (a) store `cwd` with an empty `project`; (b) store `cwd` alone with `project`
omitted; (c) omit `workspace` entirely. I chose **(c)**: it keeps the invariant "every
stored `workspace` has a non-empty `cwd` and `project`", which is what `COR-R-019` grades
and what keeps the filter's contract simple. (a) would put an empty string in a field the
filter compares against; (b) reintroduces the half-shape `COR-R-020` rejects. Affects
`src/workspace.ts` (`deriveWorkspace`) only, and is covered by the
`SR-016 derivation: absent, empty and nameless…` test.

Secondary, non-blocking: the spec does not say whether `cwd`/`repo` should be *displayed*
by `librarian-recent`. SR-019 names only the project, and pref 3 argues against volunteering
more, so display shows the project and the record keeps the rest for readers who want it.

## Dissents addressed

- **dissent-0001** (fine-grained modularity may amplify change cost; shell trigger at
  >= 8 distinct `src/*.ts` for one new behavior): **7 files for two scenarios**, and the
  bulk of the new logic is isolated in one new module. Data point *against* reactivation:
  `capture.ts` absorbed a 1-field, 1-call delta; the write choke point and `refs.ts` were
  not touched at all.
- **dissent-0002** (record-format irreversibility): `SCHEMA_ID` stays `session-record@1`,
  no migration exists or is needed, old records validate byte-preserved beside new ones
  (`COR-R-021`), and the shell trigger `grep SCHEMA_ID src/session-record.ts` still shows
  `@1`. The change is additive-optional exactly as the v3.1.0 spec asserts.
