import fs from "node:fs";
import path from "node:path";
import { openDb, type DB } from "./db.js";
import { walkMarkdown } from "./vault.js";
import { reindex, type IndexStats } from "./indexer.js";
import { config } from "./config.js";

/**
 * Keep the index current without anyone running `reindex` by hand.
 *
 * Installed as a plugin there is no clone and no `npm run reindex`, so a fresh
 * install would otherwise answer every search with "No notes matched" until a step
 * the user cannot perform. The server therefore checks the index when it starts and
 * rebuilds it only when something it was built from has changed. An unchanged index
 * costs one stat per note and nothing else, which matters because a rebuild drops
 * and recreates the tables: another session searching at that instant would briefly
 * see an empty index. Rebuilding on every start would make that routine; rebuilding
 * on change keeps it rare.
 *
 * This only ever calls `reindex()`, so the phases, ordering and write behavior that
 * SR-058 pins (the position fold's only trigger is a reindex) are unchanged.
 */

export type IndexVerdict = { stale: false } | { stale: true; reason: string };

function readIndexedAt(db: DB): number | undefined {
  const row = db.prepare("SELECT value FROM index_meta WHERE key = 'indexed_at'").get() as
    | { value: string }
    | undefined;
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function newerMarkdownIn(dir: string, since: number): boolean {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return false; // the overlay directory not existing yet is simply "nothing new"
  }
  return names.some((name) => {
    if (!name.toLowerCase().endsWith(".md")) return false;
    try {
      return fs.statSync(path.join(dir, name)).mtimeMs > since;
    } catch {
      return false;
    }
  });
}

/** Has anything the index is built from changed since it was last built? */
export function indexVerdict(db: DB): IndexVerdict {
  const indexedAt = readIndexedAt(db);
  if (indexedAt === undefined) return { stale: true, reason: "the index has not been built yet" };

  let walked = 0;
  for (const abs of walkMarkdown()) {
    walked++;
    try {
      if (fs.statSync(abs).mtimeMs > indexedAt) return { stale: true, reason: "notes have changed" };
    } catch {
      // vanished between the walk and the stat; the count check below catches removals
    }
  }

  const indexed = (db.prepare("SELECT COUNT(*) AS c FROM notes").get() as { c: number }).c;
  // Zero notes found while the index holds some means the notes folder is missing,
  // unmounted or unreadable -- not that every note was deleted. Rebuilding then would
  // replace a good index with an empty one, so leave it alone.
  if (walked > 0 && walked < indexed) return { stale: true, reason: "notes have been removed" };

  if (newerMarkdownIn(config.sessionsDir, indexedAt) || newerMarkdownIn(config.positionsDir, indexedAt)) {
    return { stale: true, reason: "session or position records have changed" };
  }
  return { stale: false };
}

export interface EnsureResult {
  built: boolean;
  reason?: string;
  stats?: IndexStats;
}

/** Rebuild the index if (and only if) it is missing or out of date. */
export function ensureIndex(db?: DB): EnsureResult {
  const database = db ?? openDb();
  const verdict = indexVerdict(database);
  if (!verdict.stale) return { built: false };
  return { built: true, reason: verdict.reason, stats: reindex(database) };
}
