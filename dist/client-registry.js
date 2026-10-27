const NO_CLAUDE_CODE = "codex-copilot-cli-antigravity-and-muse-code-without-claude-code";
export const CLIENT_CAPABILITIES = {
    claude: {
        name: "Claude Code",
        anchor: "fast-path-for-claude-code",
        whatItTakes: "A few minutes; nothing to clone",
        capture: true,
        recall: true,
        instructionsFile: false,
        lastVerified: { version: "2.1.296", date: "2026-10" },
        qualification: null,
    },
    grok: {
        name: "Grok",
        anchor: "grok-path",
        whatItTakes: "One npm install, a hook, and one `grok mcp add`",
        capture: true,
        recall: true,
        instructionsFile: false,
        lastVerified: { version: "1.0.62", date: "2026-10" },
        qualification: "the-grok-install-was-tested-on-linux-only",
    },
    codex: {
        name: "Codex",
        anchor: "codex-path",
        whatItTakes: "One npm install, and a hook you trust",
        capture: true,
        recall: true,
        instructionsFile: false,
        lastVerified: { version: "0.163.0", date: "2026-10" },
        qualification: NO_CLAUDE_CODE,
    },
    copilot: {
        name: "GitHub Copilot CLI",
        anchor: "copilot-cli-path",
        whatItTakes: "One npm install, a hook, and an instructions file",
        capture: true,
        recall: true,
        instructionsFile: true,
        lastVerified: { version: "1.0.98", date: "2026-10" },
        qualification: NO_CLAUDE_CODE,
    },
    agy: {
        name: "Antigravity CLI (`agy`)",
        anchor: "antigravity-path",
        whatItTakes: "One npm install, a hook, and a rule file",
        capture: true,
        recall: true,
        instructionsFile: true,
        lastVerified: { version: "1.3.2", date: "2026-10" },
        qualification: NO_CLAUDE_CODE,
    },
    muse: {
        name: "Muse Code (`muse`)",
        anchor: "muse-code-path",
        whatItTakes: "One npm install and one installer run",
        capture: true,
        recall: true,
        instructionsFile: true,
        lastVerified: { version: "1.4.10", date: "2026-10" },
        qualification: NO_CLAUDE_CODE,
    },
};
/**
 * Any other MCP client: search and recall through `npx`, no hook. It sits outside the identity
 * set on purpose, so it can never be a captured record's client label.
 */
export const RECALL_ONLY_ROW = {
    name: "Any other MCP (Model Context Protocol) client",
    anchor: "recall-only-with-npx",
    whatItTakes: "One config entry. Search and recall only: with no hook, nothing is captured",
    capture: false,
    recall: true,
};
//# sourceMappingURL=client-registry.js.map