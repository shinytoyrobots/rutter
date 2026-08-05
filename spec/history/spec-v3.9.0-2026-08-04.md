---
version: "3.9.0"
parent: "3.8.1"
changed-at: "2026-08-04"
change-type: minor
effort: decision-graph
hitl: "resolved 2026-08-04 — gen-1 interpretation panel divergences put to the operator as three single-decision prompts; all three recommendations accepted"
change-summary: "Panel-located ambiguities encoded: +SR-044 (confirmation surface = local CLI, never MCP), +SR-045 (strict (path,hash) keying; direct rebinding, no chains)"
diff-summary: |
  + SR-044: human confirmation of an unresolved-ref binding is supplied through a
    local CLI command (npm script peer of recent/gate CLIs) that validates the
    candidate and appends detected: confirmed; the confirmation surface shall not
    be exposed as an MCP tool. Rationale: a model-driveable confirmation surface
    would launder auto-binds past constitution prohibition 8. (optional-feature,
    ← SCN-009)
  + SR-045: matching and resolution key strictly on the recorded (path, content-hash)
    pair; each pass evaluates the originally recorded pair directly against the
    current vault — a multiply-renamed note gains a fresh direct binding (newest
    wins), ledger entries never compose into chains. Rationale: path-level keying
    lets an old-version ref resolve silently through a newer version's move; chain
    composition adds graph-closure logic and its bug class. (event-driven,
    ← SCN-008/SCN-009)
  ~ traceability rows SCN-008/SCN-009: derived-SR columns gain SR-044/SR-045
  (no existing SCN/SR/INV text modified)
panel-record: |
  Interpretation panel (3 independent cheap-tier readers, pre-dispatch, per
  flow-dispatch-rules §Interpretation panel):
  CONVERGENT (proceed, no amendment needed): unresolved state lives only in the
  rebuildable SQLite projection (no third `detected` value, no durable unresolved
  artifact); ledger appends are idempotent across reindexes (check-before-append);
  content hashing reuses refs.ts contentHash() raw-bytes sha256; projection tables
  drop-and-rebuild wholesale each reindex; read surfaces consult the projection,
  not the ledger file per call; candidate pool = the indexer's note enumeration.
  DIVERGENT (resolved above): multi-rename model (3-way split: direct rebinding vs
  projection-build chain-walk vs read-time transitive closure) -> direct rebinding;
  binding key granularity (path+hash vs path-level) -> strict path+hash;
  SR-038 confirmation surface scope/mechanism (CLI now vs schema-support-only vs
  MCP tool) -> CLI now, MCP excluded. The suite constraint (COR-R-036/COR-A-017
  need a driveable surface) independently forced "something ships"; the panel and
  HITL fixed what.
companion-artifacts: |
  evals/harness.yaml suite 0.6.1 (patch, mappings-only): SR-044 -> COR-R-036 +
  COR-A-017 (observable ledger effect through the fixed surface); SR-045 ->
  COR-R-029/COR-R-030 + COR-A-013. Recorded suite debt: no dedicated
  strict-keying discriminator task (old-hash ref must stay unresolved through a
  new-hash binding) — flagged for the cull's decision-ledger audit and a future
  flow-eval pass.
---
