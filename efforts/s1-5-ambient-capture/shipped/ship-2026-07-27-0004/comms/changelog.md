# Changelog — my-librarian 0.4.0 (ship-2026-07-27-0004)

**Session summaries now come with a clarity contract.**

- When a session writes its one-line summary, the librarian's own guidance now
  asks for plain language: lead with what was decided or produced, use common
  words instead of the session's shorthand, and spell out codenames or version
  tags the session invented. The rule travels with the server (MCP instructions)
  and in the global capture rule — nothing to configure per project.
- When an assistant reads your history back (`librarian-recent`, or a
  prior-engagement note on a search result), it is asked to answer in plain
  language — including for older records that were written densely before this
  change.
- Nothing you wrote is ever altered: the server stores every summary exactly as
  submitted and never rewrites, truncates, or rejects one for style. Old records
  are untouched.

No action needed. The 2-week desirability gate keeps its current clock
(verdict ~2026-08-09).
