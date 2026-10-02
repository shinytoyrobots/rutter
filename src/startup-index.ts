import fs from "node:fs";
import path from "node:path";
import { openDb, type DB } from "./db.js";
import { walkMarkdown, countOverlayMarkdown } from "./vault.js";
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
 * Two rules keep the check from doing harm:
 *   - It never rebuilds from a PARTIAL picture. A notes folder that is missing, or
 *     has an unreadable subfolder, would produce an index with notes silently
 *     dropped, so the check keeps the existing index and says why.
 *   - Anything it cannot inspect is an error, not "unchanged". Only a directory that
 *     does not exist yet counts as empty.
 *
 * This only ever calls `reindex()`, so the phases, ordering and write behavior that
 * SR-058 pins (the position fold's only trigger is a reindex) are unchanged.
 */

export type IndexVerdict = { stale: false; warning?: string } | { stale: true; reason: string };

function readMeta(db: DB, key: string): number | undefined {
  const row = db.prepare("SELECT value FROM index_meta WHERE key = ?").get(key) as { value: string } | undefined;
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function isMissing(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === "ENOENT";
}

/** Is any `.md` in `dir` newer than `since`? A missing directory is "no"; anything else throws. */
function newerMarkdownIn(dir: string, since: number): boolean {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch (err) {
    if (isMissing(err)) return false;
    throw err;
  }
  return names.some((name) => {
    if (!name.toLowerCase().endsWith(".md")) return false;
    try {
      return fs.statSync(path.join(dir, name)).mtimeMs > since;
    } catch (err) {
      if (isMissing(err)) return false; // vanished since the listing; the count check sees it
      throw err;
    }
  });
}

/** Has anything the index is built from changed since it was last built? */
export function indexVerdict(db: DB): IndexVerdict {
  const indexedAt = readMeta(db, "indexed_at");
  if (indexedAt === undefined) return { stale: true, reason: "the index has not been built yet" };

  // Walk the WHOLE vault before deciding anything, so a locked folder is known about
  // before it can be mistaken for deleted notes.
  let walked = 0;
  let newer = false;
  let unreadable: string | undefined;
  for (const abs of walkMarkdown(config.vaultPath, (dir) => (unreadable ??= dir))) {
    walked++;
    try {
      if (fs.statSync(abs).mtimeMs > indexedAt) newer = true;
    } catch (err) {
      if (!isMissing(err)) throw err; // vanished mid-walk; the count check below sees it
    }
  }

  if (unreadable !== undefined) {
    return { stale: false, warning: `part of the notes folder is unreadable (${unreadable}); keeping the existing index` };
  }
  const indexedWalked = readMeta(db, "walked_count");
  if (walked === 0 && (indexedWalked ?? 0) > 0) {
    return { stale: false, warning: `no notes found in ${config.vaultPath}; keeping the existing index` };
  }

  if (newer) return { stale: true, reason: "notes have changed" };
  // Added or removed notes change the count even when a copy preserved an old mtime.
  if (indexedWalked !== undefined && walked !== indexedWalked) {
    return { stale: true, reason: "notes have been added or removed" };
  }

  const indexedOverlay = readMeta(db, "overlay_count");
  if (indexedOverlay !== undefined && countOverlayMarkdown() !== indexedOverlay) {
    return { stale: true, reason: "session or position records have been added or removed" };
  }
  if (newerMarkdownIn(config.sessionsDir, indexedAt) || newerMarkdownIn(config.positionsDir, indexedAt)) {
    return { stale: true, reason: "session or position records have changed" };
  }
  return { stale: false };
}

export interface EnsureResult {
  built: boolean;
  reason?: string;
  warning?: string;
  stats?: IndexStats;
}

/** Rebuild the index if (and only if) it is missing or out of date. */
export function ensureIndex(db?: DB): EnsureResult {
  const database = db ?? openDb();
  const verdict = indexVerdict(database);
  if (!verdict.stale) return verdict.warning ? { built: false, warning: verdict.warning } : { built: false };
  return { built: true, reason: verdict.reason, stats: reindex(database) };
}
