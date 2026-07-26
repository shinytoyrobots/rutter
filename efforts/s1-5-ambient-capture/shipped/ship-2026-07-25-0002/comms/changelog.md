# my-librarian — capture is now idempotent (ship-2026-07-25-0002)

*2026-07-25 · spec v3.0.0 · gen-2 hotfix, same-day turnaround on a day-one dogfooding find*

## Fixed

**Duplicate session entries.** Claude Code fires its Stop hook at the end of every
assistant turn — not once per session — so a session's summary line was being
re-captured every turn (observed live: 6 duplicates in a few hours). Capture now
recognizes a directive it has already recorded (same session, same normalized
content — even across a UTC midnight boundary) and does nothing, byte-for-byte.
A *changed* directive still appends a revision; nothing is ever overwritten or
deleted.

## Hardened along the way (adversarial evaluation, 13/13 probes)

Invisible-character variations dedupe correctly; reordered refs dedupe; corrupt
neighbor files fail closed without breaking the hook; identical summaries from two
different sessions both record; hammering the hook can't inflate your gate counts.

## Notes

- Your vault's 2026-07-26 session file was cleaned of the 6 bug-artifact duplicates
  (the genuine entry remains; `librarian-recent` verified).
- Fix is live from the next turn — no restart needed for capture (a fresh session is
  still recommended so everything runs from one build).
- Docs corrected: "re-capture appends" → idempotent-per-directive semantics.
