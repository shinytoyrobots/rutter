# A personal memory layer for AI agents

*One memory. Multiple agents. Yours.*

rutter keeps a record of what you decided, which notes the session cited, and how your thinking
changed (a stance you formed or changed is called a *position*). Once it is registered in each
client and pointed at the same notes folder, each can recall the same records. They are stored as
plain Markdown in a folder you own.

Any MCP (Model Context Protocol) client can recall. Six AI agent harnesses have a working capture
hook (a script the client runs after each turn): Claude Code, Codex, Grok, GitHub Copilot CLI,
Antigravity CLI (`agy`), and Muse Code. These tools are built for coding, and people also use them
for research, drafting, and planning. rutter records any of it. Capture needs the hook to run and the
model to leave a line.

**[Get started](./getting-started.md#fast-path-for-claude-code)** takes a few minutes with Claude
Code. **[View source](https://github.com/shinytoyrobots/rutter)** on GitHub, or read
[why it is built this way](./overview.md).

## One memory. Multiple agents.

### Why not built-in memory?

**The model isn't the memory. Your notes are.** The records are plain Markdown files in your own
notes folder (in a `_librarian/` folder beside the notes), not inside a model or a vendor's account.

Memory built into one tool stays with that tool. Switch tools and you start again. rutter differs in
three ways:

- **It travels.** A decision captured in one agent is recalled in another. The agent changes; the
  memory does not.
- **It keeps order.** Records are dated and only appended, so a later decision sits beside the
  earlier one instead of replacing it.
- **It shows its sources.** Each record lists the notes the session cited, with a content hash (a
  fingerprint of a note's contents) taken at capture. Listed is not read: a reference does not show
  that the model opened the note.

"Shared" means one person's agents sharing one memory. It does not mean shared between people.

## Six clients, one memory

Start with the one you use most and add the others later. Point them all at the same notes folder
and each recalls what the rest recorded. Each row links to a setup path that ends in a check you can
run.

| You use | Follow | What it takes |
|---------|--------|---------------|
| Claude Code | [Fast path for Claude Code](./getting-started.md#fast-path-for-claude-code) | A few minutes; nothing to clone |
| Grok | [Grok path](./getting-started.md#grok-path) | One npm install, a hook, and one `grok mcp add` |
| Codex | [Codex path](./getting-started.md#codex-path) | One npm install, and a hook you trust |
| GitHub Copilot CLI | [Copilot CLI path](./getting-started.md#copilot-cli-path) | One npm install, a hook, and an instructions file |
| Antigravity CLI (`agy`) | [Antigravity path](./getting-started.md#antigravity-path) | One npm install, a hook, and a rule file |
| Muse Code (`muse`) | [Muse Code path](./getting-started.md#muse-code-path) | One npm install and one installer run |
| Any other MCP (Model Context Protocol) client | [Recall only, with npx](./getting-started.md#recall-only-with-npx) | One config entry. Search and recall only: with no hook, nothing is captured |
| Claude Code, from a clone | [From source](./from-source.md) | Eight steps (M1 to M8), starting with a record written by hand. For contributors |

Grok was verified on Linux only ([known issues](./known-issues.md#the-grok-install-was-tested-on-linux-only)). The npm-only paths (Codex, Copilot CLI, Antigravity, Muse Code) were tested on a machine that also had Claude Code, so a clean machine is untested; see [known issues](./known-issues.md#codex-copilot-cli-antigravity-and-muse-code-without-claude-code).

Using something else? Any MCP client can [search and recall with one config
entry](./getting-started.md#recall-only-with-npx). It cannot capture, because capture needs a hook.

## A record, not a summary

A summary on its own is an assertion. rutter stores the summary together with the notes it cited,
and a content hash (a fingerprint of the note's contents) taken when the line was captured. That pair is a record you can
compare against later. The [worked example](./overview.md#an-example) shows one end to end.

## Inspectable by design

Records are append-only, dated Markdown files in your own notes folder. You can read them in a
terminal and commit them to git. rutter infers no profile of you. A reference it cannot place is
shown to you as unresolved, not dropped.

## Proof: a decision, recalled in another agent

Recorded on 9 October 2026 with Claude Code 2.1.296 and Codex 0.162.0, against rutter 0.5.0. The two
notes are fictional. The run is real.

1. **Captured in Claude Code.** A newsletter writer decides to move from weekly to fortnightly
   issues, citing `Notes/reader-survey.md` and `Notes/publishing-cadence.md`. The reply ends with one
   line. The hook (a script the client runs after each turn) stores it, with a content hash of each
   cited note.
2. **One note is renamed.** The survey note moves to `Research/reader-survey-autumn.md`, contents
   unchanged. After a reindex (a rescan of the notes folder), rutter finds the one note with the
   stored content hash. The reference resolves, meaning it points at a note, at the new path.
3. **A different note is edited and renamed.** The cadence note gains a line and becomes
   `Notes/cadence-decision.md`. After a second reindex, neither the old path nor the old content hash
   matches anything. The reference is unresolved, meaning rutter cannot place it, and rutter shows it
   that way instead of guessing.
4. **Recalled in Codex.** Asked what was decided about the newsletter, when, and which notes it
   cited, Codex gave the decision and its date, listed the survey note at its new path, and flagged
   the cadence note as unresolved.

One boundary the run does not show. An edit to a note at the same path is not detected, and a
reference that resolves does not check that the contents are unchanged.

[See the full demonstration](./overview.md#an-example): the commands, the output and the Codex
answer, unedited.

## Honest fit and limits

- A line exists only if your client wrote one and its hook found it.
- A reference shows which notes the session listed, not that the model read them.
- A note that changes in place, at the same path, is not flagged today.
- rutter is one person's tool, MIT-licensed and published as a reference implementation, with no
  support commitment.

The full list is in [what rutter can and cannot establish](./overview.md#what-rutter-can-and-cannot-establish),
and [known issues](./known-issues.md) lists what has been seen to break.
It suits someone who keeps Markdown notes and is comfortable configuring an AI client.

## Where next

- [Get started](./getting-started.md): a setup path for each client, from install to first recall.
- [Docs](./docs.md): the full list of pages.
  - [Why is it built this way?](./overview.md): the argument for the design, and what each choice costs.
  - [How it works](./memory-of-use.md): memory-of-use is the record of how you used your notes. This page
    covers capture, recall, and note identity in full detail.
  - [FAQ](./faq.md): how several clients share one memory, and adding a client.
  - [Known issues](./known-issues.md): what is confirmed broken or untested.
- [Source on GitHub](https://github.com/shinytoyrobots/rutter).
