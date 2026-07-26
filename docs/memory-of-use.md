# Memory-of-use (S1.5): capture, recall, enrichment, and the gate

S1 proved retrieval. S1.5 adds the first thing a stateless assistant *can't* have:
**memory that accrues by itself and surfaces later.** The librarian now quietly
records what each Claude Code session decided or produced, lets you recall recent
work, annotates search results you've engaged before, and measures whether you
actually reach for any of it.

All of this is local-first: nothing leaves your machine, the server runs no AI
model (your client is the brain), and it only ever writes inside your vault's
`_librarian/` overlay and the disposable `data/` index.

---

## 1. Where the librarian keeps what it remembers

Session memory lives in your vault, as plain, human-readable, git-committable
markdown:

```
<vault>/_librarian/sessions/2026-07-24.md
```

- **One file per day.** Each Claude Code session that produced something worth
  remembering adds **one curated line** to that day's file — not the raw
  transcript.
- **Typed frontmatter.** Each record carries a small typed header (the day, each
  session's identity and time, the curated summary, and the notes it touched by
  versioned identity). The shape is deliberately mdbase-compatible so a future
  upgrade is a drop-in.
- **You can read and edit it.** It's your markdown, in your vault. Open it in
  Obsidian, edit it, commit it.
- **It is never auto-deleted.** Records are only ever appended to. The librarian
  has no prune or delete path that destroys memory-of-use; a re-capture on the
  same day *appends*, it never overwrites earlier entries.

A note reference is stored as a **versioned identity** — the vault-relative path
plus a content-hash captured as it was read — so the reference still tells you
*what you saw* even after the note changes later.

---

## 2. Ambient capture — setting it up

Capture is **ambient**: it happens at session end with no action from you inside
the session. It is wired through a Claude Code **Stop hook**.

**How the summary is produced (no AI in the server).** The librarian server never
summarizes anything — that would be inference, which it does not do. Instead your
client (Claude) writes the one-line summary *during* the session as a directive,
and the hook lifts it out of the transcript verbatim. Emit a directive like this
whenever a session is worth remembering:

```
<!-- librarian-session {"summary":"Decided to store refs by content-hash; shipped capture.","refs":["Notes/foo.md"]} -->
```

- `summary` — the one curated line. Required.
- `refs` — optional vault-relative paths of notes the session touched.
- The **last** directive in the session wins. If you emit none (or an empty
  summary), nothing is captured and no empty file is created.

**Install the hook.** Build first (`npm run build`), then add the Stop hook to
your Claude Code settings (`~/.claude/settings.json` or a project
`.claude/settings.json`):

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "/ABSOLUTE/PATH/hooks/librarian-stop.sh" } ] }
    ]
  }
}
```

The script reads the Stop event on stdin, extracts the directive, and appends one
entry. It always exits cleanly, so a capture hiccup can never break your session.

> **Manual-for-now honesty.** The exact hook wiring is an intentional spike. Today
> capture depends on the client emitting the directive (a convention you or your
> `CLAUDE.md` adopt). You can also capture directly for testing:
> `echo '{"summary":"...","refs":["Notes/x.md"]}' | npm run capture`.

---

## 3. Recall recent work — `librarian-recent`

Ask *"what was I working on lately?"* and Claude calls the **`librarian-recent`**
tool. It returns recent session summaries **most-recent-first**, each with its
date and the versioned provenance of the notes it references.

- **Window:** limit to a recent span, e.g. *"what did I do last week?"* →
  `window: 7` (the last 7 days).
- **Count:** cap the number of sessions, e.g. `count: 3` for the three most
  recent.
- **Empty state:** with no records yet, it returns a plain
  *"No recent sessions recorded yet."* message — never an error.

From the terminal:

```bash
npm run recent            # everything, most-recent-first
npm run recent -- 3       # the 3 most recent
npm run recent -- --days 7  # just the last week
```

---

## 4. Search enrichment — quiet prior-engagement signals

When you run **`librarian-search`** and a result is a note a past session
referenced, that one result carries a quiet **prior-engagement** note: *what you
concluded and when*. For example:

```
1. Orbital telemetry pipeline — reference · evergreen · 2026-05-02
   Notes/foo.md
   …matching snippet…
   ↩ prior engagement 2026-07-22: "Decided foo is the canonical source."
```

- **Silence is intentional.** Results you've never engaged carry **no**
  annotation. That's by design — the librarian is quiet when unprompted; the
  absence of a note is not a bug and is never "not seen before" noise.
- **It never changes your results.** Enrichment is *additive metadata only*: the
  set of results and their ranking are byte-identical to the plain S1 search. A
  prior engagement never promotes, demotes, adds, or drops a result.

---

## 5. Measuring the desirability gate

S1.5 exists behind a kill gate: *does ambient memory-of-use actually pull you
toward stateful behavior?* The gate target is **reaching for a stateful behavior
unprompted ≥3×/week for 2 weeks.**

Every time you invoke `librarian-recent`, or run a search that surfaces at least
one prior-engagement signal, the librarian appends one timestamped event to a
local, append-only log (`_librarian/stateful-use.jsonl`). A single search counts
as exactly one event no matter how many signals it surfaced.

Read the per-ISO-week count to evaluate the gate:

```bash
npm run gate                       # counts across all history
npm run gate 2026-07-13 2026-07-26 # counts within a date range
```

Output is one line per ISO week, marking weeks that met the ≥3 target:

```
stateful-use per ISO week (gate target: >=3):
  2026-W29: 2
  2026-W30: 4  ✓
```

> Classifying an invocation as truly *unprompted* is left to manual wish-log
> review; the log captures every invocation with a timestamp so that review is
> possible.

---

## Guarantees

- **Local-first (INV-1):** no network calls, ever.
- **Store immutability (INV-2):** the librarian only writes under `_librarian/`
  and `data/`; it never creates, modifies, or deletes vault notes.
- **No hard-delete (INV-3):** memory-of-use records are only appended.
- **Rebuildable (INV-4):** `data/librarian.db` is a disposable cache; delete it
  and `npm run reindex` reconstructs everything from the vault + `_librarian/`.
- **No AI in the server (INV-6):** summaries are your client's; the server stores
  and serves them verbatim.
