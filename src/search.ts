import { openDb, type DB } from "./db.js";
import { config } from "./config.js";

export interface SearchResult {
  path: string;
  title: string;
  type: string;
  status: string;
  created: string;
  domain: string;
  tags: string;
  snippet: string;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  type?: string;
  status?: string;
  domain?: string;
}

/**
 * Turn free text into a safe FTS5 MATCH expression: strip FTS operators, quote
 * each token, AND them together. FTS5's default is AND, so this deliberately
 * avoids the "blue man group -> blue OR man OR group" failure of naive search,
 * and prevents syntax errors from user punctuation.
 */
export function toMatchQuery(input: string): string {
  const tokens = input
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/["*():^-]/g, "").trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"`).join(" ");
}

export function search(query: string, opts: SearchOptions = {}, db?: DB): SearchResult[] {
  const database = db ?? openDb();
  const match = toMatchQuery(query);
  if (!match) return [];
  const limit = opts.limit ?? config.defaultSearchLimit;

  const rows = database
    .prepare(
      // FTS5 auxiliary functions (bm25/snippet) require the real table name,
      // not an alias — hence `notes_fts` spelled out rather than aliased.
      `SELECT notes_fts.path AS path,
              n.title AS title,
              n.type AS type,
              n.status AS status,
              n.created AS created,
              n.domain AS domain,
              n.tags AS tags,
              snippet(notes_fts, 2, '«', '»', '…', 14) AS snippet,
              bm25(notes_fts) AS score
       FROM notes_fts
       JOIN notes n ON n.path = notes_fts.path
       WHERE notes_fts MATCH ?
       ORDER BY score
       LIMIT ?`
    )
    .all(match, limit * 3) as unknown as SearchResult[];

  // Optional metadata filters (post-match; cheap at this corpus size).
  let filtered = rows;
  if (opts.type) filtered = filtered.filter((r) => r.type === opts.type);
  if (opts.status) filtered = filtered.filter((r) => r.status === opts.status);
  if (opts.domain) filtered = filtered.filter((r) => r.domain === opts.domain);

  return filtered.slice(0, limit);
}

export interface NoteContent {
  path: string;
  title: string;
  type: string;
  status: string;
  created: string;
  domain: string;
  tags: string;
  body: string;
}

export function getNote(notePath: string, db?: DB): NoteContent | null {
  const database = db ?? openDb();
  const meta = database
    .prepare(`SELECT path, title, type, status, created, domain, tags FROM notes WHERE path = ?`)
    .get(notePath) as unknown as Omit<NoteContent, "body"> | undefined;
  if (!meta) return null;
  const fts = database.prepare(`SELECT body FROM notes_fts WHERE path = ?`).get(notePath) as
    | { body: string }
    | undefined;
  return { ...meta, body: fts?.body ?? "" };
}
