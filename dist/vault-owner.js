import { config } from "./config.js";
/**
 * Written as the owner while an index changes hands, before any table is touched, so the
 * previous owner's server refuses from the first replaced row rather than serving the new
 * vault's notes under its own name. Replaced by the real owner only when the rebuild succeeds.
 */
const CLAIMING = "claiming:";
export function readOwner(db) {
    const row = db.prepare("SELECT value FROM index_owner WHERE key = 'vault'").get();
    return row?.value;
}
export function recordOwner(db, vault = config.vaultRealPath) {
    db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('vault', ?)").run(vault);
}
/** Mark the index as changing hands to `vault`; see CLAIMING. Call only while holding the rebuild lock. */
export function markClaiming(db, vault = config.vaultRealPath) {
    recordOwner(db, `${CLAIMING}${vault}`);
}
export function ownership(db, vault = config.vaultRealPath) {
    const owner = readOwner(db);
    if (owner === undefined)
        return { status: "unowned" };
    if (owner === vault)
        return { status: "owned" };
    if (owner === `${CLAIMING}${vault}`)
        return { status: "claiming" };
    return { status: "foreign", owner };
}
/** The one message every refusal uses: startup, `reindex`, and each tool call. */
export function foreignVaultMessage(owner, vault = config.vaultRealPath, dbPath = config.dbPath) {
    const whose = owner.startsWith(CLAIMING)
        ? `is being rebuilt for the vault ${owner.slice(CLAIMING.length)} (or a rebuild for it failed part-way), not ${vault}`
        : `belongs to the vault ${owner}, not ${vault}`;
    return (`rutter's index at ${dbPath} ${whose}, so it was neither read nor rebuilt. ` +
        `Unset LIBRARIAN_DB_PATH to use this vault's own default index, or point LIBRARIAN_DB_PATH at a separate file. ` +
        `To hand this file to ${vault} instead, run \`rutter-memory reindex --force\` with this vault (the other vault's server will then refuse).`);
}
function alive(pid) {
    if (pid === process.pid)
        return true;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (err) {
        return err.code === "EPERM";
    }
}
/**
 * Run `work` holding the index's rebuild lock, or return `undefined` at once if another
 * live process holds it. Every decision to rebuild (whose index this is, whether to claim
 * it) is made inside, so two servers can never both see an unowned index and both claim
 * it, and a forced takeover can never interleave its tables with a routine rebuild.
 *
 * The lock is a row, not a file: taken and checked in one IMMEDIATE transaction, released
 * by blanking it (src/ never deletes -- INV-3). A holder that died is detected by its pid.
 */
export function withRebuildLock(db, work) {
    db.exec("BEGIN IMMEDIATE");
    try {
        const row = db.prepare("SELECT value FROM index_owner WHERE key = 'rebuild'").get();
        const holder = Number(row?.value);
        if (Number.isInteger(holder) && holder > 0 && holder !== process.pid && alive(holder)) {
            db.exec("COMMIT");
            return undefined;
        }
        db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('rebuild', ?)").run(String(process.pid));
        db.exec("COMMIT");
    }
    catch (err) {
        db.exec("ROLLBACK");
        throw err;
    }
    try {
        return work();
    }
    finally {
        db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('rebuild', '')").run();
    }
}
//# sourceMappingURL=vault-owner.js.map