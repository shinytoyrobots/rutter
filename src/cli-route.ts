/**
 * Subcommand routing for the `rutter-memory` (and `rutter`) command, kept apart from
 * cli.ts so it can be tested without starting anything.
 *
 * No subcommand means `serve`: an MCP config that runs a bare `npx -y rutter-memory`
 * must start the server, and must never see anything on stdout but the protocol.
 */

export type Route =
  | { command: "serve" | "reindex" | "recent" | "install-hook"; args: string[] }
  | { command: "usage"; args: string[]; error?: string };

export const USAGE = `usage: rutter-memory [command]

  serve          run the MCP server on stdio (the default)
  reindex        rebuild the search index [--force]
  recent         print recent session summaries [count] [--days N] [--project NAME] [--brief]
  install-hook   register the capture hook [--client claude|codex|antigravity] [--vault PATH]
  help           show this message`;

export function route(argv: string[]): Route {
  const [first, ...rest] = argv;
  if (first === undefined) return { command: "serve", args: [] };
  switch (first) {
    case "serve":
    case "reindex":
    case "recent":
    case "install-hook":
      return { command: first, args: rest };
    case "help":
    case "--help":
    case "-h":
      return { command: "usage", args: rest };
    default:
      return { command: "usage", args: rest, error: `unknown command "${first}"` };
  }
}
