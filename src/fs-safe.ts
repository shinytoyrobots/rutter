import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

/**
 * The one place every server write is funnelled through, so INV-2 (writes only
 * under `_librarian/` or `data/`) and INV-3 (never hard-delete a record) can be
 * reasoned about locally rather than re-audited at every call site.
 *
 * The functions here are the security choke point for SR-101 path handling:
 * confinement, symlink refusal, and atomic replacement all live here so the
 * domain modules (capture/session-record) stay free of path-safety noise.
 */

/** Absolute roots the server is ever allowed to write to (INV-2). */
const WRITE_ROOTS = [config.librarianDir, path.dirname(config.dbPath)];

/** True when `abs` is `root` itself or lives beneath it (no `..` escape). */
function isWithin(root: string, abs: string): boolean {
  const rel = path.relative(root, abs);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Resolve an untrusted vault-relative reference against `baseAbs`, returning the
 * absolute path only if it stays inside `baseAbs`. Absolute inputs and `..`
 * traversal (SEC-A-004, SEC-A-005) resolve to `null` rather than escaping. This
 * does NOT touch the filesystem — callers decide whether to read.
 */
export function resolveWithin(baseAbs: string, candidate: string): string | null {
  if (candidate.includes("\0")) return null; // NUL-byte path confusion (SEC-A-007)
  if (path.isAbsolute(candidate)) return null; // e.g. `/etc/passwd`
  const abs = path.resolve(baseAbs, candidate);
  return isWithin(baseAbs, abs) ? abs : null;
}

/**
 * Read a file inside `baseAbs`, refusing to follow a symlink whose real target
 * escapes the base (SEC-A-006, the vault-read analogue of the write guard).
 * Returns the raw bytes, or `null` if the path is confined-but-absent or unsafe.
 */
export function readConfined(baseAbs: string, candidate: string): Buffer | null {
  const abs = resolveWithin(baseAbs, candidate);
  if (abs === null) return null;
  try {
    // Compare realpaths on BOTH sides: the configured base may itself sit under a
    // symlinked prefix (e.g. macOS /var -> /private/var), so checking the real
    // target against the raw base would wrongly reject every note.
    const realBase = fs.realpathSync(baseAbs);
    const real = fs.realpathSync(abs);
    if (!isWithin(realBase, real)) return null; // symlink pointing out of the base
    return fs.readFileSync(real);
  } catch {
    return null; // missing / unreadable — treated as "not resolvable", never thrown
  }
}

/** Reject any write target that escapes the allowed roots — belt for INV-2. */
function assertWritable(abs: string): void {
  if (!WRITE_ROOTS.some((root) => isWithin(root, abs))) {
    throw new Error(`refusing write outside _librarian/ or data/: ${abs}`);
  }
}

/**
 * Atomically publish `content` at `abs` via write-temp-then-rename in the same
 * directory. Two deliberate properties:
 *  - INV-3 safety: `rename` REPLACES the directory entry; it never opens the
 *    existing record with a truncating write flag, so a pre-planted symlink at
 *    the target (SEC-A-006) is overwritten, not written *through*. Callers that
 *    preserve prior entries (see session-record) therefore never destroy them.
 *  - Crash safety: a torn write lands in the temp file, never the record, so an
 *    oversized/interrupted capture can't corrupt existing entries (SEC-A-011).
 */
export function atomicWrite(abs: string, content: string): void {
  assertWritable(abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content, { encoding: "utf8" });
  fs.renameSync(tmp, abs);
}

/** Append one line to a confined append-only log (the stateful-use JSONL). */
export function appendLine(abs: string, line: string): void {
  assertWritable(abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.appendFileSync(abs, line.endsWith("\n") ? line : `${line}\n`, "utf8");
}
