---
type: decision-record
status: decided
created: 2026-11-01
updated: 2026-11-01
domain: capture
---

# Position capture retired (Branch D)

Robin decided on 2026-11-01 to retire position capture: Branch D in `docs/positions-plan.md` (2.D). This note records the evidence so the decision can be revisited.

## What changed

- The server instructions no longer teach the `librarian-position` line or route "what do I think" questions to `librarian-positions`.
- `capture-cli` no longer writes position events. A `librarian-position` comment in the Stop event's assistant message, or a direct `position` field, gets one stderr line ("position capture is retired") and is not stored. The session line in the same turn is captured as normal.
- `src/position.ts` and `src/position-directive.ts` are removed. The kind schema moved into `src/positions.ts`.
- `librarian-positions` stays, read-only, until the release after the one that ships this retirement (Robin, 2026-11-01), with a retirement notice in its title and description. The existing stream in `_librarian/positions/` is never touched.
- A test-only builder (`test/position-seed.ts`) keeps the recall and storage tests able to put events on disk.

## Evidence

- **Actor-credit trial** (PR #149, v0.9.0, window starting 2026-10-20T13:46Z when the wording reached Robin's install, read at day 13). Robin marked a sample of 18 credited lines blind: 15 real decisions, 3 requests, so 83% against the 70% bar. About 16 credited lines, against a minimum of 10. Guardrail: lines per active day 19.8 against 23.8 (down 17%, limit 25%); median 40 words against 38; 2.3% of lines over 60 words (limit 5%); lines keeping a stated reason 75% against 85% in a blind sample of 20 each. Session lines now say who decided and why.
- **Position stream:** one position line in the trial window (2026-10-27), against four in the 14 days before. Robin read this as positions being redundant, not as a capture failure.
- **Earlier evidence (1.3, 1.4):** the 1.4 baseline scored 29% (5 of 17 belief questions) with 11 of 17 failures from missing attribution, which the actor-credit wording targets. The 1.3 classification stayed unadjudicated (claim agreement 0.585 against a 0.7 gate).

## Not done

- The 17 belief questions were **not rerun** against the post-trial setup, and the position spot check (five known beliefs) was **not run**. Robin chose to retire without them.
- The spec (SR-047 to SR-057, SCN-010, and SCN-011's capture references) still describes position capture. It is owned by the flow spec process and needs its own change.

## What would change this

- A new wish-log entry asking for a topic's trajectory over time.
- Rerunning 1.3 over a later corpus and finding cross-project beliefs are often stated and lost.
- Rerunning the 1.4 questions and scoring low on belief questions even with actor-credited session lines.
