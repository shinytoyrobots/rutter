import fs from "node:fs";
import { config } from "./config.js";
import { captureSession, overSummaryWordCeiling, summaryWordCount } from "./capture.js";
import { parseSessionDirective, type SessionDirective } from "./directive.js";
import { capturePosition, overStanceWordCeiling, stanceWordCount } from "./position.js";
import { parsePositionDirective, findEmptyStancePositionDirective } from "./position-directive.js";

/**
 * Entry point the Claude Code Stop hook runs at session end. It reads a JSON
 * payload on stdin and appends AT MOST ONE session entry and AT MOST ONE
 * position event. It performs no inference and no network I/O (INV-6, INV-1)
 * -- it only lifts already-client-written directives out of the transcript
 * and stores them.
 *
 * Three accepted stdin shapes:
 *   1. A direct capture payload: {"summary": "...", "refs": [...], "sessionId": "...", "cwd": "...", "position": "..."}
 *   2. A Claude Code Stop payload: {"transcript_path": "...", "session_id": "...", "cwd": "..."}
 *      -- from which the last `librarian-session` directive AND the last
 *      `librarian-position` directive are each independently extracted.
 *   3. A Grok Stop payload: same as (2) but its `transcript_path` points at an
 *      ACP `updates.jsonl` stream that carries no directive in `message.content`,
 *      so the directive is lifted from the Stop event's `lastAssistantMessage`
 *      field instead. See docs/grok-stop-adapter.md. The substitution to
 *      `lastAssistantMessage` is reached ONLY when the transcript extract yields
 *      no directive of that kind, so a real Claude transcript (shape 2) always
 *      wins and never consults `lastAssistantMessage`; this is safe because
 *      `lastAssistantMessage` is a subset of the transcript extract (it cannot
 *      narrow the scan onto a source that hides a directive the extract held).
 * Anything else, or an absent directive of a given kind, is a clean no-op for
 * THAT kind (SR-004 for a session summary, the SR-057 analogue for a position).
 *
 * Claude Code reports the session's working directory as `cwd` on the Stop event.
 * It is passed straight through to both capture paths, which derive workspace
 * provenance from it (SCN-005); a payload without it captures exactly as before
 * for both kinds (SR-016).
 *
 * SR-055: session capture below is UNTOUCHED from its pre-Phase-A form -- same
 * function calls, same order, same output -- and reads from `transcriptText`
 * computed once up front rather than re-reading the transcript file a second
 * time for position extraction. Position capture is a fully separate, additive
 * block: it never runs if session capture would not have, and never changes
 * what session capture does. See decision-ledger.md D2 for why position
 * directives use a distinct HTML-comment tag rather than sharing
 * `librarian-session`'s -- that separation is what makes this independence
 * provable by construction rather than by careful sequencing.
 */

interface StopPayload {
  transcript_path?: string;
  session_id?: string;
  summary?: string;
  refs?: string[];
  sessionId?: string;
  /**
   * Grok Stop field: the finished assistant reply for the turn, verbatim. The
   * fallback directive source when `transcript_path` (an `updates.jsonl` ACP
   * stream on Grok) yields nothing. Grok sends camelCase and no
   * `last_assistant_message` snake alias; `transcript_path` is Grok's own key,
   * so no `transcriptPath` alias is needed. See docs/grok-stop-adapter.md.
   */
  lastAssistantMessage?: string;
  /** Working directory of the session (Claude Code Stop field, also accepted direct). */
  cwd?: string;
  /**
   * Direct-payload escape hatch for a position directive, mirroring `summary`
   * above: `<kind> <topic-key>: <stance>` (no `POSITION` keyword and no
   * HTML-comment wrapper needed -- the field name itself already says which
   * directive this is, exactly as `summary` needs no redundant "SESSION"
   * marker). Used by direct-CLI callers/tests that don't want to fabricate a
   * transcript file; a real Stop event never carries this field.
   */
  position?: string;
}

async function main(): Promise<void> {
  const input = await readStdin();
  const payload = safeParse(input);
  if (!payload) return;

  // Read the transcript AT MOST ONCE, lazily -- only if some caller actually
  // needs it (a direct payload with `summary`/`position` never touches disk,
  // exactly as before Phase A) -- and share the SAME text between both
  // independent directive extractions (see module doc).
  let transcriptText: string | null = null;
  const getTranscriptText = (): string => {
    if (transcriptText === null) {
      transcriptText = payload.transcript_path ? readTranscriptText(payload.transcript_path) : "";
    }
    return transcriptText;
  };

  runSessionCapture(payload, getTranscriptText);
  runPositionCapture(payload, getTranscriptText);
}

// ---------------------------------------------------------------------------
// Session capture (SCN-001/SCN-002/etc.) -- unchanged behavior (SR-055).
// ---------------------------------------------------------------------------

