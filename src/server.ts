import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { openDb } from "./db.js";
import { search, getNote } from "./search.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "my-librarian", version: "0.1.0" });
  const db = openDb();

  server.registerTool(
    "librarian-search",
    {
      title: "Search the vault",
      description:
        "Search Robin's knowledge vault for notes matching a query. Returns notes ranked by relevance, each with its vault path, type/status/created provenance, and a matching snippet. Read-only; all query terms must match.",
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
      const results = search(query, { limit, type, status, domain }, db);
      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: `No notes matched "${query}".` }] };
      }
      const text = results
        .map((r, i) => {
          const badges = [r.type, r.status, r.created].filter(Boolean).join(" · ");
          const meta = badges ? ` — ${badges}` : "";
          return `${i + 1}. ${r.title}${meta}\n   ${r.path}\n   …${r.snippet}…`;
        })
        .join("\n\n");
      return { content: [{ type: "text" as const, text }] };
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

  return server;
}
