import fs from "node:fs";
import { config } from "./config.js";
import { captureSession, overSummaryWordCeiling, summaryWordCount } from "./capture.js";
import { parseSessionDirective } from "./directive.js";
import { capturePosition, overStanceWordCeiling, stanceWordCount } from "./position.js";
import { parsePositionDirective, findEmptyStancePositionDirective } from "./position-directive.js";
async function main() {
    const input = await readStdin();
    const parsed = safeParse(input);
    if (!parsed)
        return;
    const payload = isAntigravityPayload(parsed) ? normalizeAntigravity(parsed) : parsed;
    if (!payload)
        return;
    // Read the transcript AT MOST ONCE, lazily -- only if some caller actually
    // needs it (a direct payload with `summary`/`position` never touches disk,
    // exactly as before Phase A) -- and share the SAME text between both
    // independent directive extractions (see module doc).
    let transcriptText = null;
    const getTranscriptText = () => {
        if (transcriptText === null) {
            transcriptText = payload.transcript_path ? readTranscriptText(payload.transcript_path) : "";
        }
        return transcriptText;
    };
    // The two captures are independent: a failure or an unexpected throw in one must
    // never skip the other (a corrupt session day file must not cost a position).
    guarded("session", () => runSessionCapture(payload, getTranscriptText));
    guarded("position", () => runPositionCapture(payload, getTranscriptText));
}
function guarded(kind, run) {
    try {
        run();
    }
    catch (err) {
        console.error(`[librarian-capture] ${kind} capture failed unexpectedly; the other capture still runs:`, err);
    }
}
/** One stderr line for a write that did not happen (INV-5): distinct from "nothing to capture". */
function reportFailure(kind, failed) {
    const why = failed.reason === "unparseable-record"
        ? `the existing file cannot be parsed, so it was left untouched; repair or move it`
        : `the write failed`;
    console.error(`[librarian-capture] FAILED to write ${kind}: ${why} (${failed.path}). Nothing was recorded.`);
}
/**
 * Names the build (so an out-of-date manual clone is visible, not assumed) and the vault a capture was written to, and says when that is the DEFAULT because
 * LIBRARIAN_VAULT_PATH was unset. A hook inherits its vault from the host's launch environment while
 * the MCP server may carry its own, so the two can disagree; saying where the write went (stderr
 * only, INV-5) makes that visible instead of silent.
 */
function vaultNote() {
    const raw = process.env.LIBRARIAN_VAULT_PATH?.trim();
    const unset = !raw || /\$\{[^}]*\}/.test(raw); // unset, empty, or an unfilled plugin placeholder: config fell back
    return ` in vault ${config.vaultPath} (rutter ${config.version})${unset ? " (default: LIBRARIAN_VAULT_PATH was not set for this hook)" : ""}`;
}
// ---------------------------------------------------------------------------
// Session capture (SCN-001/SCN-002/etc.) -- unchanged behavior (SR-055).
// ---------------------------------------------------------------------------
function runSessionCapture(payload, getTranscriptText) {
    const directive = resolveDirective(payload, getTranscriptText);
    if (!directive) {
        console.error("[librarian-capture] no session directive found; nothing captured.");
        return;
    }
    const result = captureSession({
        summary: directive.summary,
        refs: directive.refs,
        sessionId: payload.session_id ?? payload.sessionId,
        cwd: payload.cwd,
    });
    if (result.failed) {
        reportFailure("session entry", result.failed);
    }
    else if (result.captured) {
        // Diagnostics on stderr only, never stdout (INV-5). The project is named when
        // provenance resolved, so a mis-wired hook is visible without opening the record.
        const project = result.entry?.workspace ? ` [${result.entry.workspace.project}]` : "";
        console.error(`[librarian-capture] captured 1 entry${project} into ${result.day} session record${vaultNote()}.`);
        if (result.rejectedRefs.length) {
            console.error(`[librarian-capture] rejected unresolvable refs: ${result.rejectedRefs.join(", ")}`);
        }
        // SR-034: length drift is reported, never corrected. The entry is already stored
        // byte-verbatim at this point (SR-023) -- this line exists so an over-long summary
        // is visible at the moment it is written, rather than only as a large day-file
        // weeks later. Stderr, like every other diagnostic here (INV-5).
        if (overSummaryWordCeiling(directive.summary)) {
            console.error(`[librarian-capture] summary is ${summaryWordCount(directive.summary)} words; ` +
                `the style contract asks for about ${config.summaryWordTarget} and no more than ` +
                `${config.summaryWordCeiling}. Stored verbatim as written -- if a session did ` +
                `several separable things, emit a line per thing as you finish it.`);
        }
    }
    else if (result.deduped) {
        // SR-013: the Stop event fires every turn; an unchanged directive already
        // recorded for this session is a no-op, so re-firing never duplicates.
        console.error("[librarian-capture] directive unchanged for this session; already recorded, nothing appended.");
    }
    else {
        console.error("[librarian-capture] empty summary; no entry written.");
    }
}
/**
 * Direct payload wins; then the Claude production path (a real `transcript_path`
 * directive); then, only if that yielded nothing, the Grok Stop event's
 * `lastAssistantMessage`. The order is load-bearing: a real Claude transcript
 * always wins and never reaches the `lastAssistantMessage` branch, and because
 * `lastAssistantMessage` is a subset of the transcript extract, the fall-through
 * can only ever substitute a source that also has no directive -- it can never
 * narrow the scan and drop a directive the transcript held. See
 * docs/grok-stop-adapter.md.
 */
