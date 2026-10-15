import { reindex } from "./indexer.js";
import { config } from "./config.js";
import { openDb } from "./db.js";
import { ownership, foreignVaultMessage } from "./vault-owner.js";

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
const owner = ownership(db);
if (owner.status === "foreign" && !args.includes("--force")) {
  console.error(`[rutter] ${foreignVaultMessage(owner.owner)}`);
  process.exit(1);
}
if (owner.status === "foreign") {
  console.error(`[rutter] --force: rebuilding ${config.dbPath} from ${config.vaultRealPath}; it belonged to ${owner.owner}.`);
}

const stats = reindex(db);
console.log(
  `[rutter] reindex complete: ${stats.notes} notes indexed, ${stats.skipped} skipped, ${stats.ms}ms\n` +
    `  vault: ${config.vaultPath}\n  index: ${config.dbPath}`
);
// SR-104: report-only wall time for the identity pass -- no threshold, no failure mode.
console.error(
  `[rutter] identity pass: ${stats.identity.checked} dead ref(s) checked, ` +
    `${stats.identity.bound} bound, ${stats.identity.unresolved} unresolved, ` +
    `${stats.identity.appended} ledger entr${stats.identity.appended === 1 ? "y" : "ies"} appended, ${stats.identity.ms}ms`
);
// SR-058: reindex is the position fold's only trigger, so this line is the only
// place the fold is ever reported -- and the point at which anything captured
// since the last reindex becomes visible to librarian-positions.
console.error(
  `[rutter] position fold: ${stats.positions.events} event(s) across ` +
    `${stats.positions.months} month file(s) folded into ${stats.positions.topics} topic(s), ${stats.positions.ms}ms`
);
