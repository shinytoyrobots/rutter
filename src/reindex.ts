import { reindex } from "./indexer.js";
import { config } from "./config.js";

const stats = reindex();
console.log(
  `[my-librarian] reindex complete: ${stats.notes} notes indexed, ${stats.skipped} skipped, ${stats.ms}ms\n` +
    `  vault: ${config.vaultPath}\n  index: ${config.dbPath}`
);
