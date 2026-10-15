import { reindex } from "./indexer.js";
import { config } from "./config.js";
import { openDb } from "./db.js";
import { ownership, foreignVaultMessage, markClaiming, withRebuildLock } from "./vault-owner.js";
// `reindex [--force]`. An index recorded for another vault is refused untouched;
// `--force` hands it to this vault, by rebuilding first and recording the new owner
// only once that rebuild succeeds (see vault-owner.ts).
const args = process.argv.slice(2);
const unknown = args.find((a) => a !== "--force");
if (unknown !== undefined) {
    console.error(`[rutter] unknown argument "${unknown}" -- usage: reindex [--force]`);
    process.exit(2);
}
const db = openDb();
// The ownership decision and the rebuild run under one lock, so no other process can
// claim or rebuild the index between the check and the work.
const outcome = withRebuildLock(db, () => {
    const owner = ownership(db);
    if (owner.status === "foreign" && !args.includes("--force"))
        return { refused: foreignVaultMessage(owner.owner) };
    if (owner.status === "foreign") {
        console.error(`[rutter] --force: rebuilding ${config.dbPath} from ${config.vaultRealPath}; it belonged to ${owner.owner}.`);
    }
    // Marked before any table changes, so every server -- a previous owner, or another on
    // this vault -- refuses while the tables are half-built, and after a failure.
    markClaiming(db);
    return { stats: reindex(db) };
});
if (outcome === undefined) {
    console.error(`[rutter] another process is rebuilding ${config.dbPath} right now; try again when it finishes.`);
    process.exit(1);
}
if ("refused" in outcome) {
    console.error(`[rutter] ${outcome.refused}`);
    process.exit(1);
}
const stats = outcome.stats;
console.log(`[rutter] reindex complete: ${stats.notes} notes indexed, ${stats.skipped} skipped, ${stats.ms}ms\n` +
    `  vault: ${config.vaultPath}\n  index: ${config.dbPath}`);
// SR-104: report-only wall time for the identity pass -- no threshold, no failure mode.
console.error(`[rutter] identity pass: ${stats.identity.checked} dead ref(s) checked, ` +
    `${stats.identity.bound} bound, ${stats.identity.unresolved} unresolved, ` +
    `${stats.identity.appended} ledger entr${stats.identity.appended === 1 ? "y" : "ies"} appended, ${stats.identity.ms}ms`);
// SR-058: reindex is the position fold's only trigger, so this line is the only
// place the fold is ever reported -- and the point at which anything captured
// since the last reindex becomes visible to librarian-positions.
console.error(`[rutter] position fold: ${stats.positions.events} event(s) across ` +
    `${stats.positions.months} month file(s) folded into ${stats.positions.topics} topic(s), ${stats.positions.ms}ms`);
//# sourceMappingURL=reindex.js.map