function resolveDirective(payload, getTranscriptText) {
    if (typeof payload.summary === "string") {
        return { summary: payload.summary, refs: payload.refs };
    }
    if (payload.transcript_path) {
        const fromTranscript = parseSessionDirective(getTranscriptText());
        if (fromTranscript)
            return fromTranscript; // Claude path unchanged
    }
    const message = assistantMessage(payload);
    if (message !== null) {
        return parseSessionDirective(message); // Grok/Codex Stop fallback (may be null)
    }
    return null;
}
/**
 * The Stop event's finished assistant reply, for hosts whose transcript carries
 * no directive. Grok's camelCase field wins when it is a string; otherwise
 * Codex's snake_case field. Exactly one source is returned -- never a
 * concatenation (see `positionDirectiveSourceText`). Non-string values
 * (null, numbers, objects) are treated as absent.
 */
function assistantMessage(payload) {
    if (typeof payload.lastAssistantMessage === "string")
        return payload.lastAssistantMessage;
    if (typeof payload.last_assistant_message === "string")
        return payload.last_assistant_message;
    return null;
}
// ---------------------------------------------------------------------------
// Position capture (SCN-010, decision-graph Phase A) -- wholly additive.
// ---------------------------------------------------------------------------
function runPositionCapture(payload, getTranscriptText) {
    const text = positionDirectiveSourceText(payload, getTranscriptText);
    if (text === null)
        return; // neither a direct `position` field nor a transcript to scan -- nothing possible
    const directive = parsePositionDirective(text);
    if (!directive) {
        // gen-4/var-1-graft Fix 1 (SR-057, ported from gen-3/var-1-convention): the
        // ONE "no directive" reason that gets a diagnostic is a well-formed
        // kind+topic-key whose stance is empty/whitespace-only. Every other reason
        // (no comment at all -- the common no-op turn -- bad kind, missing
        // topic-key/colon) stays silent, per decision-ledger.md D3's already-
        // settled reading; this fix does not reopen it.
        const empty = findEmptyStancePositionDirective(text);
        if (empty) {
            console.error(`[librarian-capture] position directive (${empty.kind} ${empty.topicKey}) has an empty or ` +
                `whitespace-only stance; treated as no directive (SR-057) -- nothing captured.`);
        }
        return;
    }
    const result = capturePosition({
        kind: directive.kind,
        topicKey: directive.topicKey,
        rawStance: directive.rawStance,
        sessionId: payload.session_id ?? payload.sessionId,
        cwd: payload.cwd,
    });
    if (result.failed) {
        reportFailure("position event", result.failed);
    }
    else if (result.captured) {
        const project = result.event?.workspace ? ` [${result.event.workspace.project}]` : "";
        console.error(`[librarian-capture] captured 1 position event (${directive.kind} ${directive.topicKey})${project} into ${result.month} positions stream${vaultNote()}.`);
        if (result.rejectedRefs.length) {
            console.error(`[librarian-capture] rejected unresolvable position refs: ${result.rejectedRefs.join(", ")}`);
        }
        // SR-053: report-don't-enforce for a topic key that departs from kebab-case.
        if (directive.topicKeyNonKebab) {
            console.error(`[librarian-capture] topic key "${directive.topicKey}" is not kebab-case; stored verbatim, never rejected or rewritten.`);
        }
        // SR-054: report-don't-enforce for an over-budget stance (same numbers as SR-021).
        if (overStanceWordCeiling(directive.rawStance)) {
            console.error(`[librarian-capture] stance is ${stanceWordCount(directive.rawStance)} words; ` +
                `the style contract asks for about ${config.summaryWordTarget} and no more than ` +
                `${config.summaryWordCeiling}. Stored verbatim as written.`);
        }
    }
    else if (result.deduped) {
        console.error("[librarian-capture] position directive unchanged for this session; already recorded, nothing appended.");
    }
}
/**
 * Direct payload wins (mirrors `resolveDirective`'s escape hatch); then the
 * transcript extract IF it is position-shaped; then the Grok Stop event's
 * `lastAssistantMessage`; then the transcript extract again as the "there was a
 * source" fallback; else `null` (no possible source at all). This is the
 * position-side analogue of `resolveDirective`'s substitution, but a different
 * code shape because this function returns raw text for the caller to parse,
 * not a parsed directive -- so it must itself detect "the transcript is not
 * position-shaped" (via `isPositionShaped`) before substituting, rather than
 * fall through on a null parse. It deliberately does NOT concatenate the
 * transcript with `lastAssistantMessage`: `parsePositionDirective` keeps the
 * LAST match, so concatenation could let a trailing template eat a real
 * directive (the session-side `PLACEHOLDER_SUMMARY` hazard has a position
 * analogue; see docs/grok-stop-adapter.md "Placeholder last-wins").
 *
 * Whichever single source is returned, both `parsePositionDirective` and
 * `findEmptyStancePositionDirective` run against that SAME text in the caller,
 * so a malformed match (bad kind, missing topic-key, empty stance) is diagnosed
 * once, from one source, never misrouted into session-summary handling (the
 * 2026-08-12 panel's "malformed-kind handling" gap; see decision-ledger.md D3).
 */
