# spec v6.0.0 — 2026-08-13

**Effort:** decision-graph (panel-2026-08-13 follow-up, not a new build round)
**Bump:** major
**HITL:** approved as drafted, 2026-08-13

## What changed

Amends **SCN-010** (When-clause + three acceptance-criteria bullets) and **SR-047, SR-048, SR-049, SR-052**. Every change states, in spec text, a behavior that already ships in `src/position-directive.ts` and `src/positions.ts` — none of it is new implementation or a new design decision. Verified against source before writing (grammar regex, `deriveRevises`, `deriveRefPaths`, `readAllPositionStreams`), not re-derived from the panel's readings alone.

This closes all three divergences `/flow-panel` located in `spec/.staging/panel-2026-08-13.md`, plus two of its four convergent-but-underspecified gaps (the other two — `SG-12`'s topic-key-colon parsing and the malformed-kind non-diagnostic — are addressed as disclosed known-behavior notes, not new hard requirements, per the reasoning below).

### 1. Wire format pinned (SCN-010, SR-047) — Divergence 1

The spec text had never been updated since v3.12.0, and still literally said positions ride "the same sentinel channel session directives use" — while shipped code (gen-3/var-2-maintainability's decision D2, carried through gen-4/var-1-graft) uses a **distinct** `<!-- librarian-position POSITION <kind> <topic-key>: <stance> -->` HTML comment, deliberately separate from `librarian-session`.

The panel's 5 blind readers split three ways: 4/5 independently guessed the shipped answer (distinct tag, general shared mechanism); 1/5 committed to a third reading nobody had named before (a bare, unwrapped line with no HTML comment at all). Neither the shared-tag reading nor the bare-line reading is correct.

**Reason, now in spec text** (previously only in a decision ledger): a shared tag would let `directive.ts`'s keep-the-LAST-occurrence rule silently displace a session summary with a position (or vice versa) emitted in the same turn — a session-record behavior change caused merely by position capture's presence, which SR-055 forbids. Two disjoint regexes over the same text make the two extractions independent by construction, not by careful sequencing.

Also folded in here: a `librarian-position` comment whose kind token isn't one of the four literals, or whose topic key is empty/missing, is now explicitly specified to fail the grammar match and collapse to silent no-directive (no diagnostic, no append) — closing `SG-9` and a new gap the 2026-08-13 panel found (empty topic-key) that the 2026-08-12 panel never surfaced.

**Not resolved by this amendment, disclosed instead:** a topic key containing a colon is parsed first-colon-wins, which can mis-parse a key that itself looks like a timestamp (`SG-12`). This is documented as a known limitation in SR-047's derivation note, not elevated to a spec-mandated "this is correct" requirement — the decision that produced it (gen-4/var-1-graft's G1) rates it MEDIUM severity and admits an equally defensible alternative exists. Ratifying the current heuristic as permanently-correct spec text would foreclose a genuine future fix this round has no basis to decide.

### 2. Idempotence scope pinned: every month, not just the current one (SR-049) — Divergence 2

Neither the scenario prose nor SR-049 ever stated whether the duplicate-check scans one month's file or the full stream. The panel's readers split 2-2 (plus one non-committal); only the two who guessed "all months" matched shipped behavior (`readAllPositionStreams()`), which mirrors `session-record.ts`'s identical cross-day handling for the same reason — a session can straddle the boundary. Already tested (`test/position.test.ts`'s cross-month idempotence case). Closes `SG-2`.

### 3. `revises:` and named-ref syntax pinned: derived from inside the stance, never stripped (SR-052, SR-048)

Neither `revises:<event-id>` nor a `[[wikilink]]`-style ref has a separate grammar slot. Both are read-only scans over the byte-verbatim stance text the client already wrote, layered on top of storage, never edited out of it. This is the one place the panel's own readers did not converge on the shipped answer even partially — everyone who addressed `revises:` proposed an unshipped separate-slot alternative (a trailing token before the final colon, a second line). The ref-extraction syntax (`[[wikilink]]`) was correctly guessed by all 5 readers by inference from adjacent vault conventions — this amendment turns that correct guess into stated fact, closing the gap both the 2026-08-12 and 2026-08-13 panels flagged.

### Traceability

SCN-010 now shows `amended v4.0.0, v5.0.0, v6.0.0`. SR-047, SR-048, SR-052 now show `amended v6.0.0`; SR-049 shows `amended v4.0.0, v6.0.0`.

## What did NOT change

- No code. Every amendment describes behavior already shipped in `ship-2026-08-13-0001` (gen-4/var-1-graft).
- SR-050, SR-051, SR-053, SR-054, SR-055, SR-056, SR-057 — untouched.
- `evals/harness.yaml` mapping status — SCN-010/SR-047..057 remain `mapping-pending: true`, unaffected (owned by `/flow-eval`).
- SR-051's fold semantics — still explicitly out of scope for Phase A; this amendment only pins where `revises` is derived from, not whether Phase A consumes it (it doesn't).

## Dissent check

This amendment directly and intentionally arms `dissent-2026-08-13-0003`'s reactivation condition 1 (SCN-010/SR-047 text changes) — expected, since ratifying the wire format is exactly what that dissent's `provisional-resolution` called for once `/flow-spec` acted. The amendment resolves **toward** that dissent's provisional-resolution (distinct tag), not away from it. Recommend `/flow-dissent resolve dissent-2026-08-13-0003` as a follow-up rather than reopening the shared-vs-distinct debate. `dissent-2026-08-13-0004`'s conditions are unaffected — it concerns whether/when `SERVER_INSTRUCTIONS` teaches the grammar (already answered at ship); this amendment only pins the grammar's own text.

## Panel

Not re-run before this amendment (the panel that triggered it already ran, per `panel-2026-08-13.md`). Whether a fresh `/flow-panel` should close this round is a judgment call: this amendment codifies already-shipped, already-decision-ledgered behavior rather than introducing new design surface, so the interpretive-ambiguity risk a panel exists to catch is low — but it is offered, not skipped by fiat.

## Artifacts

- Proposed draft: `spec/.staging/spec-proposed-scn-010-wire-format.md`
- Located by: `spec/.staging/panel-2026-08-13.md`
- This record: `spec/history/spec-v6.0.0-2026-08-13.md`
