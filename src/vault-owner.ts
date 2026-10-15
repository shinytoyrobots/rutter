import type { DB } from "./db.js";
import { config } from "./config.js";

/**
 * Which vault an index belongs to, and the rule that keeps one vault's server from
 * reading or rebuilding another's.
 *
 * The staleness check (startup-index.ts) compares note counts and modified times, not
 * which vault built the index. Two servers pointed at one database with different vaults
 * would otherwise reuse each other's index or rebuild over it. So `reindex` records the
 * vault's real path here, and a server or `reindex` that finds a DIFFERENT vault recorded
 * refuses outright: it neither rebuilds nor reads. Rebuilding would be worse than
 * refusing, because the first owner, still running, would silently start answering from
 * the second vault's notes.
 *
 * A database with no owner (built before this existed) may hold any vault's index, and
 * counts and times cannot tell, so claiming one always means a full rebuild first; the
 * owner is written only after that rebuild succeeds (indexer.ts).
 */

export type Ownership = { status: "owned" } | { status: "unowned" } | { status: "foreign"; owner: string };

export function readOwner(db: DB): string | undefined {
  const row = db.prepare("SELECT value FROM index_owner WHERE key = 'vault'").get() as { value: string } | undefined;
  return row?.value;
}

export function recordOwner(db: DB, vault: string = config.vaultRealPath): void {
  db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('vault', ?)").run(vault);
}

export function ownership(db: DB, vault: string = config.vaultRealPath): Ownership {
  const owner = readOwner(db);
  if (owner === undefined) return { status: "unowned" };
  return owner === vault ? { status: "owned" } : { status: "foreign", owner };
}

/** The one message every refusal uses: startup, `reindex`, and each tool call. */
export function foreignVaultMessage(owner: string, vault: string = config.vaultRealPath, dbPath: string = config.dbPath): string {
  return (
    `rutter's index at ${dbPath} belongs to the vault ${owner}, not ${vault}, so it was neither read nor rebuilt. ` +
    `Unset LIBRARIAN_DB_PATH to use this vault's own default index, or point LIBRARIAN_DB_PATH at a separate file. ` +
    `To hand this file to ${vault} instead, run \`rutter-memory reindex --force\` with this vault (the other vault's server will then refuse).`
  );
}
