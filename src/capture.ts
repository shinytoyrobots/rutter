import { toInertLine } from "./sanitize.js";
import { buildRef, type VersionedRef } from "./refs.js";
import { appendSession, isDuplicateEntry, type SessionEntry } from "./session-record.js";
import { deriveWorkspace } from "./workspace.js";

/**
 * Ambient capture (SCN-001): turn a client-produced session summary into exactly
 * one durable, versioned session entry. This is the sole code path the Stop hook
 * and the capture CLI drive; it performs NO inference (INV-6) -- the curated line
 * is the client's, stored verbatim after inert-text normalisation.
 */

export interface CapturePayload {
  /** The client's one-line curated summary of what the session decided/produced. */
  summary: string;
  /** Vault-relative paths of store notes the session touched (optional). */
  refs?: string[];
  /** Claude Code session id, when the hook can supply it. */
  sessionId?: string;
  /**
   * The session's working directory, as the Stop payload reports it (SCN-005).
   * Everything else about workspace provenance is derived from this one value by
   * workspace.ts; absent, it is simply omitted (SR-016).
   */
  cwd?: string;
  /** Injectable clock for deterministic tests; defaults to now. */
  now?: Date;
}

export interface CaptureResult {
  captured: boolean;
  /**
   * True when the capture was a SR-013 idempotent no-op: this session already
   * had an entry with identical normalized content, so nothing was appended and
   * the record is byte-identical. Distinct from an empty-summary no-op (SR-004),
   * where `deduped` is false.
   */
  deduped?: boolean;
  /** `YYYY-MM-DD` the entry landed in (only when captured). */
  day?: string;
  entry?: SessionEntry;
  /** Ref paths that were rejected as unresolvable/out-of-bounds and NOT stored. */
  rejectedRefs: string[];
}

/**
 * Capture one session. A summary that is empty after inert-text normalisation is
 * a no-op: no entry is appended and no empty record file is created (SR-004,
 * COR-A-003). Refs that don't resolve to a real in-vault note are dropped rather
 * than stored as valid identities (COR-A-002); their paths are reported back.
 */
export function captureSession(payload: CapturePayload): CaptureResult {
  const summary = toInertLine(payload.summary);
  if (summary === "") {
    return { captured: false, rejectedRefs: [] };
  }

  const { refs, rejectedRefs } = resolveRefs(payload.refs ?? []);
  const now = payload.now ?? new Date();
  // SCN-005: provenance is derived here, from the reported cwd alone, with no user
  // action. It is a best-effort enrichment -- deriveWorkspace never throws and
  // returns undefined for what it cannot resolve, so a capture is never blocked or
  // failed by provenance (SR-016). The field is spread last so it is simply absent
  // (not null) when there is nothing to record.
  const workspace = deriveWorkspace(payload.cwd);
  const entry: SessionEntry = {
    id: compactId(now),
    ...(payload.sessionId ? { session_id: payload.sessionId } : {}),
    time: now.toISOString(),
    summary,
    refs,
    ...(workspace ? { workspace } : {}),
  };

  // SR-013 idempotence. Claude Code fires the Stop event at the END OF EVERY
  // assistant turn (and around clear/compact), not only at session end, so the
  // SAME directive is re-presented to this code path many times per session.
  // If this session already recorded an entry with identical normalized content
  // -- anywhere in _librarian/sessions/, including a prior UTC day for a session
  // that straddled midnight -- appending again would duplicate. We compare on
  // the server-normalized entry (inert summary + resolved ref paths), never on
  // raw input, and no-op so the record stays byte-identical (COR-R-017/A-009).
  // A payload with NO session id has no dedupe key and keeps append behavior
  // (direct-CLI test payloads); isDuplicateEntry returns false for it. Two things
  // are invisible to this check by construction, both because identity is the
  // *directive* and not the world around it: workspace provenance (SR-018), so a
  // cwd that moved between firings still no-ops (COR-R-022); and a ref's content
  // hash (SR-024, v3.3.0), so a referenced note edited again between firings still
  // no-ops (COR-R-028) instead of appending a summary-identical twin.
  //
  // Atomicity: this compare and the appendSession write below share one
  // synchronous call stack (no await between them), so within a process no Stop
  // firing can interleave. Across processes -- Claude Code can fire Stop for a
  // subagent and the main turn near-simultaneously -- the write in fs-safe.ts is
  // a full-file recompute published by atomic temp+rename, so two concurrent
  // identical firings converge on the same superset (last rename wins) rather
  // than each appending; no duplicate results. RESIDUAL RACE (documented, not
  // guarded): two truly concurrent FIRST firings of a brand-new directive could
  // both pass this check and write entries whose only difference is the capture
  // timestamp -- one entry, but not byte-identical to a single firing. A lock
  // file was rejected here: a stale lock would durably wedge capture, violating
  // the "a hook failure must never break the session" contract. The evaluated
  // per-turn reality is sequential re-firing, which this handles exactly.
  if (isDuplicateEntry(entry)) {
    return { captured: false, deduped: true, rejectedRefs };
  }

  appendSession(isoDay(now), entry);
  return { captured: true, day: isoDay(now), entry, rejectedRefs };
}

/** Split client-named paths into resolved versioned refs and rejected paths. */
function resolveRefs(paths: string[]): { refs: VersionedRef[]; rejectedRefs: string[] } {
  const refs: VersionedRef[] = [];
  const rejectedRefs: string[] = [];
  for (const p of paths) {
    const ref = buildRef(p);
    if (ref) refs.push(ref);
    else rejectedRefs.push(p);
  }
  return { refs, rejectedRefs };
}

/** UTC calendar day of an instant; matches the vault's UTC date convention. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Compact, sortable, unique-per-capture id, e.g. `20260724T140322123Z`. */
function compactId(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, "");
}
