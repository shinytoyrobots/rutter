---
name: cross-boundary
version: "1.0.0"
status: placeholder
dimension: cross-boundary
grader-type: deterministic   # two independent-consumer contract probes; no LLM judge
threshold: 1.0                # no failure tolerance — mirrors security; this is the
                               # doctrine's second non-negotiable (flow-operating-doctrine.md
                               # step 1 / flow-eval-protocol.md "Dimensions")
covers-sr: [SR-019, SR-020, SR-027, SR-028]   # SCN-006 client-adoption guidance reaching a
                                              # real client; the schema-shape probes are not
                                              # tied to one SR (see NFR/cross-boundary tasks)
covers-scn: [SCN-001, SCN-005, SCN-006, SCN-008, SCN-010]
datasets: [cross-boundary-real-v1, cross-boundary-adv-v1]
judge-model: none — fully deterministic, no client-side judge required
added: "2026-08-13"
---

# Cross-boundary grader — grading the artifact against its real consumers

Added 2026-08-13, closing a standing suite gap `/flow-generate` surfaced while checking a
dispatch: the doctrine's second non-negotiable (flow-operating-doctrine.md step 1;
flow-eval-protocol.md "Dimensions") — "at least one cross-boundary objective grading the
artifact against its real consumers" — had no home in this suite. The field trial's own
framing: "the one commercially costly defect lived at an ungraded cross-repo seam — in-repo
scores cannot see it."

This project's analogous seam is concrete, not metaphorical: `gray-matter` (which wraps
`js-yaml`) is **both the writer and the reader** of every frontmatter file this codebase
produces (`src/session-record.ts` writes through it, `src/vault.ts` reads through it). A
round-trip test built against the same library the code under test already depends on
cannot see a defect that library itself is blind to — the exact shape of the field trial's
warning. The MCP protocol boundary has the same shape: the `@modelcontextprotocol/sdk`'s
own `Client` may tolerate something a different real client (this project's own testing
guidance names Gemini CLI and ChatGPT specifically: "Claude's tolerance can mask bugs")
would reject.

This grader exists to use consumers OTHER than the code's own dependencies, precisely
where the code's own dependency is the thing that would otherwise be graded by itself.

## Grader type

**Deterministic. Two independent-implementation seam probes. No LLM judge** (INV-6 —
judges live client-side only, never in the server, per the security.md precedent; this
grader has no need for one at all — every check here is exact-match / parse-success).

### Probe A — protocol seam

Spawn the actual server process (`tsx src/stdio.ts`, or the built `dist/stdio.js`) and
drive it with a **separate `@modelcontextprotocol/sdk` `Client`** over a real stdio
transport — a genuine second process exchanging real MCP JSON-RPC frames, never an
in-process call to the exported tool-handler function directly. Per task:

- `initialize` — capture the returned `instructions` field and assert the SERVER_INSTRUCTIONS
  content (SCN-006) actually reaches a protocol-level consumer, not just source text a unit
  test can see.
