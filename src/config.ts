import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

// Resolve the project root from this module's location (dist/ or src/ -> ..),
// NOT from process.cwd(). This keeps the index path stable no matter which
// directory Claude Code launches the server from.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The release version, read from package.json so the server reports the same number
// the plugin manifest and the CHANGELOG do. It used to be a literal in server.ts that
// followed its own numbering (0.5.0 against a package at 0.2.0); one source means a
// release bump cannot leave the server announcing a different version. Falls back to
// "0.0.0" rather than throwing: a version string must never stop the server starting.
function readVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as { version?: unknown };
    return typeof pkg.version === "string" && pkg.version !== "" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Read a LIBRARIAN_* setting, ignoring a value the launching host failed to fill in.
 *
 * The plugin declares its settings as `${user_config.vault_path}` and friends. Claude
 * Code substitutes them; Grok fills in `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`
 * but not these, and Codex fills in none of them. Left alone, the server would search a
 * folder literally named `${user_config.vault_path}` (finding nothing, with no error) and
 * tell the client it was reading "${user_config.user_label}'s work". An empty value is
 * treated the same way. Either way the default applies, and the stderr line says why, so
 * the cause is visible rather than a silent "No notes matched".
 */
export function readSetting(name: string, source: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = source[name]?.trim();
  if (!raw) return undefined;
  if (/\$\{[^}]*\}/.test(raw)) {
    console.error(
      `[rutter] ${name} arrived unresolved ("${raw}"): this host did not fill in the plugin option. ` +
        `Using the default instead; set ${name} in the environment the host is launched from to override it.`
    );
    return undefined;
  }
  return raw;
}

const vaultPath = expandHome(readSetting("LIBRARIAN_VAULT_PATH") ?? "~/Documents/knowledge-vault");

const dbPath = expandHome(readSetting("LIBRARIAN_DB_PATH") ?? path.join(projectRoot, "data", "librarian.db"));

// Memory-of-use lives in `_librarian/` INSIDE the vault (storage layer 2). It resolves relative to the configured vault path — not cwd — so
// the same records are found no matter where Claude Code launches the server.
// `_librarian/` is already excluded from the S1 FTS index (see `ignoreDirs`).
const librarianDir = path.join(vaultPath, "_librarian");

// How the server refers to whose work this is, in the instructions and tool
// descriptions every client receives on connect. Default is generic, so a fresh
// install describes "the user's work" rather than the author's; set a name and the
// instructions say "Robin's work", which reads more naturally to a model that then
// knows whose collection it is looking at. Used possessively (`<label>'s work`), so
// the value is a bare name or noun phrase, never already-possessive.
const userLabel = readSetting("LIBRARIAN_USER_LABEL") ?? "the user";

export const config = {
  /** Release version, from package.json (the single source; see readVersion). */
  version: readVersion(),
  /** Absolute path to the Obsidian vault (the source of truth). */
  vaultPath,
  /** Absolute path to the derived SQLite index (a regenerable cache). */
  dbPath,
  /** Root of the memory-of-use overlay; every server write lands under here or `data/`. */
  librarianDir,
  /**
   * Whose work the server says this is, in client-facing instructions and tool
   * descriptions. Defaults to `the user`; set `LIBRARIAN_USER_LABEL` to a name for a
   * personal install. Used possessively as `<userLabel>'s work`.
   */
  userLabel,
  /** Where per-day session records live: `_librarian/sessions/<YYYY-MM-DD>.md`. */
  sessionsDir: path.join(librarianDir, "sessions"),
  /**
   * Where per-month position-event streams live (SCN-010, decision-graph Phase A):
   * `_librarian/positions/<YYYY-MM>.md`. A wholly separate directory from
   * `sessionsDir` -- SR-055 requires session-record storage to be untouched by
   * position capture, so the two live under sibling paths with no shared file.
   */
  positionsDir: path.join(librarianDir, "positions"),
  /** Append-only stateful-use instrumentation log (JSONL); durable, never in the DB. */
  statefulLogPath: path.join(librarianDir, "stateful-use.jsonl"),
  /** Directory names never indexed. `_librarian/` is reserved for the memory-of-use overlay. */
  ignoreDirs: [".git", ".obsidian", ".trash", "node_modules", "_librarian", ".smart-env"],
  defaultSearchLimit: 8,
  /** Hard upper bound on a stored summary (SR-101 oversized-input guard). */
  maxSummaryChars: 2000,
  /**
   * Style-contract length budget for a session summary, in words (SR-021/SR-034).
   * Advisory, NOT a bound: over-ceiling summaries produce a visible warning and are
   * still stored byte-verbatim, because style is never grounds for rewriting,
   * truncating, or rejecting (SR-023/INV-6). The hard bound is `maxSummaryChars`,
   * which exists for an unrelated reason (oversized input, SR-101).
   *
   * Calibrated from observed capture: the first fortnight of real records averaged
   * 37-61 words per step; the drift to 141-192 words per step (2026-08-02..04) is
   * what these numbers exist to make visible.
   *
   * SR-054 reuses these same two numbers for a position directive's stance line
   * ("the same numbers SR-021 states") rather than declaring a second pair -- one
   * style contract, two carriers.
   */
  summaryWordTarget: 40,
  summaryWordCeiling: 60,
  /**
   * How long a live position may go without any recorded event -- revision,
   * reaffirmation, or reference -- before `librarian-positions` calls it
   * dormant (SCN-011 / SR-063).
   *
   * This lives in config precisely BECAUSE dormancy is never stored: it is
   * recomputed from the events' own timestamps on every read, so changing this
   * number changes every answer immediately, with no schema migration, no
   * reindex, and no stale stored flag to invalidate. That property is the point
   * of SR-063, and this constant is where it is exercised.
   *
   * 180 days is a starting guess, not a calibrated figure: positions are rare
   * (≪1 per session) and no real stream is old enough yet to calibrate against.
   */
  positionDormantAfterDays: 180,
};
