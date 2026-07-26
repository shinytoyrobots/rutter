import fs from "node:fs";
import { captureSession } from "./capture.js";
import { parseSessionDirective, type SessionDirective } from "./directive.js";

/**
 * Entry point the Claude Code Stop hook runs at session end. It reads a JSON
 * payload on stdin and appends at most one session entry. It performs no
 * inference and no network I/O (INV-6, INV-1) -- it only lifts a client-written
 * directive out of the transcript and stores it.
 *
 * Two accepted stdin shapes:
 *   1. A direct capture payload: {"summary": "...", "refs": [...], "sessionId": "..."}
 *   2. A Claude Code Stop payload: {"transcript_path": "...", "session_id": "..."}
 *      -- from which the last `librarian-session` directive is extracted.
 * Anything else, or an empty/absent directive, is a clean no-op (SR-004).
 */

interface StopPayload {
  transcript_path?: string;
  session_id?: string;
  summary?: string;
  refs?: string[];
  sessionId?: string;
}

async function main(): Promise<void> {
  const input = await readStdin();
  const payload = safeParse(input);
  if (!payload) return;

  const directive = resolveDirective(payload);
  if (!directive) {
    console.error("[librarian-capture] no session directive found; nothing captured.");
    return;
  }

  const result = captureSession({
    summary: directive.summary,
    refs: directive.refs,
    sessionId: payload.session_id ?? payload.sessionId,
  });
  if (result.captured) {
    console.error(`[librarian-capture] captured 1 entry into ${result.day} session record.`);
    if (result.rejectedRefs.length) {
      console.error(`[librarian-capture] rejected unresolvable refs: ${result.rejectedRefs.join(", ")}`);
    }
  } else if (result.deduped) {
    // SR-013: the Stop event fires every turn; an unchanged directive already
    // recorded for this session is a no-op, so re-firing never duplicates.
    console.error("[librarian-capture] directive unchanged for this session; already recorded, nothing appended.");
  } else {
    console.error("[librarian-capture] empty summary; no entry written.");
  }
}

/** Direct payload wins; otherwise pull the directive from the transcript file. */
function resolveDirective(payload: StopPayload): SessionDirective | null {
  if (typeof payload.summary === "string") {
    return { summary: payload.summary, refs: payload.refs };
  }
  if (payload.transcript_path) {
    return parseSessionDirective(readTranscriptText(payload.transcript_path));
  }
  return null;
}

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
