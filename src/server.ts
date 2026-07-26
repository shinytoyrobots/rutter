import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { openDb } from "./db.js";
import { getNote } from "./search.js";
import { runSearch, runRecent } from "./app.js";
import type { EnrichedResult } from "./enrichment.js";
import type { RecentEntry } from "./recent.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "my-librarian", version: "0.2.0" });
  const db = openDb();

  server.registerTool(
    "librarian-search",
    {
      title: "Search the vault",
      description:
        "Search Robin's knowledge vault for notes matching a query. Returns notes ranked by relevance, each with its vault path, type/status/created provenance, and a matching snippet. A result Robin engaged before also carries a quiet prior-engagement note. Read-only; all query terms must match.",
      inputSchema: {
        query: z.string().describe("What to search for (free text; all terms must match)."),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 8)."),
        type: z.string().optional().describe("Filter by frontmatter `type` (e.g. note, moc, reference)."),
        status: z.string().optional().describe("Filter by frontmatter `status` (e.g. evergreen, snapshot)."),
        domain: z.string().optional().describe("Filter by frontmatter `domain`."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit, type, status, domain }) => {
      const { results } = runSearch(query, { limit, type, status, domain }, db);
      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: `No notes matched "${query}".` }] };
      }
      return { content: [{ type: "text" as const, text: results.map(formatSearchResult).join("\n\n") }] };
    }
  );

  server.registerTool(
    "librarian-get-note",
    {
      title: "Read a note",
      description:
        "Return the full content of one vault note by its path (as returned by librarian-search). Read-only.",
      inputSchema: {
        path: z.string().describe("Vault-relative note path, e.g. 'Notes/Reference/foo.md'."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ path: notePath }) => {
      const note = getNote(notePath, db);
      if (!note) {
        return { content: [{ type: "text" as const, text: `Note not found: ${notePath}` }] };
      }
      const header = [note.type, note.status, note.created].filter(Boolean).join(" · ");
      return {
        content: [
          {
            type: "text" as const,
            text: `# ${note.title}\n${header ? header + "\n" : ""}${note.path}\n\n---\n\n${note.body}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "librarian-recent",
    {
      title: "Recall recent work",
      description:
        "Answer 'what was I working on lately?' from captured session records, most-recent-first, each with its date and the versioned provenance of notes it touched. Optionally limit to a recent window (in days) or a maximum count.",
      inputSchema: {
        window: z.number().int().min(1).optional().describe("Only sessions within the last N days."),
        count: z.number().int().min(1).optional().describe("Return at most this many sessions."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ window, count }) => {
      const { entries, empty } = runRecent({ windowDays: window, count });
      if (empty) {
        return { content: [{ type: "text" as const, text: "No recent sessions recorded yet." }] };
      }
      if (entries.length === 0) {
        return { content: [{ type: "text" as const, text: "No sessions in the requested window." }] };
      }
      return { content: [{ type: "text" as const, text: entries.map(formatRecentEntry).join("\n\n") }] };
    }
  );

  return server;
}

/** One search hit, with a prior-engagement note appended only when present. */
function formatSearchResult(r: EnrichedResult, i: number): string {
  const badges = [r.type, r.status, r.created].filter(Boolean).join(" · ");
  const meta = badges ? ` — ${badges}` : "";
  const base = `${i + 1}. ${r.title}${meta}\n   ${r.path}\n   …${r.snippet}…`;
  if (!r.priorEngagement) return base; // quiet on unreferenced results (SR-009)
  // Presented as clearly-delimited DATA, never as an instruction (SEC-A-010).
  return `${base}\n   ↩ prior engagement ${r.priorEngagement.date}: "${r.priorEngagement.summary}"`;
}

/** One recent session line: date/time, summary, and versioned provenance. */
function formatRecentEntry(e: RecentEntry): string {
  const provenance = e.refs.map((ref) => `${ref.path}@${ref.hash}`);
  const head = `${e.day} ${e.time.slice(11, 19)} — ${e.summary}`;
  return provenance.length ? `${head}\n   refs: ${provenance.join("\n         ")}` : head;
}
