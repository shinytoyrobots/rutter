import { z } from "zod";

/**
 * How a session summary reaches the server WITHOUT the server doing any
 * inference (INV-6) or network I/O (INV-1): the client (Claude) emits a
 * directive during the session, and the Stop hook extracts it deterministically.
 *
 * The directive is an HTML comment carrying a small JSON payload, so it is
 * invisible in rendered markdown and unambiguous to parse:
 *
 *   <!-- librarian-session {"summary":"Decided X; shipped Y.","refs":["Notes/x.md"]} -->
 *
 * Curation (deciding the one line worth keeping) is entirely the client's; this
 * module only lifts an already-written line out of the transcript text. If the
 * client emits several, the LAST one wins -- it reflects the session's outcome.
 */

const DirectiveSchema = z.object({
  summary: z.string(),
  refs: z.array(z.string()).optional(),
});
export type SessionDirective = z.infer<typeof DirectiveSchema>;

const DIRECTIVE = /<!--\s*librarian-session\s+([\s\S]*?)-->/g;

/**
 * An UNFILLED TEMPLATE, not a summary: `<one plain-English line>` and friends.
 * The contract ships the directive's literal syntax in three places from v3.4.0
 * (SERVER_INSTRUCTIONS, README, docs/memory-of-use.md), so the template text is
 * now in front of clients and users far more often than before -- and a template
 * copied without being filled in parses as perfectly valid JSON with a non-empty
 * summary. Treating an angle-bracketed placeholder as "no directive" costs
 * nothing (no real summary is wrapped in <>) and keeps `<one plain-English line>`
 * out of the record.
 *
 * Note on the related transcript hazard, checked 2026-07-27 and currently NOT a
 * risk: MCP server-level instructions DO appear in Claude Code's transcript JSONL,
 * but in a record with no `message.content`, so capture-cli's extractText cannot
 * reach them and the syntax example in SERVER_INSTRUCTIONS cannot be lifted as a
 * capture. That is a property of Claude Code's transcript format, not a guarantee
 * we control -- this guard is what holds if the format ever changes.
 */
const PLACEHOLDER_SUMMARY = /^<.*>$/;

/**
 * Extract the last well-formed directive from arbitrary transcript text, or
 * `null` if there is none. A malformed, empty-summary, or unfilled-template
 * directive yields `null` so it collapses into the SR-004 no-op path rather than
 * storing junk.
 */
export function parseSessionDirective(text: string): SessionDirective | null {
  let payload: string | null = null;
  for (const match of text.matchAll(DIRECTIVE)) {
    payload = match[1]!.trim(); // keep the last occurrence
  }
  if (payload === null) return null;

  try {
    const parsed = DirectiveSchema.safeParse(JSON.parse(payload));
    if (!parsed.success) return null;
    const summary = parsed.data.summary.trim();
    if (summary === "" || PLACEHOLDER_SUMMARY.test(summary)) return null;
    return parsed.data;
  } catch {
    return null; // not valid JSON -- treat as "no directive"
  }
}
