import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "./config.js";
import { captureSession, overSummaryWordCeiling, summaryWordCount } from "./capture.js";
import { parseSessionDirective, type SessionDirective } from "./directive.js";
import { capturePosition, overStanceWordCeiling, stanceWordCount } from "./position.js";
import { classifyClient, parseExplicitIdentity, type Client, type ExplicitIdentity } from "./client.js";
import { parsePositionDirective, findEmptyStancePositionDirective } from "./position-directive.js";

/**
 * Entry point the Stop hook runs (Claude Code, Grok, Codex, Antigravity, Copilot CLI -- after each turn). It reads a JSON
 * payload on stdin and appends AT MOST ONE session entry and AT MOST ONE
 * position event. It performs no inference and no network I/O (INV-6, INV-1)
 * -- it only lifts already-client-written directives out of the transcript
 * and stores them.
 *
 * Six accepted stdin shapes:
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
 *   4. A Codex Stop payload: `session_id`, `cwd`, and `last_assistant_message`
 *      (snake_case). Handled by the same fallback as (3) with the same
 *      precedence; only directives in the FINAL assistant message are seen.
 *      See codex-compatibility.md.
 *   5. An Antigravity (`agy`) Stop payload: camelCase `conversationId`,
 *      `transcriptPath`, `workspacePaths`, `error`, and NO assistant text. It is
 *      normalized up front (`normalizeAntigravity`): the assistant text of the
 *      CURRENT turn is read from the transcript and handed to the same message
 *      fallback as (3)/(4). See antigravity-compatibility.md.
 *   6. A GitHub Copilot CLI `agentStop` payload: camelCase `sessionId`,
 *      `transcriptPath`, `stopReason`, `timestamp`, and NO assistant text. Read
 *      like (5), from `events.jsonl`, after waiting for Copilot to finish writing
 *      the turn (`normalizeCopilot`). Also chosen by `--client copilot` whatever
 *      the payload casing. See docs/copilot-cli-plan.md.
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
  /**
   * Codex Stop field: the same finished assistant reply, snake_case. Used only
   * when Grok's camelCase field is not a string; the two are never combined.
   */
  last_assistant_message?: string | null;
  /** Working directory of the session (Claude Code Stop field, also accepted direct). */
  cwd?: string;
  /**
   * Antigravity Stop fields (camelCase). `transcriptPath` points at a mutable
   * `transcript_full.jsonl`; `error` is "" on success; `workspacePaths[0]` is the
   * workspace (the hook process's own cwd is the hooks.json directory, not this).
   */
  conversationId?: string;
  transcriptPath?: string;
  workspacePaths?: unknown;
  error?: unknown;
  /**
   * Copilot CLI `agentStop` fields (camelCase; `sessionId`, `transcriptPath` and `cwd`
   * are shared with the shapes above). `timestamp` (Unix ms) is echoed in the
   * transcript's `hook.start` record for this very invocation, which is how the
   * reader knows the turn is on disk. The snake_case variant is documented but unprobed.
   */
  stopReason?: unknown;
  stop_reason?: unknown;
  timestamp?: unknown;
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
  const parsed = safeParse(input);
  if (!parsed) return;
  const { reader, client } = resolveHost(parsed, explicitIdentity());
  const payload =
    reader === "agy" ? normalizeAntigravity(parsed) : reader === "copilot" ? await normalizeCopilot(parsed) : parsed;
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

  // The two captures are independent: a failure or an unexpected throw in one must
  // never skip the other (a corrupt session day file must not cost a position).
  guarded("session", () => runSessionCapture(payload, getTranscriptText, client));
  guarded("position", () => runPositionCapture(payload, getTranscriptText, client));
}

type Reader = "default" | "agy" | "copilot";

/**
 * Which transcript reader runs, and which label the records get -- two separate
 * answers from one place. Both come from the ORIGINAL envelope, before
 * normalization rewrites it into a shape indistinguishable from Codex's.
 *
 * The reader is never derived from the label: an undefined label means
 * "attribution uncertain", not "no reader". An Antigravity envelope with a
 * conflicting identity still goes through the Antigravity reader, and so does a
 * Copilot-shaped one. An explicit `copilot` identity picks the Copilot reader even
 * when the payload's casing doesn't match the shape check (the Grok lesson: a
 * snake_case `transcript_path` there points at `events.jsonl`, which the Claude
 * reader would scan and silently find nothing in).
 */
