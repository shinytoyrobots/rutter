# rutter — Position capture (decision-graph Phase A)

*Ship 2026-08-13 · spec v4.0.0 · gated ship · default comms bundle only
(changelog + internal changelog; sponsor/GA/sales/support/marketing tiers deliberately
not produced, per operator preference)*

## New

- **A session can now record a stance, not just a summary.** When a session forms,
  changes, reaffirms, or retires a position on some topic, the client emits one line:

  ```
  <!-- librarian-position POSITION assert|revise|reaffirm|retire <topic-key>: <stance> -->
  ```

  The capture hook lifts it the same way it already lifts a session summary. The four
  action words are the only router — nothing reads the stance to decide what to do
  with it.

- **Positions live in their own file, month by month.** Captured stances append to
  `_librarian/positions/<YYYY-MM>.md`, a stream that did not exist before. Nothing is
  written anywhere else, and nothing under `_librarian/` outside that path is touched.

- **Session capture is untouched, and that was tested rather than assumed.** Session
  records come out byte-for-byte identical whether or not a position was captured in
  the same turn — checked across five different orderings of position and session
  directives mixed together, including both on one payload.

- **Nothing is ever deleted or rewritten.** Retiring a position appends a new entry
  saying so. Earlier entries are never modified, removed, reordered, or compacted.

- **Topic keys are stored exactly as you wrote them.** A key with spaces, punctuation,
  or unusual characters is accepted and kept verbatim. If it departs from the
  kebab-case convention, you get a note on stderr — never a rejection and never a
  silent rewrite. Same for an over-long stance: reported, stored as written.

- **An empty or malformed directive captures nothing at all.** A directive with no
  stance after the colon is treated as if it were never written: a diagnostic on
  stderr, and no blank entry stored in either stream.

- **This is capture only.** There is no way to read positions back yet — no query, no
  history-of-a-topic view, no drift detection. Those are a later phase. This ship
  guarantees only that what is being recorded now will support them.

## On-disk format is marked provisional

The positions file identifies its own format as `position-event@1-provisional`. The
`-provisional` suffix is deliberate and disclosed: the exact shape of what is written
to disk may still change before it is finalized.

This is invisible in normal use. It matters if you inspect the raw files or intend to
build something that reads them — **don't pin a reader to this shape yet.**

## Known limits

- No read path (above). Existing session records are not backfilled with positions;
  that is a later phase too.
- Topic keys have no length limit and are stored raw, without the character
  normalization applied to the stance. Storage is safe and file integrity holds, but a
  future reader that prints a topic key to a terminal will print whatever was in it.
- Two open items are disclosed with this ship and pending a spec decision, not a code
  fix: the provisional format marker above has not yet been formally ratified, and one
  test expects a diagnostic message for a directive whose action word isn't one of the
  four — a message the spec does not currently promise. Neither is a behavior a user
  would notice; both are tracked. See `../ship-record.md`.