- `tools/list` — the three declared tools (`librarian-search`, `librarian-get-note`,
  `librarian-recent`) each return a well-formed `inputSchema` AND `description`; each
  schema additionally passes a **strict-mode JSON-Schema validator** (a real client's own
  validator, not the SDK's tolerant path) — catches a zod→JSON-Schema conversion the SDK
  accepts but a stricter client would reject.
- `tools/call` on each of the three tools with a representative benign input — the
  response `content` is a well-formed `{type: "text", text: string}[]` array *over the
  wire*, not just as constructed in-process.

### Probe B — vault seam

Every markdown artifact the server writes is parsed by an **independent frontmatter
reader — explicitly NOT `gray-matter`, and not anything built on the same `js-yaml`
instance the code already depends on** — and checked field-for-field against a schema
description maintained here, in this grader spec (a second, independent copy of "what the
schema should contain," never imported from `src/session-record.ts`'s zod schema):

- `_librarian/sessions/<date>.md` → `session-record@1`
- `_librarian/note-identity.md` → `note-identity@1`
- `_librarian/positions/<month>.md` → `position-event@1`

Pass requires: the independent parser reports zero parse errors, AND every field the
independent schema copy expects is present with the expected type, AND no field the
independent copy does not expect appears unexplained (catches accidental frontmatter
leakage from body content — the same failure class SEC-A-001..003 probe from the *opposite*
direction using `gray-matter`; this probe uses a genuinely different parser, so a defect
`gray-matter` itself cannot see still surfaces here).

## Input format

`cross-boundary-real-v1.jsonl` and `cross-boundary-adv-v1.jsonl`, one task per line:

```json
{"id":"XB-R-001","covers":"SCN-006","requirements":["SR-020"],"probe":"protocol","kind":"deterministic","action":"initialize","expected":"returned instructions field is non-empty and contains the SERVER_INSTRUCTIONS text verbatim","pass":"1.0 if the real Client's initialize response instructions field matches; 0.0 otherwise (missing, truncated, or diverged).","weight":1.0}
```

```json
{"id":"XB-A-001","covers":"SR-015","requirements":["SR-015","SR-101"],"probe":"vault","class":"independent-parser-yaml-edge","vector":"workspace.project","payload":"weird: value\n#comment-looking-text","setup":"Capture a session directive from a working directory whose automatically-derived project name contains YAML-special characters.","expected":"the independent (non-gray-matter) parser still parses the record's frontmatter cleanly and the provenance field round-trips verbatim.","pass":"1.0 if the independent parser reports zero errors and the field value is byte-identical; 0.0 on any parse error, truncation, or silent mangling.","weight":1.0}
```

## Scoring rules (per task)

- **Real task** (protocol or vault round-trip succeeds under the independent consumer):
  `1.0` if it succeeds exactly as expected, `0.0` otherwise. No partial credit — mirrors
  `security.md`'s posture; this dimension exists specifically to catch either/or defects (a
  real external consumer either can consume the artifact, or it can't).
- **Adversarial task**: `1.0` if the edge case is handled correctly under the INDEPENDENT
  consumer, `0.0` if it corrupts frontmatter, breaks the protocol round-trip, or silently
  drops/mangles the value.
- **Pass/fail vs threshold:** dimension passes only at aggregate `1.0` on BOTH datasets. Any
  single `0.0` fails the dimension.

## Failure-rationale requirement

Each failed task records: task id, probe (`protocol` | `vault`), the exact independent-tool
output (JSON-Schema validator error, parser exception, or raw wire bytes) that diverged
from expectation, and which specific consumer (SDK `Client` / strict validator / named
frontmatter library) surfaced it. Written to
`evals-failures/{variant-id}-cross-boundary.md`.

## Open assumptions (flow-eval attention)

- **No test harness exists yet.** This grader needs two things the runner-authoring pass
  must add as **test-only devDependencies** (never runtime — INV-1/INV-6 govern the
  server, not the harness): (1) a YAML/frontmatter parser genuinely independent of
  `js-yaml` (`gray-matter`'s own dependency) for Probe B, and (2) a strict-mode
  JSON-Schema validator (e.g. `ajv`) for the `tools/list` schema check in Probe A. Neither
  is a proposed server dependency; both live in the harness only. **Test harness to be
  established** (same open item class as `security.md`'s).
- Probe A requires spawning the server as a real child process — the only grader in the
  suite that needs process spawning rather than in-process function calls. Batch by one
  connection at `quick` depth; a fresh connection per task at `adversarial` depth (that is
  what catches connection-affinity bugs like XB-A-005).
- The vault-seam schema descriptions (the three schemas' field lists) are maintained BY
  HAND in this spec, deliberately not imported from `src/session-record.ts`'s zod schema —
  importing the code's own schema would make Probe B circular again, defeating its purpose.
  This means the schema description here CAN drift from the code's actual schema; that
  drift is itself a defect this grader should surface, not a bug in the grader to silently
  reconcile against the code.
- **Retroactive coverage**: the already-shipped variant (`ship-2026-08-05-0001`,
  var-3-reversibility @ `993a89d`) has never been scored on this dimension — it predates
  this suite version. Per the eval protocol's additive-change rule this is not
  automatically re-triggered; scoring the shipped code against it is a separate, explicit
  decision (recorded in `efforts/decision-graph/flow-state.yaml`'s phase-log, not decided
  here).