function runSessionCapture(payload: StopPayload, getTranscriptText: () => string): void {
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
  if (result.captured) {
    // Diagnostics on stderr only, never stdout (INV-5). The project is named when
    // provenance resolved, so a mis-wired hook is visible without opening the record.
    const project = result.entry?.workspace ? ` [${result.entry.workspace.project}]` : "";
    console.error(`[librarian-capture] captured 1 entry${project} into ${result.day} session record.`);
    if (result.rejectedRefs.length) {
      console.error(`[librarian-capture] rejected unresolvable refs: ${result.rejectedRefs.join(", ")}`);
    }
    // SR-034: length drift is reported, never corrected. The entry is already stored
    // byte-verbatim at this point (SR-023) -- this line exists so an over-long summary
    // is visible at the moment it is written, rather than only as a large day-file
    // weeks later. Stderr, like every other diagnostic here (INV-5).
    if (overSummaryWordCeiling(directive.summary)) {
      console.error(
        `[librarian-capture] summary is ${summaryWordCount(directive.summary)} words; ` +
          `the style contract asks for about ${config.summaryWordTarget} and no more than ` +
          `${config.summaryWordCeiling}. Stored verbatim as written -- if a session did ` +
          `several separable things, emit a line per thing as you finish it.`
      );
    }
  } else if (result.deduped) {
    // SR-013: the Stop event fires every turn; an unchanged directive already
    // recorded for this session is a no-op, so re-firing never duplicates.
    console.error("[librarian-capture] directive unchanged for this session; already recorded, nothing appended.");
  } else {
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
function resolveDirective(payload: StopPayload, getTranscriptText: () => string): SessionDirective | null {
  if (typeof payload.summary === "string") {
    return { summary: payload.summary, refs: payload.refs };
  }
  if (payload.transcript_path) {
    const fromTranscript = parseSessionDirective(getTranscriptText());
    if (fromTranscript) return fromTranscript; // Claude path unchanged
  }
  if (typeof payload.lastAssistantMessage === "string") {
    return parseSessionDirective(payload.lastAssistantMessage); // Grok Stop fallback (may be null)
  }
  return null;
}

// ---------------------------------------------------------------------------
// Position capture (SCN-010, decision-graph Phase A) -- wholly additive.
// ---------------------------------------------------------------------------

function runPositionCapture(payload: StopPayload, getTranscriptText: () => string): void {
  const text = positionDirectiveSourceText(payload, getTranscriptText);
  if (text === null) return; // neither a direct `position` field nor a transcript to scan -- nothing possible

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
      console.error(
        `[librarian-capture] position directive (${empty.kind} ${empty.topicKey}) has an empty or ` +
          `whitespace-only stance; treated as no directive (SR-057) -- nothing captured.`
      );
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

  if (result.captured) {
    const project = result.event?.workspace ? ` [${result.event.workspace.project}]` : "";
    console.error(
      `[librarian-capture] captured 1 position event (${directive.kind} ${directive.topicKey})${project} into ${result.month} positions stream.`
    );
    if (result.rejectedRefs.length) {
      console.error(`[librarian-capture] rejected unresolvable position refs: ${result.rejectedRefs.join(", ")}`);
    }
    // SR-053: report-don't-enforce for a topic key that departs from kebab-case.
    if (directive.topicKeyNonKebab) {
      console.error(
        `[librarian-capture] topic key "${directive.topicKey}" is not kebab-case; stored verbatim, never rejected or rewritten.`
      );
    }
    // SR-054: report-don't-enforce for an over-budget stance (same numbers as SR-021).
    if (overStanceWordCeiling(directive.rawStance)) {
      console.error(
        `[librarian-capture] stance is ${stanceWordCount(directive.rawStance)} words; ` +
          `the style contract asks for about ${config.summaryWordTarget} and no more than ` +
          `${config.summaryWordCeiling}. Stored verbatim as written.`
      );
    }
  } else if (result.deduped) {
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
function positionDirectiveSourceText(payload: StopPayload, getTranscriptText: () => string): string | null {
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
    if (isPositionShaped(fromTranscript)) return fromTranscript;
  }
  // (2) Grok Stop fallback: the transcript extract held no position comment
  //     (on Grok it is `updates.jsonl`, which never does); scan the assistant
  //     text instead. Subset invariant applies, as for the session path.
  if (typeof payload.lastAssistantMessage === "string") {
    return payload.lastAssistantMessage;
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
function isPositionShaped(text: string): boolean {
  return parsePositionDirective(text) !== null || findEmptyStancePositionDirective(text) !== null;
}

// ---------------------------------------------------------------------------
// Shared stdin/transcript plumbing (unchanged from pre-Phase-A).
// ---------------------------------------------------------------------------

/** Concatenate all assistant text from a Claude Code transcript JSONL file. */
function readTranscriptText(transcriptPath: string): string {
  let raw: string;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return "";
  }
  const parts: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      parts.push(extractText(JSON.parse(line)));
    } catch {
      /* skip unparseable transcript line */
    }
  }
  return parts.join("\n");
}

/** Pull text out of a transcript record whose content may be a string or blocks. */
function extractText(record: unknown): string {
  const content = (record as { message?: { content?: unknown } })?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => (typeof (block as { text?: unknown }).text === "string" ? (block as { text: string }).text : ""))
    .join("\n");
}

function safeParse(input: string): StopPayload | null {
  try {
    return JSON.parse(input) as StopPayload;
  } catch {
    return null;
  }
}

function readStdin(): Promise<string> {
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
