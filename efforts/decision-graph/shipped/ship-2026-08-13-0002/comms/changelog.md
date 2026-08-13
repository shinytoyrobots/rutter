# rutter — Position recall (decision-graph Phase B)

*Ship 2026-08-13 · spec v14.0.0 · gated ship · default comms bundle only
(changelog + internal changelog; sponsor/GA/sales/support/marketing tiers deliberately
not produced, per operator preference)*

Phase A gave sessions a way to record a stance. This ship gives you a way to get it
back.

## New

- **A new tool, `librarian-positions`, recalls what you decided about a topic.**
  It is read-only. Ask it three different ways:

  - `topic` — an exact topic key. Returns that one topic, or a plain "no position
    recorded" message naming the key you asked for.
  - `query` — free text, matched against the wording of your recorded stances.
    Returns a list.
  - `note` — a vault-relative note path. Returns the positions whose references
    include that note. Returns a list.

- **Every recalled stance says where it came from.** A position is rendered with an
  attribution line — `from your position record: formed <date>, revised <date>` —
  and the server instructions tell a connected client to present it that way rather
  than restate it as its own present-tense conclusion. The point is that a stance
  you took in March never comes back sounding like something the assistant just
  worked out.

  Re-endorsing a stance without changing it does not move the "revised" date. Only
  an actual change does.

- **You see the current stance by default, the whole history on request.** Pass
  `chain: true` and you get every event for that topic in order — each one's
  wording, what kind of change it was, when, which session, and which notes it
  cited.

- **A retired topic reads as retired, with its own closing words.** When the most
  recent thing you did on a topic was retire it, the default view shows the
  retirement itself — its date, labeled explicitly as a retirement, and whatever
  you wrote when you retired it (often the reason). It does not resurrect the
  stance from before, and it never presents a retirement as if it were a revision.
  Nothing is deleted; the full history still shows every earlier event.

- **Searching looks through superseded stances too.** A free-text or by-note search
  matches against a topic's entire history, not just its current stance — so
  "did I ever think X?" finds a position you have since changed your mind about.
  What comes *back* is still the current stance unless you ask for the chain.
  Matching wide, answering narrow.

- **A quiet dormancy note.** A topic with nothing recorded against it for a while
  is flagged as dormant in its attribution line, with the date of the last thing
  recorded. This is worked out fresh each time you ask — nothing is stored, no
  score accumulates anywhere. Retired topics are never labeled dormant; you closed
  them on purpose, and that is not the same thing as neglect.

- **Positions spanning several months fold together.** Recall reads every monthly
  positions file, not just the newest, so a topic asserted in June and revised in
  August comes back as one coherent history.

## Worth knowing

**New positions appear after the next reindex, not immediately.** Recall reads a
prepared table that is rebuilt during reindex, and reindex is the only thing that
builds it. So a position captured in this morning's session is not visible to
`librarian-positions` until a reindex has run. This is a bounded, deliberate delay
rather than a silent gap — it is what keeps recall structurally incapable of
disturbing the capture path.

**Restart the server to pick this up.** Clients learn about the new tool from the
instructions the server hands over when a connection opens, so an already-running
client will not see `librarian-positions` until it reconnects.

**Capture is untouched, and that was measured rather than assumed.** Session records
come out byte-for-byte identical, the position-capture write path is unchanged, and
this ship never writes to `_librarian/positions/` at all. If you ever want to throw
the recall tables away, delete `data/librarian.db` and reindex — they rebuild
entirely from the position files, which remain the only real record.

## Known limits

- **A cited note that has since been renamed shows under its old path.** Position
  output uses its own renderer for cited notes, and that renderer does not resolve
  a note's current identity — so where `librarian-recent` would annotate a
  reference as renamed or unfindable, position output shows the path as it was
  recorded, unannotated. This is disclosed rather than fixed; it is a known
  follow-up, not something discovered after the fact.
- **A vault filename containing raw control characters can still reach your
  terminal — through `librarian-recent`, not through this tool.** Position output
  neutralizes every field it prints, including topic keys and cited paths, and
  there is now a test pinning exactly that. The older recall surface does not, and
  bringing it in line was deliberately out of scope here. Same for a small class of
  text-direction control characters, which currently pass unneutralized on every
  surface in the server — pre-existing, cheap to fix, and queued.
- **A guarantee this feature cites is not currently airtight.** Rebuilding the
  recall tables twice against unchanged position files produces identical results.
  The equivalent guarantee for the older note-identity tables does not hold once a
  note has been renamed — a pre-existing defect this ship neither introduced nor
  fixed. It does not affect position recall, but it is being tracked.
- Still not built: drift visibility across related topics, thread grouping, and
  backfilling positions out of older session records. Separate later phases.

Full grounds, disclosed gaps, and what is being watched: `../ship-record.md` and
`internal-changelog.md`.
