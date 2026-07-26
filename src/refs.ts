import crypto from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { readConfined } from "./fs-safe.js";

/**
 * A versioned reference to a store note (SR-003): the vault-relative path PLUS a
 * content-hash captured as-read, so the reference still identifies *what Robin
 * saw* even after the note changes underneath it. We use a content-hash rather
 * than a git ref so provenance works on any vault, git-backed or not, and so the
 * hash is reproducible from the note bytes alone.
 */
export const RefSchema = z.object({
  path: z.string(),
  hash: z.string(), // `sha256:<hex>` -- self-describing, matches on re-read
});
export type VersionedRef = z.infer<typeof RefSchema>;

/** sha256 of raw bytes, tagged with its algorithm so the format is self-describing. */
export function contentHash(bytes: Buffer): string {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

/**
 * Build a versioned ref for a client-named note by READING it from the vault and
 * hashing what is actually there. Two consequences, both deliberate:
 *   - A path that escapes the vault (`../`, absolute, symlink-out) resolves to
 *     `null` and is never dereferenced (SEC-A-004, SEC-A-005, SEC-A-006).
 *   - A path that names no real note also resolves to `null`, so a fabricated or
 *     unresolvable identity is rejected rather than stored as valid (COR-A-002).
 * The hash is therefore always computed here, never trusted from the client.
 */
export function buildRef(relPath: string): VersionedRef | null {
  const normalized = normalizeRefPath(relPath);
  if (normalized === null) return null;
  const bytes = readConfined(config.vaultPath, normalized);
  if (bytes === null) return null;
  return { path: normalized, hash: contentHash(bytes) };
}

/**
 * Strip smuggled query/wikilink decoration (SEC-A-012) down to a bare candidate
 * path, then reject anything that isn't a plain vault-relative path. Returns the
 * cleaned path or `null`; it never touches the filesystem (confinement is
 * enforced by readConfined at dereference time).
 */
export function normalizeRefPath(raw: string): string | null {
  const withoutWikilink = raw.replace(/^\[\[/, "").replace(/\]\]$/, "");
  const bare = withoutWikilink.split(/[?#|]/, 1)[0]!.trim(); // drop ?query #frag |alias
  if (bare === "" || bare.includes("\0")) return null;
  return bare;
}
