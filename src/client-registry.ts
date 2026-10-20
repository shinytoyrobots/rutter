/**
 * What each supported client can do, in one place (docs/rutter-website-implementation-plan.md,
 * Priority 4). Docs and the README restate these facts by hand; test/client-registry.test.ts
 * fails when a surface disagrees.
 *
 * Deliberately NOT part of `CLIENTS` (client.ts): that set types a captured record's client
 * label, so nothing added here can become one. Keys are typed `Record<Client, ...>`, so the
 * compiler fails when the two drift.
 */
import type { Client } from "./client.js";

export interface ClientCapability {
  /** The name in the "You use" cell of every client table. */
  name: string;
  /** Heading anchor of the setup path, in getting-started.md. */
  anchor: string;
  /** The "What it takes" cell of every client table. */
  whatItTakes: string;
  /** A Stop hook captures this client's sessions. */
  capture: boolean;
  /** The client can recall through the MCP (Model Context Protocol) server. */
  recall: boolean;
  /** Capture is unreliable without a rules or instructions file the installer writes. */
  instructionsFile: boolean;
  /** The client version and month the path was tested with. */
  lastVerified: { version: string; date: string };
  /** A known-issues.md anchor that qualifies the support, or none. */
  qualification: string | null;
}

const NO_CLAUDE_CODE = "codex-copilot-cli-antigravity-and-muse-code-without-claude-code";

export const CLIENT_CAPABILITIES: Record<Client, ClientCapability> = {
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
} as const;
