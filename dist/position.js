import { toInertLine, wordCount, overWordCeiling } from "./sanitize.js";
import { resolveRefs } from "./refs.js";
import { appendPositionEvent, isDuplicatePositionEvent, isoMonth, } from "./positions.js";
import { deriveRefPaths, deriveRevises } from "./position-directive.js";
import { deriveWorkspace } from "./workspace.js";
import { isClient } from "./client.js";
/**
 * Capture one position directive. SR-057 (empty/whitespace stance) is enforced
 * upstream by `parsePositionDirective`, which never yields a payload for that
 * case -- this function's `rawStance` is always non-empty text once reached.
 */
export function capturePosition(payload) {
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
    const event = {
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
    if (!written.written)
        return { captured: false, failed: { reason: written.reason, path: written.path }, rejectedRefs };
    return { captured: true, month, event, rejectedRefs };
}
/** Words in a stance line, counted identically to a session summary (SR-054 reuses SR-021's numbers). */
export function stanceWordCount(stance) {
    return wordCount(stance);
}
/**
 * Whether a stance overruns the shared style-contract ceiling (SR-054).
 * Deliberately NOT wired into `capturePosition`: an over-length stance is
 * stored byte-verbatim like any other (refines SR-023/INV-6 the same way
 * SR-034 already does for a session summary) -- this is a reporting predicate
 * for the capture path's diagnostics only.
 */
export function overStanceWordCeiling(stance) {
    return overWordCeiling(stance);
}
/** Compact, sortable, unique-per-capture id (mirrors capture.ts's `compactId`). */
function compactId(date) {
    return date.toISOString().replace(/[-:.]/g, "");
}
//# sourceMappingURL=position.js.map