function resolveHost(p: StopPayload, explicit: ExplicitIdentity): { reader: Reader; client: Client | undefined } {
  const direct = typeof p.summary === "string" || typeof p.position === "string";
  const shape = {
    direct,
    agy: isAntigravityPayload(p),
    grok: typeof p.lastAssistantMessage === "string",
    copilot: isCopilotPayload(p),
  };
  const client = classifyClient(shape, explicit);
  let reader: Reader = "default";
  if (direct) return { reader, client };
  if (shape.agy) reader = "agy";
  else if (shape.copilot) reader = "copilot";
  else if (!shape.grok && explicit.kind === "client" && explicit.client === "copilot") reader = "copilot";
  return { reader, client };
}

/**
 * The identity the installer set, from `--client <name>` (what librarian-stop.sh
 * forwards) or the RUTTER_CLIENT variable. Two sources that disagree are treated as
 * unrecognized -- absent beats wrong -- and an argument given without a value is
 * unrecognized too, not absent.
 */
function explicitIdentity() {
  const argv = process.argv.slice(2);
  let fromArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--client") fromArg = argv[++i] ?? "\0";
    else if (argv[i]!.startsWith("--client=")) fromArg = argv[i]!.slice("--client=".length);
  }
  const fromEnv = process.env.RUTTER_CLIENT;
  const arg = parseExplicitIdentity(fromArg);
  const env = parseExplicitIdentity(fromEnv);
  if (arg.kind !== "absent" && env.kind !== "absent" && fromArg !== fromEnv) return { kind: "unrecognized" as const };
  return arg.kind !== "absent" ? arg : env;
}

function guarded(kind: string, run: () => void): void {
  try {
    run();
  } catch (err) {
    console.error(`[librarian-capture] ${kind} capture failed unexpectedly; the other capture still runs:`, err);
  }
}

/** One stderr line for a write that did not happen (INV-5): distinct from "nothing to capture". */
function reportFailure(kind: string, failed: { reason: string; path: string }): void {
  const why =
    failed.reason === "unparseable-record"
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
function vaultNote(): string {
  const raw = process.env.LIBRARIAN_VAULT_PATH?.trim();
  const unset = !raw || /\$\{[^}]*\}/.test(raw); // unset, empty, or an unfilled plugin placeholder: config fell back
  return ` in vault ${config.vaultPath} (rutter ${config.version})${unset ? " (default: LIBRARIAN_VAULT_PATH was not set for this hook)" : ""}`;
}

// ---------------------------------------------------------------------------
// Session capture (SCN-001/SCN-002/etc.) -- unchanged behavior (SR-055).
// ---------------------------------------------------------------------------

