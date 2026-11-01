import { toInertLine } from "../src/sanitize.js";
import { resolveRefs } from "../src/refs.js";
import { appendPositionEvent, isDuplicatePositionEvent, isoMonth, type PositionEvent, type PositionKind } from "../src/positions.js";
import { deriveWorkspace } from "../src/workspace.js";
import { isClient } from "../src/client.js";

/**
 * Test fixture: builds and appends one position event the way the retired capture path
 * did (refs from [[wikilinks]], a revises pointer, inert stance, idempotence check).
 * Production no longer writes positions; the recall, fold and storage tests still need
 * events on disk, so the builder lives here.
 */
const REVISES = /\brevises:\s*([^\s)]+)/i;
const WIKILINK = /\[\[([^\]]+)\]\]/g;
export function deriveRevises(raw: string): string | undefined {
  return REVISES.exec(raw)?.[1];
}
export function deriveRefPaths(raw: string): string[] {
  return [...raw.matchAll(WIKILINK)].map((m) => m[1]!.trim()).filter((p) => p !== "");
}

export interface PositionCapturePayload {
  kind: PositionKind;
  topicKey: string;
  /** Raw stance text -- refs/revises are derived from this BEFORE sanitization. */
  rawStance: string;
  sessionId?: string;
  cwd?: string;
  /** Host client label (see CapturePayload.client). Canonical values only; not part of event identity. */
  client?: string;
  now?: Date;
}

export interface PositionCaptureResult {
  captured: boolean;
  /** True when this was a SR-049 idempotent no-op (see positions.ts). */
  deduped?: boolean;
  /** Set when the write did not happen; see CaptureResult.failed. `captured` is then false. */
  failed?: { reason: "unparseable-record" | "write-error"; path: string };
  /** `YYYY-MM` the event landed in (only when captured). */
  month?: string;
  event?: PositionEvent;
  /** Ref paths named via `[[wikilink]]` in the stance that did not resolve. */
  rejectedRefs: string[];
}

/**
 * Capture one position directive. SR-057 (empty/whitespace stance) is enforced
 * upstream by `parsePositionDirective`, which never yields a payload for that
 * case -- this function's `rawStance` is always non-empty text once reached.
 */
export function seedPosition(payload: PositionCapturePayload): PositionCaptureResult {
  // Refs and `revises` are derived from the RAW stance -- before inert-line
  // normalization -- so a client's exact wikilink/revises spelling is what gets
  // resolved. Nothing is removed from the stance because of this scan (see
  // position-directive.ts's module doc and decision-ledger.md D2): the stored
  // stance is the sanitized form of the FULL raw text, unedited.
  const { refs, rejectedRefs } = resolveRefs(deriveRefPaths(payload.rawStance));
  const revises = deriveRevises(payload.rawStance);
  const stance = toInertLine(payload.rawStance);

  const now = payload.now ?? new Date();
  const workspace = deriveWorkspace(payload.cwd);
  const event: PositionEvent = {
    id: compactId(now),
    ...(payload.sessionId ? { session_id: payload.sessionId } : {}),
    time: now.toISOString(),
    kind: payload.kind,
    topic_key: payload.topicKey,
    stance,
    ...(revises ? { revises } : {}),
    refs,
    ...(workspace ? { workspace } : {}),
    ...(isClient(payload.client) ? { client: payload.client } : {}),
  };

  // SR-049 idempotence, decided before the durable write exactly as capture.ts
  // decides SR-013 before appendSession -- see positions.ts for the full
  // rationale (cross-month scan, `revises` in the identity key per v4.0.0).
  if (isDuplicatePositionEvent(event)) {
    return { captured: false, deduped: true, rejectedRefs };
  }

  const month = isoMonth(now);
  const written = appendPositionEvent(month, event);
  if (!written.written) return { captured: false, failed: { reason: written.reason, path: written.path }, rejectedRefs };
  return { captured: true, month, event, rejectedRefs };
}

/** Compact, sortable, unique-per-capture id (mirrors capture.ts's `compactId`). */
function compactId(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, "");
}
