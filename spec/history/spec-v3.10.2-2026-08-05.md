---
version: "3.10.2"
parent: "3.10.1"
changed-at: "2026-08-05"
change-type: patch
effort: decision-graph
hitl: "operator chose fix-now-same-PR at the post-ship defect-routing prompt (2026-08-05); patch itself is clarification-only"
change-summary: "Path resolution pinned: exists-on-disk-within-vault (any file type), not present-in-notes-index"
diff-summary: |
  + glossary: "Path resolution (identity pass)" — a ref's path resolves iff the
    file exists on disk at its vault-relative path inside confinement, regardless
    of file type; existing non-note refs are live; deleted files of any type are
    genuinely dead and follow SR-036/SR-037 unchanged
  ~ frontmatter changelog note
  (no scenario, requirement, or invariant semantics changed)
provenance: |
  FIRST PRODUCTION-DERIVED AMENDMENT. Ring-0 day one (operator ran npm run
  reindex on the live vault, 2,428 notes): 31 dead refs reported, 0 bound, 31
  unresolved — and >=27 of them point at files that exist on disk (.gitignore,
  _librarian/wish-log.md, session records, .html decks, .yaml assessments).
  The shipped implementation resolved paths against the markdown notes index;
  capture records refs to any confined vault file, so every non-note ref was
  mislabeled UNRESOLVED on librarian-recent. Prohibition 8 held (nothing bound,
  nothing appended). Notable process fact: ALL gen-1 and gen-2 variants shared
  the misreading, no decision ledger surfaced it, and the interpretation panel
  never probed it — a blind spot for both the population-as-spec-probe and the
  panel. The eval suite's fixtures used only .md notes, so no task could see it.
conformance-note: |
  Suite 0.7.0 -> 0.8.0 (additive): COR-R-038 (existing non-note refs stay live,
  mapped to SCN-008) + COR-A-021 (holdout: fix must not over-correct — a
  genuinely deleted non-note file stays dead AND rendered, renamed notes still
  auto-bind, nothing is hidden from read surfaces). Fix generation targeted at
  the open PR #17 before merge; no re-evaluation of archived variants.
---
