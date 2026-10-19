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

**Get started:** the [Claude Code fast path](./getting-started.md#fast-path-for-claude-code) takes a
few minutes. **Read the design:** [why it is built this way](./overview.md).

## One memory. Multiple agents.

Most AI memory belongs to the tool that created it. Switch tools and you start again.

rutter does not belong to a tool. A decision captured in one agent is recalled in another. The agent
changes; the memory does not.

"Shared" means one person's agents sharing one memory. It does not mean shared between people.

## Six clients, one memory

Start with the one you use most and add the others later. Point them all at the same notes folder
and each recalls what the rest recorded. Each row links to a setup path that ends in a check you can
run.

| Client | What the hook reads | Setup | Verified with[^verified] |
|--------|---------------------|-------|--------------------------|
| Claude Code | The whole session transcript | [Install the plugin](./getting-started.md#fast-path-for-claude-code) | 2.1.296 |
| Codex | The final reply | [npm install and a hook you trust](./getting-started.md#codex-path) | 0.160.0 |
| Grok | The final reply | [npm install and one installer run; no Claude Code needed](./getting-started.md#grok-path) | 1.0.62 |
| GitHub Copilot CLI | The current turn, from Copilot's transcript | [npm install, a hook, and an instructions file](./getting-started.md#copilot-cli-path) | 1.0.98 |
| Antigravity CLI (`agy`) | The current turn, from `agy`'s transcript | [npm install, a hook, and a rule file](./getting-started.md#antigravity-path) | 1.3.2 |
| Muse Code | The final reply | [npm install and one installer run](./getting-started.md#muse-code-path) | 1.4.10 |

[^verified]: The client version each setup path was last tested on. Grok was verified on Linux only ([known issues](./known-issues.md#the-grok-install-was-tested-on-linux-only)). The
    npm-only paths (Codex, Copilot CLI, Antigravity, Muse Code) were tested on a machine that also had
    Claude Code, so a clean machine is untested; see [known issues](./known-issues.md#codex-copilot-cli-antigravity-and-muse-code-without-claude-code). The recorded run
    in the Proof section below used a later Codex build, 0.162.0.

Using something else? Any MCP client can [search and recall with one config
entry](./getting-started.md#recall-only-with-npx). It cannot capture, because capture needs a hook.

## A record, not a summary

A summary on its own is an assertion. rutter stores the summary together with the notes it cited,
and a hash of each note's contents taken when the line was captured. That pair is a record you can
compare against later. The [worked example](./overview.md#an-example) shows one end to end.

## Inspectable by design

Records are append-only, dated Markdown files in your own notes folder. You can read them in a
terminal and commit them to git. rutter infers no profile of you. A reference it cannot place is
shown to you as unresolved, not dropped.

## Proof

This is a real run, recorded on 9 October 2026. The two notes are fictional. The output below is the
recorded output, unedited. The [full run](./overview.md#an-example) has the rename steps in between.

**Captured in Claude Code.** The session ended its reply with one line:

```text
<!-- librarian-session {"summary":"Decided to move the newsletter from weekly to fortnightly, one long essay per issue, based on the autumn reader survey (48% want fewer, longer issues; top request was more depth per topic). Main risk: readers forgetting between issues.","refs":["Notes/reader-survey.md","Notes/publishing-cadence.md"]} -->
```

**One note renamed, one edited and renamed.** Asking for recent work shows both references:

```text
$ npm run recent
2026-10-09 22:16:53 [newsletter-notes] — Decided to move the newsletter from weekly to fortnightly, one long essay per issue, based on the autumn reader survey (48% want fewer, longer issues; top request was more depth per topic). Main risk: readers forgetting between issues.
   refs: Notes/reader-survey.md@sha256:fa2bbeb8033a613517730bb689d49da31c9a1abf1601be48cd26dae4402cf75f (renamed to Research/reader-survey-autumn.md)
   refs: Notes/publishing-cadence.md@sha256:e9b42627bcb83a2945080d28cc99ab7ce0248cad5e342fefab45f9f54b2e9dcb [UNRESOLVED -- candidates: none]
```

**Recalled in Codex.** Asked *"What did I decide about my newsletter's publishing cadence, when, and
which notes did that decision cite?"*, Codex answered:

```text
Your recorded decision was to **publish every two weeks, with one long essay per issue, replacing the weekly roundup**—because readers wanted more depth and tended to skim the roundup.

It was recorded on **October 9, 2026**, with no revisions. That decision’s session cited:

- **`Notes/reader-survey.md`**, now renamed `Research/reader-survey-autumn.md`: the October 2 survey favored fewer, longer issues and deeper coverage.
- **`Notes/publishing-cadence.md`**: this reference is currently unresolved, so I couldn’t verify its contents.

A separate October 5 note, `Notes/cadence-decision.md`, says **“going fortnightly from November.”** It isn’t verified as the missing cited note.

Both readable notes are explicitly labeled fictional demo notes, so this describes the demo’s recorded decision.
```

This is the only recorded run on this site: captured with Claude Code 2.1.296 and recalled with
Codex 0.162.0, against rutter 0.5.0.

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
