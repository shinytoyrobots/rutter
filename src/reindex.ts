import { reindex } from "./indexer.js";
import { config } from "./config.js";

const stats = reindex();
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