function runSessionCapture(payload: StopPayload, getTranscriptText: () => string, client: Client | undefined): void {
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
    client,
  });
  if (result.failed) {
    reportFailure("session entry", result.failed);
  } else if (result.captured) {
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
function assistantMessage(payload: StopPayload): string | null {
  if (typeof payload.lastAssistantMessage === "string") return payload.lastAssistantMessage;
  if (typeof payload.last_assistant_message === "string") return payload.last_assistant_message;
  return null;
}

// ---------------------------------------------------------------------------
// Position capture (SCN-010, decision-graph Phase A) -- wholly additive.
// ---------------------------------------------------------------------------

function runPositionCapture(payload: StopPayload, getTranscriptText: () => string, client: Client | undefined): void {
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
    client,
  });

  if (result.failed) {
    reportFailure("position event", result.failed);
  } else if (result.captured) {
    const project = result.event?.workspace ? ` [${result.event.workspace.project}]` : "";
    console.error(
      `[librarian-capture] captured 1 position event (${directive.kind} ${directive.topicKey})${project} into ${result.month} positions stream${vaultNote()}.`
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

// ---------------------------------------------------------------------------
// Antigravity Stop adapter (antigravity-compatibility.md).
// ---------------------------------------------------------------------------

/**
 * Selected by payload SHAPE, never by a transcript path merely being set (the
 * Grok lesson): camelCase `conversationId` + `transcriptPath`, and none of the
 * snake_case keys another host (or a direct caller) would use.
 */
function isAntigravityPayload(p: StopPayload): boolean {
  return (
    typeof p.conversationId === "string" &&
    typeof p.transcriptPath === "string" &&
    p.session_id === undefined &&
    p.transcript_path === undefined &&
    p.summary === undefined &&
    p.position === undefined
  );
}

/**
 * Maps an Antigravity Stop payload onto the shape the shared paths already read:
 * `conversationId` becomes the session id, `workspacePaths[0]` the cwd, and the
 * current turn's assistant text the message fallback. Returns null (nothing
 * captured) on a non-empty `error`, or when the transcript is unreadable or
 * unrecognized -- fail closed, one stderr line. No other guard: our hook never
 * requests continuation, so it cannot cause re-entry.
 */
function normalizeAntigravity(p: StopPayload): StopPayload | null {
  if (typeof p.error === "string" && p.error !== "") {
    console.error("[librarian-capture] antigravity turn ended with an error; nothing captured.");
    return null;
  }
  const text = readAntigravityTurnText(p.transcriptPath as string);
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
function readAntigravityTurnText(transcriptPath: string): string | null {
  let raw: string;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return null;
  }
  const records: { type: string; content?: unknown }[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const rec = JSON.parse(line) as { type?: unknown; content?: unknown };
      if (rec && typeof rec.type === "string") records.push({ type: rec.type, content: rec.content });
    } catch {
      /* skip unparseable transcript line */
    }
  }
  if (records.length === 0) return null;
  let start = 0;
  records.forEach((r, i) => {
    if (r.type === "USER_INPUT") start = i + 1;
  });
  return records
    .slice(start)
    .filter((r) => r.type === "PLANNER_RESPONSE" && typeof r.content === "string")
    .map((r) => r.content as string)
    .join("\n");
}

// ---------------------------------------------------------------------------
// GitHub Copilot CLI agentStop adapter (docs/copilot-cli-plan.md, probe 2026-10-15).
// ---------------------------------------------------------------------------

/**
 * The camelCase `agentStop` shape: `sessionId` + `transcriptPath` + `stopReason`, with
 * no `conversationId` (Antigravity's key) and none of the snake_case keys another
 * host or a direct caller would use.
 */
function isCopilotPayload(p: StopPayload): boolean {
  return (
    typeof p.sessionId === "string" &&
    typeof p.transcriptPath === "string" &&
    typeof p.stopReason === "string" &&
    p.conversationId === undefined &&
    p.session_id === undefined &&
    p.transcript_path === undefined &&
    p.summary === undefined &&
    p.position === undefined
  );
}

/** How long to wait for Copilot to finish writing the turn; the hook's own timeout is 30 s. */
const COPILOT_WAIT_MS = 3000;
const COPILOT_POLL_MS = 50;

/**
 * Maps a Copilot `agentStop` payload (either casing) onto the shape the shared
 * paths read: the current turn's assistant text becomes the message fallback.
 * The result never carries `transcript_path`, or `resolveDirective` would run the
 * Claude reader over `events.jsonl` first.
 *
 * Copilot flushes the turn to `events.jsonl` up to ~100 ms AFTER the hook starts
 * (probed: 10 of 10 immediate reads missed the reply). It writes a `hook.start`
 * record echoing this payload after the turn's messages, so the reader polls until
 * that record is there, for at most COPILOT_WAIT_MS, then fails closed with one
 * stderr line.
 *
 * `stop_hook_active` is ignored: our hook never blocks, so it cannot cause
 * re-entry; a second `agentStop` on the same turn re-reads it and SR-013 dedupes.
 */
async function normalizeCopilot(p: StopPayload): Promise<StopPayload | null> {
  const sessionId = typeof p.sessionId === "string" ? p.sessionId : p.session_id;
  const transcriptPath =
    typeof p.transcriptPath === "string" ? p.transcriptPath : p.transcript_path ?? copilotTranscriptFor(sessionId);
  if (!transcriptPath) {
    console.error("[librarian-capture] copilot payload has no transcript path or usable session id; nothing captured.");
    return null;
  }
  // LIBRARIAN_COPILOT_WAIT_MS overrides the wait (tests use it to keep the timeout case fast).
  const override = Number(process.env.LIBRARIAN_COPILOT_WAIT_MS?.trim() || NaN);
  const waitMs = Number.isFinite(override) && override >= 0 ? override : COPILOT_WAIT_MS;
  // The marker is this invocation's own hook.start, found by its timestamp. Without one, an
  // earlier hook call's record would pass for it and stale text could be read: fail closed.
  if (typeof p.timestamp !== "number" && typeof p.timestamp !== "string") {
    console.error("[librarian-capture] copilot payload has no timestamp to match its transcript record; nothing captured.");
    return null;
  }
  const deadline = Date.now() + waitMs;
  let announced = false;
  for (;;) {
    const read = readCopilotTurnText(transcriptPath, p.timestamp);
    if (read.status === "complete") {
      return { session_id: sessionId, cwd: typeof p.cwd === "string" ? p.cwd : undefined, last_assistant_message: read.text };
    }
    if (Date.now() >= deadline) {
      const why =
        read.status === "unreadable"
          ? "unreadable"
          : read.status === "unrecognized"
            ? "unrecognized"
            : `not finished writing after ${waitMs} ms`;
      console.error(`[librarian-capture] copilot transcript ${why}; nothing captured.`);
      return null;
    }
    if (!announced && read.status === "incomplete") {
      // The usual case (Copilot writes the turn just after the hook starts); says the wait began.
      console.error(`[librarian-capture] copilot turn not on disk yet; waiting up to ${waitMs} ms.`);
      announced = true;
    }
    await new Promise((resolve) => setTimeout(resolve, COPILOT_POLL_MS));
  }
}

/** `$COPILOT_HOME/session-state/<id>/events.jsonl`, for a payload without a transcript path. */
function copilotTranscriptFor(sessionId: string | undefined): string | undefined {
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9-]+$/.test(sessionId)) return undefined;
  const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
  return path.join(home, "session-state", sessionId, "events.jsonl");
}

