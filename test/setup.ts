import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Test isolation (INV-1): point the librarian at a throwaway temp vault BEFORE
 * any src module loads config. This file imports only node built-ins and sets
 * the env vars at module-evaluation time, so it MUST be the first import in
 * every test file -- ES modules evaluate the first import's subtree first, so
 * config.ts reads these temp paths, never `~/Documents/knowledge-vault`.
 *
 * Cleanup here uses fs.rmSync on TEST fixtures only; the INV-3 no-hard-delete
 * scan targets src/, so tearing down temp records is legitimate.
 */

const root = fs.mkdtempSync(path.join(os.tmpdir(), "librarian-test-"));
process.env.LIBRARIAN_VAULT_PATH = root;
process.env.LIBRARIAN_DB_PATH = path.join(root, "data", "librarian.db");

export const vaultRoot = root;
export const librarianDir = path.join(root, "_librarian");
export const sessionsDir = path.join(librarianDir, "sessions");
export const positionsDir = path.join(librarianDir, "positions");
export const statefulLogPath = path.join(librarianDir, "stateful-use.jsonl");

/** Remove all memory-of-use between tests so each starts from a clean slate. */
export function resetLibrarian(): void {
  fs.rmSync(librarianDir, { recursive: true, force: true });
}

/** Write a store note into the temp vault (read-only target of the librarian). */
export function writeNote(relPath: string, content: string): string {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return abs;
}

/** Read a session record file's raw text, or "" if absent. */
export function readSession(day: string): string {
  try {
    return fs.readFileSync(path.join(sessionsDir, `${day}.md`), "utf8");
  } catch {
    return "";
  }
}

/** Does a session record file exist for the day? (SR-004 no-empty-file checks.) */
export function sessionExists(day: string): boolean {
  return fs.existsSync(path.join(sessionsDir, `${day}.md`));
}

/** Read a position stream file's raw text, or "" if absent (SCN-010 analogue of readSession). */
export function readPositions(month: string): string {
  try {
    return fs.readFileSync(path.join(positionsDir, `${month}.md`), "utf8");
  } catch {
    return "";
  }
}

/** Does a position stream file exist for the month? */
export function positionsExist(month: string): boolean {
  return fs.existsSync(path.join(positionsDir, `${month}.md`));
}

/**
 * Flatten a grouped `recent()` result back to a newest-first list of increments.
 *
 * v3.5.0 changed the UNIT of recall from the increment to the session (SR-030), so
 * `RecentResult.sessions` replaced `RecentResult.entries`. Plenty of properties are
 * still genuinely entry-level and should keep being asserted there -- ordering by
 * session date, versioned provenance, byte-verbatim summaries, no-phantom entries,
 * project-filter membership. This helper lets those tests keep testing exactly what
 * they tested before, rather than being rewritten into group assertions that would
 * quietly cover less.
 *
 * Group-level semantics (grouping key, count-caps-sessions, brief) are asserted
 * directly against `sessions` in recent.test.ts -- not through this helper.
 */
export function increments<T extends { sessions: { increments: E[] }[] }, E>(result: T): E[] {
  // Sessions come newest-first with increments oldest-first inside; reversing each
  // session's increments restores a strict newest-first stream over all of them.
  return result.sessions.flatMap((s) => [...s.increments].reverse());
}
