import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { config } from "./config.js";

export interface VaultNote {
  path: string; // vault-relative, POSIX separators — the provenance anchor
  title: string;
  type: string;
  status: string;
  created: string;
  domain: string;
  tags: string[];
  body: string;
  mtime: number;
}

/**
 * Depth-first walk of the vault yielding absolute paths to `.md` files.
 *
 * A directory that cannot be read is skipped, so one locked folder never aborts an
 * index. `onUnreadable` lets a caller that must NOT act on a partial picture (the
 * startup staleness check) find out that the walk was incomplete.
 */
export function* walkMarkdown(
  root: string = config.vaultPath,
  onUnreadable?: (dir: string, err: unknown) => void
): Generator<string> {
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      onUnreadable?.(dir, err);
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (config.ignoreDirs.includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        yield full;
      }
    }
  }
}

function firstHeading(body: string): string | null {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(/[,\s]+/).filter(Boolean);
  return [];
}

/**
 * YAML parses bare dates (`created: 2026-07-22`) into JS `Date` objects at UTC
 * midnight; `String(date)` then renders a timezone-shifted, verbose string.
 * Coerce dates back to a plain `YYYY-MM-DD` (in UTC, so no off-by-one).
 */
function normalizeScalar(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return raw == null ? "" : String(raw);
}

export function readNote(absPath: string, root: string = config.vaultPath): VaultNote | null {
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
  let data: Record<string, unknown> = {};
  let body = raw;
  try {
    const parsed = matter(raw);
    data = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch {
    // Malformed YAML frontmatter — index the raw body with empty metadata
    // rather than dropping the note entirely.
  }
  const rel = path.relative(root, absPath).split(path.sep).join("/");
  const filenameTitle = path.basename(absPath, ".md");
  let mtime = 0;
  try {
    mtime = Math.floor(fs.statSync(absPath).mtimeMs);
  } catch {
    /* keep 0 */
  }
  return {
    path: rel,
    title: normalizeScalar(data.title) || firstHeading(body) || filenameTitle,
    type: normalizeScalar(data.type),
    status: normalizeScalar(data.status),
    created: normalizeScalar(data.created),
    domain: normalizeScalar(data.domain),
    tags: normalizeTags(data.tags),
    body,
    mtime,
  };
}

/**
 * How many `.md` files the memory-of-use overlay holds (session records plus position
 * streams). Only a directory that does not exist yet counts as empty; any other
 * failure (permissions, a file where a directory should be) is thrown, because
 * reporting zero would let an unreadable input pass for an unchanged one.
 */
export function countOverlayMarkdown(): number {
  let total = 0;
  for (const dir of [config.sessionsDir, config.positionsDir]) {
    try {
      total += fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".md")).length;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return total;
}
