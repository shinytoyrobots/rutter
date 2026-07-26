import { toInertLine } from "./sanitize.js";
import { buildRef, type VersionedRef } from "./refs.js";
import { appendSession, type SessionEntry } from "./session-record.js";

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
  /** Injectable clock for deterministic tests; defaults to now. */
  now?: Date;
}

export interface CaptureResult {
  captured: boolean;
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
  const entry: SessionEntry = {
    id: compactId(now),
    ...(payload.sessionId ? { session_id: payload.sessionId } : {}),
    time: now.toISOString(),
    summary,
    refs,
  };

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
