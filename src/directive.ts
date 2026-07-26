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
 * Extract the last well-formed directive from arbitrary transcript text, or
 * `null` if there is none. A malformed or empty-summary directive yields `null`
 * so it collapses into the SR-004 no-op path rather than storing junk.
 */
export function parseSessionDirective(text: string): SessionDirective | null {
  let payload: string | null = null;
  for (const match of text.matchAll(DIRECTIVE)) {
    payload = match[1]!.trim(); // keep the last occurrence
  }
  if (payload === null) return null;

  try {
    const parsed = DirectiveSchema.safeParse(JSON.parse(payload));
    if (!parsed.success || parsed.data.summary.trim() === "") return null;
    return parsed.data;
  } catch {
    return null; // not valid JSON -- treat as "no directive"
  }
}
