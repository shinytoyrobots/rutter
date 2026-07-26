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
