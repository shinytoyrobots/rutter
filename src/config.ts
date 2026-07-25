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

const vaultPath = expandHome(
  process.env.LIBRARIAN_VAULT_PATH ?? "~/Documents/knowledge-vault"
);

const dbPath = expandHome(
  process.env.LIBRARIAN_DB_PATH ?? path.join(projectRoot, "data", "librarian.db")
);

export const config = {
  /** Absolute path to the Obsidian vault (the source of truth). */
  vaultPath,
  /** Absolute path to the derived SQLite index (a regenerable cache). */
  dbPath,
  /** Directory names never indexed. `_librarian/` is reserved for the H2 sidecar. */
  ignoreDirs: [".git", ".obsidian", ".trash", "node_modules", "_librarian", ".smart-env"],
  defaultSearchLimit: 8,
};