function positionDirectiveSourceText(payload, getTranscriptText) {
    if (typeof payload.position === "string") {
        return `<!-- librarian-position POSITION ${payload.position} -->`;
    }
    // (1) Claude production path: a real transcript that actually carries a
    //     position-shaped comment wins, exactly as `resolveDirective` prefers a
    //     transcript session directive. "Position-shaped" is the union the caller
    //     already acts on -- a parseable directive OR the one empty-stance case
    //     that earns an SR-057 diagnostic -- so precedence and diagnostics both
    //     stay on the transcript when it holds the comment.
    if (payload.transcript_path) {
        const fromTranscript = getTranscriptText();
        if (isPositionShaped(fromTranscript))
            return fromTranscript;
    }
    // (2) Grok Stop fallback: the transcript extract held no position comment
    //     (on Grok it is `updates.jsonl`, which never does); scan the assistant
    //     text instead. Subset invariant applies, as for the session path.
    const message = assistantMessage(payload);
    if (message !== null) {
        return message;
    }
    // (3) A transcript path but no `lastAssistantMessage`: preserve today's
    //     "there was a source" behavior -- return the extract so the caller runs
    //     its parse/diagnose over it and stays silent, rather than reporting no
    //     possible source at all.
    if (payload.transcript_path) {
        return getTranscriptText();
    }
    return null; // (4) no direct field, no transcript, no assistant text
}
/**
 * True when `text` carries a `librarian-position` comment the caller would act
 * on -- either a fully parseable directive OR the single empty-stance shape
 * that gets an SR-057 diagnostic. Mirrors exactly the two functions
 * `runPositionCapture` runs, so "the transcript is position-shaped" here means
 * precisely "the transcript would produce a capture or a diagnostic there,"
 * never a heuristic. `getTranscriptText` is memoized, so re-parsing the same
 * text in the caller is a cheap repeat, not a second file read.
 */
