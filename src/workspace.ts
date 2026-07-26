import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { toInertLine } from "./sanitize.js";

/**
 * Workspace provenance (SCN-005): *where* a captured session happened, derived
 * automatically so a reader can tell which effort a record belongs to without
 * standing in its folder. Three values, all server-derived, none user-supplied:
 * the working directory, a project name extracted from it, and the repository
 * remote identity when it is resolvable.
 *
 * Two constraints shape every function here:
 *   - **Pure local file reads (SR-017 / INV-1).** Repository identity is read out
 *     of `.git/config` with `fs` only. This module deliberately imports no
 *     subprocess or network API -- it never shells out to `git` (which would be a
 *     spawn) and never dereferences a remote URL (which would be egress). The URL
 *     is a *string we found in a file*, nothing more (COR-A-011).
 *   - **Provenance never blocks a capture (SR-016).** Every filesystem call is
 *     wrapped: an absent, unreadable or nonsensical path yields `undefined` for
 *     the fields it could not derive, and capture proceeds. Nothing here throws.
 *
 * Provenance is untrusted input like any other captured string (SR-101, widened
 * to provenance at spec v3.1.0): values are reduced to inert single lines before
 * they are handed to the record writer, and are stored as YAML scalars there.
 */

export const WorkspaceSchema = z.object({
  cwd: z.string(), // the session's working directory, inert
  project: z.string(), // auto-derived name (never user-supplied -- see below)
  repo: z.string().optional(), // git remote origin URL, only when resolvable
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

/** Hard bound on any one stored provenance value (SR-101 oversized-input guard). */
const MAX_PROVENANCE_CHARS = 512;
/** Bound on a `.git` metadata file we are willing to read (belt for SEC-A-011). */
const MAX_CONFIG_BYTES = 256 * 1024;
/** Depth bound on the upward `.git` walk, so a pathological path terminates. */
const MAX_WALK_DEPTH = 64;

/**
 * Derive provenance for one capture. Returns `undefined` when there is no usable
 * working directory -- the caller then omits the `workspace` field entirely
 * rather than writing a placeholder shape (COR-R-020).
 *
 * The project name is the basename of the enclosing git working tree when there
 * is one, else the basename of the working directory itself. Using the tree root
 * keeps the name stable when a session runs from a subdirectory (`.../my-librarian/src`
 * is still project `my-librarian`), which is the whole point of the field. It is
 * always *derived*: asking Robin to name the project would make capture
 * non-ambient and break SCN-001's zero-user-action contract.
 */
export function deriveWorkspace(rawCwd: string | undefined): Workspace | undefined {
  if (typeof rawCwd !== "string") return undefined;
  const cwd = inert(rawCwd);
  if (cwd === "") return undefined; // no working directory -> no workspace field

  const tree = findWorkTree(rawCwd);
  // basename() of the inert form, so a garbage cwd still yields a garbage-but-inert
  // project rather than reaching the record un-normalised.
  const project = inert(path.basename(tree?.root ?? cwd));
  // A cwd with no final segment (e.g. `/`) can produce no name. Rather than half a
  // shape, omit provenance: every stored `workspace` has both cwd and project.
  if (project === "") return undefined;

  const repo = tree?.remote ? inert(tree.remote) : "";
  return { cwd, project, ...(repo ? { repo } : {}) };
}

interface WorkTree {
  /** Absolute path of the directory containing `.git`. */
  root: string;
  /** Raw `remote "origin"` URL as found in the config file, if any. */
  remote?: string;
}

/**
 * Walk up from `rawCwd` to the first directory holding a `.git`, and read that
 * repository's origin URL. Returns `undefined` when no enclosing repository
 * exists -- the legitimate "not a repo" case, not an error (SR-016).
 */
function findWorkTree(rawCwd: string): WorkTree | undefined {
  if (rawCwd.includes("\0")) return undefined; // NUL-byte path confusion (SEC-A-007)
  let dir: string;
  try {
    dir = path.resolve(rawCwd);
  } catch {
    return undefined;
  }
  for (let depth = 0; depth < MAX_WALK_DEPTH; depth++) {
    const gitDir = resolveGitDir(path.join(dir, ".git"));
    if (gitDir) {
      const remote = readOriginUrl(gitDir);
      return { root: dir, ...(remote ? { remote } : {}) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined; // filesystem root reached
    dir = parent;
  }
  return undefined;
}

/**
 * The real git metadata directory for a `.git` entry, or `undefined`. Handles the
 * two shapes git uses: a plain directory, and a *gitdir-redirect file* -- a
 * `.git` FILE containing `gitdir: <path>`, which is what linked worktrees and
 * submodules have (this project's own flow worktrees are exactly that shape, so
 * capture from one still resolves its repo).
 */
function resolveGitDir(dotGit: string): string | undefined {
  let isDirectory: boolean;
  try {
    const stat = fs.statSync(dotGit);
    if (!stat.isDirectory() && !stat.isFile()) return undefined;
    isDirectory = stat.isDirectory();
  } catch {
    return undefined; // absent or unreadable -- keep walking
  }
  if (isDirectory) return dotGit;

  const redirect = readSmall(dotGit)?.match(/^\s*gitdir:\s*(.+)$/m)?.[1]?.trim();
  if (!redirect || redirect.includes("\0")) return undefined;
  const target = path.resolve(path.dirname(dotGit), redirect);
  // Containment (dissent-2026-07-26-0003 mitigation): a redirect is followed only
  // when its target is itself git-metadata-shaped -- some path segment is `.git`,
  // as every real worktree/submodule gitdir is (`<repo>/.git/worktrees/<name>`,
  // `<repo>/.git/modules/<name>`). A crafted `.git` file pointing at an arbitrary
  // directory is refused, so this read cannot be steered outside git metadata.
  return isGitShaped(target) ? target : undefined;
}

/** True when some path segment is literally `.git` (git-metadata containment). */
function isGitShaped(abs: string): boolean {
  return abs.split(path.sep).includes(".git");
}

/**
 * Read `remote "origin"`'s URL for a git metadata directory. A linked worktree's
 * own gitdir carries no `config`; its shared config lives in the directory named
 * by `commondir`, so that is the one fallback we follow.
 *
 * Only ever a read, and only ever of a file named `config` -- the URL found there
 * is recorded verbatim-inert and never contacted (SR-017).
 */
function readOriginUrl(gitDir: string): string | undefined {
  const direct = parseOriginUrl(readSmall(path.join(gitDir, "config")));
  if (direct) return direct;
  const shared = resolveCommonDir(gitDir);
  return shared ? parseOriginUrl(readSmall(path.join(shared, "config"))) : undefined;
}

/** The shared `.git` directory a linked worktree points at, via its `commondir`. */
function resolveCommonDir(gitDir: string): string | undefined {
  const rel = readSmall(path.join(gitDir, "commondir"))?.trim();
  if (!rel || rel.includes("\0")) return undefined;
  const shared = path.resolve(gitDir, rel);
  // Same containment as the gitdir redirect: a real commondir names the shared
  // `.git` directory; anything else is refused rather than read.
  return isGitShaped(shared) ? shared : undefined;
}

const INI_SECTION = /^\s*\[([^\]]*)\]/;
const INI_URL = /^\s*url\s*=\s*(.*)$/;
const ORIGIN_SECTION = /^remote\s+"origin"$/;

/**
 * Minimal git-config (INI) read for exactly one value: the first non-empty `url`
 * inside `[remote "origin"]`. Deliberately not a general INI parser -- we want a
 * single string and no surface area for config trickery.
 */
function parseOriginUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  let inOrigin = false;
  for (const line of text.split("\n")) {
    const section = INI_SECTION.exec(line);
    if (section) {
      inOrigin = ORIGIN_SECTION.test(section[1]!.trim());
      continue;
    }
    if (!inOrigin) continue;
    const url = INI_URL.exec(line)?.[1]?.trim();
    if (url) return url;
  }
  return undefined;
}

/** Read a small text file, or `undefined` for absent/unreadable/oversized. */
function readSmall(abs: string): string | undefined {
  try {
    if (fs.statSync(abs).size > MAX_CONFIG_BYTES) return undefined;
    return fs.readFileSync(abs, "utf8");
  } catch {
    return undefined;
  }
}

/** One inert, length-bounded line -- the only form provenance is ever stored in. */
function inert(raw: string): string {
  const line = toInertLine(raw);
  return line.length > MAX_PROVENANCE_CHARS ? line.slice(0, MAX_PROVENANCE_CHARS).trimEnd() : line;
}
