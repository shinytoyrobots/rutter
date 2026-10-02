import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { config } from "./config.js";
import { ensureIndex } from "./startup-index.js";
async function main() {
    // NEVER write to stdout on the stdio transport — it corrupts the MCP stream.
    // All diagnostics go to stderr.
    console.error(`[rutter] starting stdio server; vault=${config.vaultPath} db=${config.dbPath}`);
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[rutter] connected.");
    // After the handshake is open, so a large vault can never delay or time out the
    // connection. Synchronous: a tool call that arrives meanwhile simply waits for the
    // finished index rather than seeing a half-built one. A failure here must never
    // stop the server -- it carries on with whatever index it already has.
    try {
        const result = ensureIndex();
        if (result.built && result.stats) {
            console.error(`[rutter] index rebuilt (${result.reason}): ${result.stats.notes} notes in ${result.stats.ms}ms`);
        }
    }
    catch (err) {
        console.error("[rutter] startup index check failed; continuing with the existing index:", err);
    }
}
main().catch((err) => {
    console.error("[rutter] fatal:", err);
    process.exit(1);
});
//# sourceMappingURL=stdio.js.map