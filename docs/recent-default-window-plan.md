---
type: plan
status: proposed
created: 2026-10-26
updated: 2026-10-26
domain: recall
---

# librarian-recent: a one-week default window

## The problem

`librarian-recent` has no default limit (`src/recent.ts`). A call with neither `window` nor
`count` returns every session ever recorded. In Robin's vault the summaries alone are about
373 KB, roughly 90,000 tokens or more, and the total grows with every capture. That is
larger than many clients accept in one tool result. Everyday questions are fine, because
the client passes a window: "the last few days" is about 43 lines, or 4,000 to 5,000 tokens.
The risk is a question with no time in it.

## Decisions (Robin, 2026-10-26)

- With no `window` and no `count`, the default window is **one week**.
- It's **configurable**.
- An explicit request overrides it, for example "what have I worked on this year?".

## Design

1. **When the default applies.** Only when the call passes neither `window` nor `count`.
   A count alone ("my last 5 sessions") is not windowed, because those sessions may be
   older than a week (Robin, 2026-10-26).
2. **Setting.** `LIBRARIAN_RECENT_DAYS`, read through `readSetting` like the other
   `LIBRARIAN_*` settings, with default `7`. It is also a plugin option (`recent_days`) in
   `.claude-plugin/plugin.json`. A value that is not a positive whole number falls back to
   7 with one stderr line naming the value, the same pattern as an unresolved setting.
   `0` turns the default window off and restores today's behavior.
3. **Override.** The client passes `window` in days. For "this year", the client works out
   the days since January 1. The tool description says so. No `since` parameter: `window`
   is enough (Robin, 2026-10-26). The tool description has no character budget; the server
   instructions are untouched.
4. **Never silent.** When the default was applied, the result begins with one line:
   "Showing the last 7 days (default). Pass `window` for a longer period." This follows
   SCN-002's existing rule that abbreviation is never silent.
5. **Empty default window.** If nothing falls in the default week but older sessions
   exist, say so and give the newest session's date: "No sessions in the last 7 days. The
   most recent was 2026-10-02." Never answer "No recent sessions recorded yet" when there
   are records.
6. **Large overrides.** The tool description tells the client to pass `detail: "brief"` for
   windows over two weeks. No automatic switch to brief: that would change the output
   without being asked.
