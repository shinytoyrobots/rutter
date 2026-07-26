---
version: "3.0.0"
parent: "2.0.1"
effort: s1-5-ambient-capture
date: 2026-07-25
change-type: major   # existing SCN/SR modified
change-summary: "SCN-001 amended: Stop fires per-turn, capture must be idempotent per distinct directive"
author: flow-spec (inline spec-writer — surgical amendment, full context in-session; deviation noted)
hitl: approved       # 2026-07-25, explicit AskUserQuestion approval; constitution escalation trigger 1 (capture semantics) satisfied
mapping-pending: false   # 3 new tasks authored same pass (suite 0.2.0 -> 0.3.0)
---

# History — Spec v3.0.0 (SCN-001: per-turn Stop firing + idempotent capture)

## Why (post-ship finding, ~2 hours after ship-2026-07-25-0001)

Dogfooding the shipped hook immediately revealed the mechanism reality: **Claude Code
fires the Stop event at the end of every assistant turn** (and around clear/compact),
not only at session termination. The v1.0.0–v2.0.1 wording "when the session ends and
the Stop hook fires" encoded the open spike's wrong assumption. The shipped capture
path appends an entry on every invocation with no session dedupe, so a directive
emitted at turn N is re-captured at every subsequent turn — duplicate entries,
violating SCN-001's one-entry intent. Confirmed live in the real vault (first record
captured correctly at 04:25Z; duplicates would follow each turn).

The eval suite could not catch this: graders exercised the capture CLI contract; the
hook firing cadence was exactly the mechanism the spec marked as an open spike.

## Diff summary

- ~ SCN-001: title, Given/When/Then corrected to per-turn Stop reality; AC "exactly
  one entry per session" → "one entry per distinct directive"; ACs added for
  idempotence (unchanged directive → byte-identical no-op) and revision (changed
  directive → append, preserve earlier entries; INV-3-consistent last-directive-wins)
- ~ SR-001: trigger corrected ("Stop event fires and transcript contains a directive
  not yet recorded for that session")
- + SR-013: idempotent no-op on identical session+directive (unwanted-behavior)
- + SR-014: revision append on changed directive, earlier entries preserved (event-driven)
- + Glossary: "Stop event"
- ~ Traceability: SCN-001 row gains SR-013/SR-014
- ~ evals: suite 0.2.0 → 0.3.0 — COR-R-017 (idempotent re-fire), COR-R-018 (revision
  append), COR-A-009 (hammer Stop 5×, adversarial) added to SCN-001 mapping

## Effects

- **Shipped var-3 now scores a known correctness regression** against COR-R-017/A-009
  (dataset refinement policy: extended dataset → prior variants re-evaluated). This is
  the honest record of the bug the pending hotfix must clear.
- Dissent-monitor check ran: **0 reactivations** (dissent-0002's matcher targets
  mdbase/migration wording, not present; dissent-0001's triggers are time/metric/code).
- Hotfix generation against SCN-001/SR-013/SR-014 is UNBLOCKED (mappings complete).
