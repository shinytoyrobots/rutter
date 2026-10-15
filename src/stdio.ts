import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { config } from "./config.js";
import { ensureIndex } from "./startup-index.js";
import { openDb } from "./db.js";
import { ownership } from "./vault-owner.js";

async function main(): Promise<void> {
  // NEVER write to stdout on the stdio transport — it corrupts the MCP stream.
  // All diagnostics go to stderr.
  console.error(`[rutter] starting stdio server; vault=${config.vaultPath} db=${config.dbPath}`);
  // Set when the startup index check refuses or fails, so every tool call says why
  // instead of answering from an index that is foreign, half-claimed, or missing.
  let indexError: string | undefined;
  const server = createServer({ indexError: () => indexError });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[rutter] connected.");

  // After the handshake is open, so a large vault can never delay or time out the
  // connection. Synchronous: a tool call that arrives meanwhile simply waits for the
  // finished index rather than seeing a half-built one. A failure here must never
  // stop the server -- it carries on with whatever index it already has.
  try {
    const result = ensureIndex();
    if (result.refused) {
      indexError = result.refused;
      console.error(`[rutter] ${result.refused}`);
    }
    if (result.warning) console.error(`[rutter] ${result.warning}`);
    if (result.built && result.stats) {
      console.error(
        `[rutter] index rebuilt (${result.reason}): ${result.stats.notes} notes in ${result.stats.ms}ms`
      );
    }
  } catch (err) {
    // An index that records no vault (or a different one) must not be served after a
    // failed claim: it may hold another vault's notes. One this vault already owns is.
    const owned = (() => {
      try {
        return ownership(openDb()).status === "owned";
      } catch {
        return false;
      }
    })();
    if (owned) {
      console.error("[rutter] startup index check failed; continuing with the existing index:", err);
    } else {
      indexError = `rutter could not build its index from ${config.vaultPath} at ${config.dbPath}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[rutter] ${indexError}`);
    }
  }
}

main().catch((err) => {
  console.error("[rutter] fatal:", err);
  process.exit(1);
});
