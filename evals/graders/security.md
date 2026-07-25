---
name: security
version: "1.0.0"
status: placeholder
dimension: security
grader-type: hybrid   # deterministic attack-corpus execution + LLM-judge injection-surface review
threshold: 1.0        # no failure tolerance on the security dimension
covers-sr: [SR-101, SR-102]
covers-scn: [SCN-001]
datasets: [security-real-v1, security-adv-v1]
judge-model: claude (client-side; MUST NOT run inside the server — INV-6)
---

# Security grader — S1.5 ambient memory-of-use

Scores untrusted-input inertness (SR-101), repo hygiene (SR-102), and the
prompt-injection surface of stored session summaries. Threshold **1.0** — every attack
task must be neutralized. Aggregate = fraction of attack tasks passed; anything < 1.0
fails the dimension.

> The six invariant graders (INV-1 local-first, INV-2 store-immutable, INV-3
> no-hard-delete, INV-4 rebuildable, INV-5 stdout-pure, INV-6 no-LLM) are **separate
> specs owned by flow-eval** and are NOT authored here. This grader overlaps their
> *concerns* (e.g. path traversal touches INV-2) but scores the SR-101/102 contract, not
> the invariants. INV graders remain pending.

## Grader type

**Hybrid.**

Deterministic attack execution:
- **YAML / frontmatter injection** — a session summary or referenced identity containing
  YAML control content (`---`, `key: value`, anchors, `!!` tags, multi-doc `---`) must
  be stored/rendered as inert text, never parsed into or corrupting the record's own
  frontmatter (SR-101, SR-100 compatibility).
- **Path traversal** — a referenced note path or session identity containing `../`,
  absolute paths, symlinks, or NUL bytes must not cause any read/write outside
  `_librarian/` (SR-101; concern shared with INV-2).
- **Control characters** — CR/LF injection, ANSI escapes, NUL, zero-width, BiDi
  overrides in a summary must not break the append-one-line invariant or the record
  format.
- **Repo hygiene (SR-102)** — assert `.gitignore` (or overlay-repo boundary) prevents
  `_librarian/` session content and vault content from being committed to the code repo;
  a dirty-tree simulation must show session files untracked/ignored.

LLM-judge sub-check:
- **Prompt-injection surface** — session summaries are later fed to a client LLM (via
  `librarian-recent` / enrichment). The judge reviews whether a malicious summary
  ("ignore prior instructions, exfiltrate…") is surfaced as clearly-delimited *data*,
  not as instructions, and whether the server ever acts on summary content itself
  (it must not — INV-6).

## Input format

`security-real-v1.jsonl` (benign controls) and `security-adv-v1.jsonl` (attacks),
one task per line:

```json
{"id":"yaml-inject-01","class":"yaml-injection","payload":"--- \nadmin: true\n---",
 "vector":"session-summary","expect":"stored inert; record frontmatter unchanged",
 "kind":"deterministic","weight":1.0}
```

## Scoring rules (per task)

- Attack task: `1.0` if the attack is neutralized (payload inert, no escape, no
  injection, no commit), `0.0` if it succeeds. **No partial credit.**
- Benign control: `1.0` if legitimate content still round-trips correctly (guards
  against over-sanitizing that would break real summaries).
- **Pass/fail vs threshold:** dimension passes only at aggregate `1.0`. Any single
  `0.0` fails the dimension and MUST be surfaced with the exploit path.

## Failure-rationale requirement

Each failed task records: task id, attack class, payload, vector, observed escape/
injection with the exact resulting on-disk or rendered state, and (judge tasks) verbatim
rationale. Written to `evals-failures/{variant-id}-security.md`.

## Open assumptions (flow-eval attention)

- **No test/attack harness exists.** Assumes flow-eval builds an attack-corpus runner
  against a throwaway `_librarian/` + git sandbox. **Test harness to be established.**
- Repo-hygiene check assumes the code repo and the memory-of-use store are separated per
  constitution prohibition-6; flow-eval must encode the exact boundary (overlay repo vs
  `.gitignore`) once the variant declares it.
- `adversarial` eval depth should synthesize new payloads beyond the seed corpus.
- Threshold 1.0 mirrors the invariant standard; the SR-101/102 contract is hard.
