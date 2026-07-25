import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { config } from "./config.js";

async function main(): Promise<void> {
  // NEVER write to stdout on the stdio transport — it corrupts the MCP stream.
  // All diagnostics go to stderr.
  console.error(`[my-librarian] starting stdio server; vault=${config.vaultPath} db=${config.dbPath}`);
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[my-librarian] connected.");
}

main().catch((err) => {
  console.error("[my-librarian] fatal:", err);
  process.exit(1);
});
