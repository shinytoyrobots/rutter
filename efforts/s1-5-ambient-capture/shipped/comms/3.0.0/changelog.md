# Spec v3.0.0 — s1-5-ambient-capture (2026-07-25)

*Major amendment from a post-ship finding, ~2 hours into dogfooding. No code change
yet — this version specifies the fix; the hotfix implements it.*

## What dogfooding found

Claude Code's Stop event fires at the end of **every assistant turn** (and around
clear/compact) — not only when a session ends, which is what the spec had assumed
(it was the documented open spike). The shipped capture appends on every invocation,
so one directive gets re-captured every turn: duplicate entries. Confirmed live in
the real vault minutes after the hook went active. Severity: cosmetic (records are
human-editable markdown), but it violates the one-entry intent.

## What changed

- **SCN-001** now specifies capture as **idempotent per distinct directive**: new
  directive → captured once; unchanged directive → byte-identical no-op no matter how
  many Stops fire; changed directive → revision appended, earlier entries preserved
  (never overwritten — the no-delete invariant holds).
- **SR-001 revised**; **SR-013** (idempotence) and **SR-014** (revision) added.
- **Eval suite 0.3.0**: three new tasks (COR-R-017 idempotent re-fire, COR-R-018
  revision append, COR-A-009 adversarial 5× Stop hammer). Under the refinement
  policy the shipped variant now carries an honest, known correctness regression
  against these tasks until the hotfix clears it.

## Next

Hotfix the capture path against SR-013/SR-014 (mappings complete — generation
unblocked). Until then, occasional duplicate lines in a day's session file are
harmless and hand-deletable in Obsidian.
