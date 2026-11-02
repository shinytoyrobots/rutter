# How rutter compares

*Built-in memory, Markdown vaults, decision logs, and git provenance — what each tool keeps, and when to use something else.*

Dozens of tools now offer memory for AI coding and research sessions. They share a label, yet they solve different jobs. Some summarize every tool call into a database. Some give the model write access to your notes. Others attach reasoning to git commits, or merge past sessions into a single evolving profile.

When you compare them, three questions separate the designs:

1. **What gets written down, and who writes it?** Some tools save raw transcripts or run a background model to summarize the session. Others give the agent a write tool, or lift one line written at the end of a turn.
2. **What happens to old entries?** Are earlier decisions merged into a current summary, overwritten when a view changes, or kept in date order as an append-only log?
3. **How are sources checked later?** When a record cites a note, it can store a content hash (a fingerprint of the file's bytes at capture). What happens later when that file moves or changes?

`rutter` takes a specific position on those three questions. When a turn decides or produces something worth keeping, your AI client ends its reply with one plain-English HTML comment. That comment names what was decided, why, and which notes the session cited. A capture hook (a script the client runs after each turn) lifts the line and appends it to `_librarian/sessions/<date>.md` inside your notes folder. For each cited note, the server computes and stores a SHA-256 content hash of the file as it stood when capture ran. Capture runs no second model and makes no network call.

Reading uses three read-only MCP (Model Context Protocol, the standard way an AI client connects to an outside data source) tools: `librarian-search`, `librarian-get-note`, and `librarian-recent`. rutter's tools (`librarian-*`), environment variables (`LIBRARIAN_*`), and the `_librarian/` folder keep the project's earlier name, *librarian*.

Six clients have a working capture hook today: Claude Code, Grok, Codex, GitHub Copilot CLI, Antigravity CLI (`agy`), and Muse Code (`muse`). Any other MCP client can search and recall with one `npx` entry, without capturing.

## The short version

| Tool | Where records live | How capture works | What happens to old entries | How sources are checked | Use this when… |
|------|--------------------|-------------------|-----------------------------|-------------------------|-----------------|
| **rutter** | `_librarian/sessions/<date>.md` inside your notes folder | Turn-end hook lifts one HTML comment written by the active session (no extra large language model (LLM) calls) | Append-only dated lines; earlier decisions stay beside later ones | Server hashes cited notes at capture; follows unedited renames; marks missing refs `[UNRESOLVED]`; same-path edits are not flagged today | You keep a Markdown notes folder, use multiple AI clients, and want dated decisions tied to the notes they cited |
| **Claude Code Auto Memory** | `~/.claude/projects/<project>/memory/` (`MEMORY.md` + topic files) | Built-in client writes recaps; background Auto Dream pass consolidates entries | Merged and pruned periodically so the file stays short | None | You only use Claude Code and want zero-setup project preferences |
| **GitHub Copilot Memory** | GitHub cloud account (per repository) | Built-in agent captures repo conventions during coding and review | Entries expire after 28 days unless re-verified | Cites code lines and checks them against the branch on read | Your team lives in GitHub and wants short-lived repo facts shared across Copilot tasks |
| **Kage** (`@kage-core/kage-graph-mcp`) | `.agent_memory/` Markdown files in a code repository | Agent calls `kage_learn` MCP tool during a session | Append-only Markdown files with superseded status flags | Hashes cited code lines (`x-kage-fingerprint`); **withholds** stale memories on recall | You want code-coupled memories that refuse to return when the cited code changes |
| **Funes** (`huggingface/funes`) | Local vector dataset (`~/.funes/store.lance`) | Hook ingests full session transcripts from Claude Code, Codex, pi, and Hermes (no LLM calls; embeds locally) | Append-only raw conversation turns; never summarized | None (stores full turn text and workspace path) | You want semantic and keyword search over every raw turn you ever had, without distilling decisions |
| **Recall** (`raiyanyahya/recall`) | `.recall/history.md` and `.recall/context.md` in a repo | Git and Claude hooks extract turn text offline using word-frequency scoring | `history.md` is append-only; `context.md` is overwritten each run | None | You want an offline, zero-token session log inside a single git repository |
| **Nauro** (`Nauro-AI/nauro`) | `.nauro/` Markdown decision records in a repo | Agent calls `propose_decision` MCP tool | Append-only Markdown files; older records can be marked superseded | Links file paths without content hashes | You want formal multi-section decision records (`Context`, `Decision`, `Rejected Alternatives`) in a repo |
| **AdrMcp** (`Atypical-Consulting/AdrMcp`) | `docs/adr/` Markdown ADR (Architecture Decision Record) files | Agent calls `create_adr` or `supersede_adr` MCP tools | Numbered ADR files with explicit supersession links | `find_stale_adrs` checks whether cited file paths and code symbols still exist | You want a structured ADR linter that checks code symbols in a software project |
| **Basic Memory** (`basicmachines-co/basic-memory`) | Your Markdown vault (Obsidian-compatible) | Agent calls `write_note` and `edit_note` MCP tools to write notes directly | Agent edits notes in place or appends observations | Wikilinks between notes; no content hashes | You want the AI to author and reorganize your vault notes directly |
| **claude-memory-compiler** (`coleam00`) | Markdown knowledge wiki + `daily/` logs | Hook triggers background Claude Agent SDK calls to compile sessions into wiki articles | Background model rewrites and merges wiki pages | None | You want an AI-written personal wiki compiled automatically from your transcripts |
| **Lore** / **Entire CLI** | Git commit trailers (`Lore`) or a shadow branch (`Entire`) | Prompt rule writes commit trailers (`Lore`), or CLI checkpoints commits (`Entire`) | Commit history; each record pinned to a commit | Pinned to the git commit hash | Every decision you care about ends in a git commit inside a code repository |
| **claude-mem** (`thedotmack/claude-mem`) | `~/.claude-mem/claude-mem.db` (SQLite + Chroma vectors) | Lifecycle hooks run a background worker that summarizes every tool call via the Claude Agent SDK | Compressed observations stored in SQLite | None | You want automatic capture of every file edit and shell command inside Claude Code |

## Built-in memory: Claude Code, Copilot, and Codex

Claude Code, Copilot, and Codex all ship built-in memory.

- **Claude Code** offers `CLAUDE.md` (rules you write by hand) and **Auto Memory** (`MEMORY.md` plus topic files under `~/.claude/projects/`). Its background **Auto Dream** pass periodically reviews those files, merges overlapping entries, and removes what looks outdated.
- **GitHub Copilot Memory** stores repository conventions in your GitHub account. Each entry cites specific code lines, checks those lines against the current branch before using the memory, and expires after 28 days of inactivity.
- **OpenAI Codex** stores user memories in your OpenAI account and reads project `AGENTS.md` files from disk.

Built-in memory is convenient because there is nothing to install. Two limits show up when you work across multiple tools or over long horizons. First, the memory stays inside one vendor's tool. What Claude Code learns on Monday is invisible to Codex or Grok on Tuesday. Second, consolidation flattens history. Once Auto Dream merges two entries, you only see what the summary says today. The sequence of decisions that led there — and the date you changed your mind — is gone.

`rutter` keeps the memory in your notes folder so all six supported clients share one log. Every dated entry stays intact.

## Session and provenance neighbors: Kage, Funes, and Recall

Three open-source tools each overlap with part of rutter's design and make a different call on the rest.

### Kage (`@kage-core/kage-graph-mcp`)

Kage is rutter's closest neighbor on content-hashed provenance. It stores memories as Markdown files with YAML metadata in a code repository's `.agent_memory/` folder. When an agent records a memory through Kage's `kage_learn` tool, Kage anchors the entry to specific file paths and line ranges. It also computes a content fingerprint (`x-kage-fingerprint`) of that code block.

The main difference is what happens when a cited file changes:

- **Kage withholds the memory.** On recall (`kage_recall` and `kage_context`), Kage checks the fingerprint against the working tree. If the cited code lines have changed, Kage flags the memory as stale and withholds it from the agent until it is re-verified.
- **rutter shows the record and marks what it cannot place.** If a cited note was renamed without edits, `rutter` follows the SHA-256 hash to the new path. If the path is gone and no single note matches the hash, `rutter` still returns the decision and marks the reference `[UNRESOLVED]`. Checking whether a note was edited *in place* at the same path is not built in `rutter` today.

Kage is built for code repositories where a stale architectural note can mislead a coding agent. `rutter` is built for a personal notes folder. It lets you see what you decided in March alongside the fact that a cited note moved or vanished.

### Funes (`huggingface/funes`)

Built by Thomas Wolf at Hugging Face, Funes avoids background summarization too: it keeps raw turns and never distills them. Funes also works across multiple clients (Claude Code, Codex, and the coding agents pi and Hermes) using hooks and an MCP server.

Where they diverge is **what gets stored**:

- **Funes stores the entire raw transcript.** At the end of a session, Funes parses the client's transcript and embeds every user and assistant turn locally (`all-MiniLM-L6-v2`). It writes those turns into a binary Lance dataset (`~/.funes/store.lance`) for hybrid vector and keyword search.
- **rutter stores one distilled line per decision in plain Markdown.** The active session writes a 40-to-60-word summary naming what was decided and which notes were cited. `rutter` appends that line to `_librarian/sessions/<date>.md`.

If you want to search every raw conversation turn you have ever had across projects, use Funes. If you want a readable log of decisions pinned to the Markdown notes they cited, use `rutter`.

### Recall (`raiyanyahya/recall`)

Recall is a local command-line tool that hooks into Claude Code and git commits. Like `rutter`, it makes no LLM or network calls during capture, and it writes an append-only Markdown log (`.recall/history.md`).

Recall does not ask the active model to emit a one-line decision summary. Instead, it runs statistical word-frequency scoring (TF-IDF and TextRank) over the session transcript. It appends the extracted points to `.recall/history.md` and overwrites a snapshot file (`.recall/context.md`). Recall has no MCP server, does not hash cited files, and lives inside a single repository instead of a shared notes folder.

## Decision logs and ADR servers: Nauro and AdrMcp

If the part of `rutter` you care about is recording decisions and why they were made, two MCP servers approach that job from software architecture.

- **Nauro** (`Nauro-AI/nauro`) stores multi-section Markdown decision files (`# Context & Requirement`, `# Decision`, `# Rejected Alternatives`, `# Consequences`) in a repo's `.nauro/` directory. It indexes them in memory with BM25 (keyword ranking) and exposes ten MCP tools (`check_decision`, `propose_decision`, `diff_since_last_session`, and others).
- **AdrMcp** (`Atypical-Consulting/AdrMcp`) manages numbered ADR (Architecture Decision Record, a short file recording a technical choice) files in `docs/adr/`. Its `find_stale_adrs` tool checks whether file paths and code symbols listed in an ADR's `code_refs` metadata still exist in the repository. A second tool, `detect_conflicts`, flags overlapping records.

Both tools rely on **explicit tool calls**: the agent must call `propose_decision` or `create_adr` during the session, producing a full document per decision. `rutter` uses **ambient turn-end capture**. The model leaves a single HTML comment at the end of its normal reply, and the hook records it without a tool call.

## Markdown and Obsidian servers: Basic Memory and claude-memory-compiler

Several tools use a local Markdown or Obsidian vault as the memory store. The dividing line is **whether the AI edits your notes**.

- **Basic Memory** (`basicmachines-co/basic-memory`) is a read-write knowledge base over local Markdown files. It gives the agent MCP tools (`write_note`, `edit_note`) to create and update notes directly, using a grammar of `[category]observation #tag` bullets and `[[WikiLink]]` relations.
- **claude-memory-compiler** (`coleam00/claude-memory-compiler`) uses Claude Code hooks to save session transcripts into `daily/` logs. A background worker then calls the Claude Agent SDK (Anthropic's software development kit) to compile and rewrite a personal wiki of interconnected Markdown articles.

rutter's MCP server is **strictly read-only over your notes**. It leaves your prose untouched, never reorganizes your folders, and requires no special note format. Your notes stay yours; `rutter` only appends session records inside `_librarian/sessions/` beside them. That boundary matters when you use your vault for fiction, essays, or research where the exact wording is canonical.

## Git-commit provenance: Lore, Entire, and git-ai

Another group of tools ties AI session history directly to git commits:

- **Lore** (`lore-protocol`) is rutter's closest cousin on capture mechanics. Lore instructs the active coding agent to write structured git commit trailers (`Directive:`, `Rejected:`, `Constraint:`, `Confidence:`) when it commits code. That takes no separate LLM call, runs while context is loaded, and pins the record to the commit hash.
- **Entire CLI** (`entire.io`) and **git-ai** record session checkpoints, prompts, and line-level AI authorship metadata on git commits or shadow branches (`entire/checkpoints/v1`).

When your work is software engineering and every meaningful decision lands in a `git commit`, commit-bound provenance is a strong fit. The git commit tree already hashes the entire repository. Those tools stop working when a session produces no code commit. Think of an hour spent evaluating strategy memos, editing an essay, or researching competitors in a notes folder. `rutter` captures at the end of the turn, whether or not you ever run `git commit`.

## Tools that summarize session activity: claude-mem and cloud memory

Tools such as **claude-mem** (`thedotmack/claude-mem`), **mcp-memory-service**, and cloud services like **Mem0** or **Zep** aim to capture everything the agent did.

`claude-mem` attaches hooks to five lifecycle events (`SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop`, `SessionEnd`). Whenever the agent runs a command or edits a file, a background worker calls the Claude Agent SDK to compress that action. It stores those structured observations in SQLite (`~/.claude-mem/claude-mem.db`) and a Chroma vector index.

That approach captures fine-grained operational telemetry automatically, with three differences from `rutter`:

1. **Background LLM calls.** Summarizing every tool call consumes API quota or subscription rate limits in the background. rutter's hook and server make no LLM calls.
2. **Database storage.** Primary records live in a SQLite database or a cloud account rather than plain Markdown files in your notes folder. (In `rutter`, SQLite FTS5 — SQLite's built-in full-text search — is only a disposable cache rebuilt from your Markdown files.)
3. **Volume over selectivity.** Capturing every tool use records a lot of scaffolding. `rutter` asks the session for a line only when a turn decided or produced something worth recalling later.

## Limits to weigh before choosing rutter

rutter's design trades automation for inspectability. Those trade-offs are worth reading plainly before you install:

- **Capture depends on the model.** A record exists only if the model followed instructions and wrote the `<!-- librarian-session ... -->` comment at the end of its turn. In small single-person trials, models sometimes skipped the line (see [Known issues](./known-issues.md#capture-depends-on-the-model)). Hook-driven transcript indexers like Funes or `claude-mem` capture every turn regardless of model compliance.
- **A cited note may not have been read.** A reference records which note paths the model listed in its comment, plus the server's SHA-256 hash of each file when capture ran. It does not prove the model opened or read those notes.
- **Same-path edits are not flagged yet.** If a cited note is renamed without edits, `rutter` follows its hash. If it is deleted or both edited and renamed, `rutter` marks it `[UNRESOLVED]`. A note edited *in place* at the same path is not flagged at recall time today. You have to compare the stored hash by hand. Kage checks in-place code edits on every recall.
- **Keyword search only.** `librarian-search` uses SQLite FTS5 keyword matching with all terms required (`AND`). Semantic vector search is an unimplemented stub (`embeddings.ts`). Funes, Basic Memory, and `claude-mem` all ship working semantic search.
- **Single-user personal tool.** `rutter` is one person's reference implementation, MIT-licensed, with no support commitment and no multi-user sync.

## When to use something else

- **You only use Claude Code and want zero setup:** use Claude Code's built-in Auto Memory and `CLAUDE.md`.
- **You want code-linked memories that block stale advice when code changes:** use [Kage](https://github.com/kage-core/Kage).
- **You want full-transcript semantic search across all your coding sessions with no LLM calls at ingest:** use [Funes](https://github.com/huggingface/funes).
- **You want an offline session log inside one git repo with no MCP server:** use [Recall](https://github.com/raiyanyahya/recall).
- **You want the AI to write and reorganize notes inside your Obsidian vault:** use [Basic Memory](https://github.com/basicmachines-co/basic-memory) or [claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler).
- **You want decisions attached directly to git commits:** use [Lore](https://github.com/lore-protocol) or [Entire CLI](https://entire.io).
- **You keep a Markdown notes folder and use multiple AI clients:** [get started with rutter](./getting-started.md) for a dated log of decisions and cited notes.

## See also

- [Why is it built this way?](./overview.md): the argument for the design, a worked example, and what each choice costs.
- [How it works](./memory-of-use.md): capture, recall, enrichment, and note identity in full mechanical detail.
- [Getting started](./getting-started.md): setup paths for Claude Code, Grok, Codex, Copilot CLI, Antigravity, and Muse Code.
- [Known issues](./known-issues.md): what is confirmed broken or untested.