7. **Size check before a big answer.** The client can't know in advance how much a window
   holds; it sees only the tool description. The server can. It renders the full response
   first (headings, steps, refs, rename and resolution notes, notices) and **measures its
   exact UTF-8 byte length**. Estimates are never the gate: summary lengths leave out
   everything around the summaries, and any error margin would let an oversized answer
   through. Rendering about 1,000 lines in memory takes milliseconds. If the rendered
   response is over the limit, the server returns a short overview instead:
   - the number of sessions and lines, the date span, and the exact size in bytes, with an
     approximate token count (bytes ÷ 4, labeled as approximate);
   - lines per month across the span, each month with the `bookmark` that starts there;
   - how to continue: `detail: "brief"` (with its exact size, rendered the same way),
     paging with `bookmark` (below), or `confirm: true` to get it all, with a warning that the
     full answer is larger than some clients keep whole;
   - the Codex disclaimer (below).

   The overview itself must fit under the limit. If the month list would push it over (a
   very long history), it lists years instead, and each year carries an **overview
   bookmark**:
   - There are two kinds of bookmark. A **page bookmark** returns sessions. An **overview
     bookmark** returns that year's month list, each month with its page bookmark. The
     client passes either kind the same way, as `bookmark`. The kind is inside the token,
     so the client doesn't choose or build it.
   - An overview bookmark keeps the query's snapshot and scope (project, detail, cutoff)
     and limits the month list to its year. Following a month's page bookmark returns that
     month's sessions newest first, and the last page's bookmark continues into the month
     before, within the original window.
   - A year's month list has at most 12 rows, so it always fits under the limit. No third
     level is needed.

   So "my entire history" over several years goes: overview by year → choose 2025 →
   overview of 2025 by month → choose March → March's sessions, in pages.

   **Paging older history.** A `window` always ends today, so shortening it drops the
   *oldest* sessions. It can't reach an earlier month on its own. Paging covers that:
   - When a result is too big, the client can ask for it in pages: each page holds as many
     whole sessions as fit under the limit, newest first, and ends with a `bookmark` for the
     next older page.
   - A `bookmark` is an opaque token the server hands out: in effect, "sessions older than
     this one". The client never builds it from a date, so it is not a `since` parameter
     (Robin ruled that out). Each month in the overview also comes with its bookmark, so the
     client can jump straight to August without paging through September and October. The
     overview's bookmarks all share its snapshot and scope, like any other bookmark.
   - **A bookmark carries the whole query.** It holds the original cutoff as a fixed
     instant (not "N days before now"), the project filter, the detail level, any `count`
     still remaining, the snapshot instant (next point) and the position reached. A call
     with only `bookmark` continues that exact query: the seven-day default does not apply,
     and a year-long query continued a day later still ends at the same cutoff.
   - **No mixing.** A call that passes `bookmark` together with `window`, `count`, `project`
     or `detail` is refused with a message: "A bookmark carries its own window, project,
     count and detail. Start a new query to change them." This avoids any rule for which
     argument wins. A malformed or unreadable bookmark is refused the same way, never
     treated as a fresh query.
   - **Snapshot, so pages don't shift.** Sessions are ordered by their latest step, so a
     new step on an older session would move it ahead of the bookmark and it would be
     skipped. To prevent that, the first call fixes a snapshot instant. Every page of that
     query sees only lines timestamped at or before it, and ranks sessions by their latest
     step *within the snapshot*. Records are append-only, so the snapshot is exact, and
     the order is total (next point). The last page says how many
     lines were captured after the listing began and that a new query will show them.
     One edge remains: a line synced in late from another machine with an earlier
     timestamp can appear in an older page. That's stated in the docs, not designed away.
   - **A unique, stable order.** Session ids are optional, a group is session id *plus*
     project, and a line with no session id is its own group, so time and session id
     can't separate every group. Entry ids don't help either: they are capture times to the
     millisecond, and nothing makes them unique (`compactId` in `src/capture.ts`). The
     order instead uses each group's latest step (within the snapshot) as its anchor:
     1. the anchor's timestamp, newest first;
     2. then the anchor's day file, newest first;
     3. then the anchor's position in that file, last first.

     Day file plus position identifies exactly one stored line, and files are append-only,
     so the key is unique for every group (named, project-split or anonymous) and never
     changes. The bookmark stores the anchor's day and position, plus the group's session
     id and project for checking.
   - **Splitting oversized sessions and steps.** A session too big for one page, even
     brief, splits at step boundaries, with each part labeled "part 2 of 3 of this
     session". A single step too big for a page splits inside the step, and each part says
     "step continues (part 1 of 2)". A step is the summary followed by its refs, one per
     line, and either can run across pages:
     - the summary splits at a UTF-8 character boundary, preferring a space, and the parts
       rejoin to the stored text byte for byte;
     - refs split between refs, so a page may end after ref 40 of 120 and the next page
       start at ref 41;
     - a single ref line longer than a page (in practice impossible, since paths are
       limited to a few kilobytes) falls back to the same character split as a summary.

     The bookmark records where it stopped as a position: the step, then either a byte
     offset in the summary or a ref number plus a byte offset in that ref. The next page
     picks up exactly there, and every page, including one made only of refs, stays under
     the limit.
   - `detail: "brief"` and `bookmark` combine. With splitting inside steps, any part of
     history is reachable without `confirm`, however long a single record is.

   The tool description tells the client to show this overview to the user before
   continuing, so "my entire history" leads to a warning and a choice, not a 100,000-token
   result.

   **Default limit: 18,000 characters** (Robin, 2026-10-26), measured as UTF-8 bytes,
   because that is what Grok, Codex, Copilot and Antigravity count. For plain English text
   bytes and characters are the same, and accented or non-Latin text counts as more.
   Configurable as `LIBRARIAN_RECENT_MAX_CHARS`. The limit is set for the strictest known
   client, so an answer under it arrives whole everywhere:

   | Client | Keeps whole | Above that (checked 2026-10-26) |
   |---|---|---|
   | Grok 1.0.62 | 20,000 bytes | Cut short; full result saved to a file |
   | Copilot CLI 1.0.100 | probably 20 KB (unconfirmed) | Saved to a file, 500-character preview |
   | Codex 0.164 | about 48,000 bytes | **Middle deleted, no copy kept** |
   | Claude Code | 50,000 characters | Saved to a file |
   | Antigravity 1.4.2 | not documented | Middle cut in the preview; full result saved to a file |
   | Muse Code 1.4.x | not documented | Unknown |

   A client that saves the full result to a file is an acceptable fallback after
   `confirm: true`: the model can still read all of it. Codex is not, which is why it gets
   a disclaimer.

   **Codex disclaimer.** The overview always includes: "In Codex, a result over about 48 KB
   loses its middle with no copy kept. In Codex, use `detail: "brief"` or a shorter
   `window` instead of `confirm`, or raise `tool_output_token_limit` in Codex's
   config.toml." The disclaimer is always shown, not only when Codex is detected, because
   the server can't reliably tell which client it is talking to.

   `count` and `window` calls are checked the same way. A full week often goes over 18,000
   characters (a busy week is about 40–50 KB), so in practice the default week often
   arrives as the overview, and `detail: "brief"` is the usual next step.
8. **CLI.** `rutter-memory recent` uses the same default and setting, so the CLI and the
   tool agree.

## Spec

- **SCN-002:** add acceptance criteria for the default window, the stated notice, the
  empty-window message, the override, and the size check (an overview instead of an
  oversized result, never a silent cut). A new SR for the setting and its fallback.
- **Behavior change for existing callers:** a call with no arguments returns one week,
  not everything. Say so in the changelog.

## Tests