type CopilotRead = { status: "complete"; text: string } | { status: "unreadable" | "unrecognized" | "incomplete" };

/**
 * Assistant text of the CURRENT turn from a Copilot `events.jsonl`: the `content` of
 * `assistant.message` records whose `interactionId` equals the last `user.message`'s.
 * The boundary is that record field, not position. Only assistant records count:
 * `user.message` echoes the prompt verbatim, directive templates included.
 *
 * "complete" needs this invocation's `hook.start` after the last user message: an
 * `agentStop` (or its `Stop` alias) whose `data.input.timestamp` matches the payload's.
 * A second `agentStop` on the same turn has its own timestamp, so it waits for its own
 * record rather than reading before a continuation lands.
 */
function readCopilotTurnText(transcriptPath: string, timestamp: unknown): CopilotRead {
  let raw: string;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return { status: "unreadable" };
  }
  const records: { type: string; data: Record<string, unknown> }[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const rec = JSON.parse(line) as { type?: unknown; data?: unknown };
      if (rec && typeof rec.type === "string" && rec.data && typeof rec.data === "object") {
        records.push({ type: rec.type, data: rec.data as Record<string, unknown> });
      }
    } catch {
      /* skip an unparseable line, including a partly written last one */
    }
  }
  let lastUser = -1;
  records.forEach((r, i) => {
    if (r.type === "user.message") lastUser = i;
  });
  if (lastUser < 0) return records.length === 0 ? { status: "unrecognized" } : { status: "incomplete" };
  const interactionId = records[lastUser]!.data.interactionId;
  if (typeof interactionId !== "string") return { status: "unrecognized" };
  const turn = records.slice(lastUser + 1);
  const finished = turn.some(
    (r) =>
      r.type === "hook.start" &&
      (r.data.hookType === "agentStop" || r.data.hookType === "Stop") &&
      (r.data.input as { timestamp?: unknown } | undefined)?.timestamp === timestamp
  );
  if (!finished) return { status: "incomplete" };
  const text = turn
    .filter((r) => r.type === "assistant.message" && r.data.interactionId === interactionId && typeof r.data.content === "string")
    .map((r) => r.data.content as string)
    .filter((c) => c !== "")
    .join("\n");
  return { status: "complete", text };
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