function isPositionShaped(text) {
    return parsePositionDirective(text) !== null || findEmptyStancePositionDirective(text) !== null;
}
// ---------------------------------------------------------------------------
// Shared stdin/transcript plumbing (unchanged from pre-Phase-A).
// ---------------------------------------------------------------------------
/** Concatenate all assistant text from a Claude Code transcript JSONL file. */
function readTranscriptText(transcriptPath) {
    let raw;
    try {
        raw = fs.readFileSync(transcriptPath, "utf8");
    }
    catch {
        return "";
    }
    const parts = [];
    for (const line of raw.split("\n")) {
        if (line.trim() === "")
            continue;
        try {
            parts.push(extractText(JSON.parse(line)));
        }
        catch {
            /* skip unparseable transcript line */
        }
    }
    return parts.join("\n");
}
/** Pull text out of a transcript record whose content may be a string or blocks. */
function extractText(record) {
    const content = record?.message?.content;
    if (typeof content === "string")
        return content;
    if (!Array.isArray(content))
        return "";
    return content
        .map((block) => (typeof block.text === "string" ? block.text : ""))
        .join("\n");
}
// ---------------------------------------------------------------------------
// Antigravity Stop adapter (antigravity-compatibility.md).
// ---------------------------------------------------------------------------
/**
 * Selected by payload SHAPE, never by a transcript path merely being set (the
 * Grok lesson): camelCase `conversationId` + `transcriptPath`, and none of the
 * snake_case keys another host (or a direct caller) would use.
 */
function isAntigravityPayload(p) {
    return (typeof p.conversationId === "string" &&
        typeof p.transcriptPath === "string" &&
        p.session_id === undefined &&
        p.transcript_path === undefined &&
        p.summary === undefined &&
        p.position === undefined);
}
/**
 * Maps an Antigravity Stop payload onto the shape the shared paths already read:
 * `conversationId` becomes the session id, `workspacePaths[0]` the cwd, and the
 * current turn's assistant text the message fallback. Returns null (nothing
 * captured) on a non-empty `error`, or when the transcript is unreadable or
 * unrecognized -- fail closed, one stderr line. No other guard: our hook never
 * requests continuation, so it cannot cause re-entry.
 */
function normalizeAntigravity(p) {
    if (typeof p.error === "string" && p.error !== "") {
        console.error("[librarian-capture] antigravity turn ended with an error; nothing captured.");
        return null;
    }
    const text = readAntigravityTurnText(p.transcriptPath);
    if (text === null) {
        console.error("[librarian-capture] antigravity transcript unreadable or unrecognized; nothing captured.");
        return null;
    }
    const cwd = Array.isArray(p.workspacePaths) && typeof p.workspacePaths[0] === "string" ? p.workspacePaths[0] : undefined;
    return { session_id: p.conversationId, cwd, last_assistant_message: text };
}
/**
 * Assistant text of the CURRENT turn from an Antigravity `transcript_full.jsonl`:
 * `PLANNER_RESPONSE` records after the last `USER_INPUT`. Filtering on `type`, not
 * `source`: tool results (`GENERIC`) also carry `source: "MODEL"`, and `USER_INPUT`
 * echoes any directive template the user typed. The transcript accumulates across
 * turns, so scoping to the last `USER_INPUT` keeps an older turn's directive from
 * shadowing or duplicating the current one. Returns null when the file is
 * unreadable or holds no record with a string `type` (unrecognized shape).
 */
function readAntigravityTurnText(transcriptPath) {
    let raw;
    try {
        raw = fs.readFileSync(transcriptPath, "utf8");
    }
    catch {
        return null;
    }
    const records = [];
    for (const line of raw.split("\n")) {
        if (line.trim() === "")
            continue;
        try {
            const rec = JSON.parse(line);
            if (rec && typeof rec.type === "string")
                records.push({ type: rec.type, content: rec.content });
        }
        catch {
            /* skip unparseable transcript line */
        }
    }
    if (records.length === 0)
        return null;
    let start = 0;
    records.forEach((r, i) => {
        if (r.type === "USER_INPUT")
            start = i + 1;
    });
    return records
        .slice(start)
        .filter((r) => r.type === "PLANNER_RESPONSE" && typeof r.content === "string")
        .map((r) => r.content)
        .join("\n");
}
function safeParse(input) {
    try {
        return JSON.parse(input);
    }
    catch {
        return null;
    }
}
function readStdin() {
    return new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => (data += chunk));
        process.stdin.on("end", () => resolve(data));
        process.stdin.on("error", () => resolve(data));
    });
}
main().catch((err) => {
    // A hook failure must never break the user's session -- log and exit clean.
    console.error("[librarian-capture] error:", err);
});
//# sourceMappingURL=capture-cli.js.map