- No arguments: only the last 7 days, plus the notice.
- `count` alone: no window applied and no notice.
- `window` alone: that window and no notice; `window: 365` returns older sessions.
- Setting: `LIBRARIAN_RECENT_DAYS=14` is honored; `0` returns everything; `abc` and `-3`
  fall back to 7 with a stderr line; an unresolved `${user_config.recent_days}` falls back
  with `readSetting`'s existing stderr line.
- Empty default window with older records: the message names the newest date.
- Size check: the gate is the exact byte length of the rendered response, never an
  estimate. Over the limit returns the overview (counts, span, exact size, per-month lines
  with bookmarks, ways to continue) and no sessions; `confirm: true` returns everything;
  `detail: "brief"` is gated on its own rendered size; a window under the limit is
  unchanged.
- Boundary: a reference-heavy fixture (many refs, rename notes and unresolved-ref notes)
  whose summaries alone total under 18,000 bytes but whose rendered response is over is
  answered with the overview, not passed through. A response of exactly 18,000 bytes
  passes; 18,001 does not.
- The overview always fits under the limit, falling back to years when the months
  wouldn't fit.
- Paging: every page is under the limit and ends with a bookmark; following bookmarks from
  the newest page reaches the oldest session with nothing skipped or repeated; a month's
  bookmark starts at that month.
- Scope kept: a 365-day query continued using only its bookmark keeps the original
  cutoff (tested with the clock moved forward a day between pages), project filter,
  detail level and remaining count, and no default window is applied.
- Mixing refused: `bookmark` with any of `window`, `count`, `project` or `detail` is refused
  with the message; a malformed bookmark is refused, not treated as a new query.
- Snapshot: a new session captured between pages doesn't appear or shift pages. A **new
  step appended to an existing, not-yet-returned session** between pages doesn't move it
  ahead of the bookmark; it is returned once, in its snapshot position. The last page
  reports lines captured since the listing began.
- Continuation when even brief is over the limit: brief plus bookmark pages through the
  whole window, each page under the limit; an oversized session splits at step
  boundaries with part labels.
- Oversized single step: a one-step session whose summary is 50,000 bytes pages through in
  parts, each under the limit; the parts rejoin to the stored text byte for byte; no part
  splits a multi-byte character.
- Oversized refs: a step whose refs alone total 60,000 bytes pages through with refs
  continuing across pages; every page, including refs-only pages, is under the limit;
  every ref appears exactly once, in order.
- Year fallback: with a history long enough that the month list would go over the limit,
  the overview lists years with overview bookmarks; following 2025's returns 2025's
  months with page bookmarks; following March's returns March's newest sessions, and
  paging continues into February. Every step keeps the original snapshot, project and
  detail, and every response is under the limit. An overview bookmark passed with other
  arguments is refused like any bookmark.
- Equal timestamps: groups whose anchors share a timestamp (two named sessions; one
  session split across two projects; two anonymous lines; a named session and an
  anonymous line) page in a stable order, with a page boundary placed between each such
  pair in turn, and nothing is skipped or repeated. Duplicate entry ids in one day file
  are handled the same way.
- The overview always carries the Codex disclaimer and the `confirm` warning.
- Non-ASCII summaries count by bytes, not characters.
- The CLI matches the tool.

## Docs

- Getting started and from-source: add `LIBRARIAN_RECENT_DAYS` and
  `LIBRARIAN_RECENT_MAX_CHARS` to the optional settings.
- Known issues: a confirmed entry for Codex deleting the middle of large tool results,
  with the `tool_output_token_limit` workaround.
- `server.json`: add both variables to the Registry entry.
- Changelog entry at release.

## Settled (Robin, 2026-10-26)

1. `count` alone gets no default window.
2. No `since` parameter; `window` is enough.
3. Default size limit: 18,000 characters (measured as bytes), set for the strictest client.
   Replaces the earlier 20,000-token figure, which only claude.ai could take whole.
4. Over the limit: an overview with a "confirm to get it all" warning and a Codex
   disclaimer. Clients that save the full result to a file are an acceptable fallback.

## Review changes (2026-10-26)

- The gate is the exact byte length of the rendered response. Estimates appear only in
  the overview's approximate token figure.
- Paging with opaque bookmarks, including one per month in the overview, so older history
  is reachable without `confirm`. This is not a date parameter: the client never builds a
  bookmark itself.
- The parameter is named `bookmark`, not "cursor": plain English, and no clash with the
  Cursor editor (Robin, 2026-10-26).
- Second review: a bookmark carries the whole query (fixed cutoff, project, detail,
  remaining count) and can't be mixed with other arguments; paging uses a snapshot so new
  steps don't reorder sessions mid-listing; a single oversized step splits inside the
  step and rejoins byte for byte.
- Third review: refs may continue across pages, with the bookmark position covering both
  summary and refs; the order is anchored on each group's latest stored line (timestamp,
  day file, position in file), unique even for anonymous lines and duplicate entry ids.
- Fourth review: the year-level overview continues through overview bookmarks, which
  return a year's month list; page bookmarks return sessions. The client passes both the
  same way.
