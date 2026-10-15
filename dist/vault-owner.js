import { config } from "./config.js";
export function readOwner(db) {
    const row = db.prepare("SELECT value FROM index_owner WHERE key = 'vault'").get();
    return row?.value;
}
export function recordOwner(db, vault = config.vaultRealPath) {
    db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('vault', ?)").run(vault);
}
export function ownership(db, vault = config.vaultRealPath) {
    const owner = readOwner(db);
    if (owner === undefined)
        return { status: "unowned" };
    return owner === vault ? { status: "owned" } : { status: "foreign", owner };
}
/** The one message every refusal uses: startup, `reindex`, and each tool call. */
export function foreignVaultMessage(owner, vault = config.vaultRealPath, dbPath = config.dbPath) {
    return (`rutter's index at ${dbPath} belongs to the vault ${owner}, not ${vault}, so it was neither read nor rebuilt. ` +
        `Unset LIBRARIAN_DB_PATH to use this vault's own default index, or point LIBRARIAN_DB_PATH at a separate file. ` +
        `To hand this file to ${vault} instead, run \`rutter-memory reindex --force\` with this vault (the other vault's server will then refuse).`);
}
//# sourceMappingURL=vault-owner.js.map