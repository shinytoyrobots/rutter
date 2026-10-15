#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { route, USAGE } from "./cli-route.js";

/**
 * The installed `rutter-memory` command. Each subcommand runs the module that already
 * does that job; this file adds no logic of its own. Those modules read their arguments
 * from process.argv, so the subcommand name is removed before they load.
 */
const r = route(process.argv.slice(2));
if (r.command === "usage") {
  // Help asked for goes to stdout; a mistake goes to stderr with a failing exit.
  if (r.error) {
    console.error(`rutter-memory: ${r.error}\n\n${USAGE}`);
    process.exit(2);
  }
  console.log(USAGE);
  process.exit(0);
}

process.argv = [process.argv[0]!, process.argv[1]!, ...r.args];
const here = path.dirname(fileURLToPath(import.meta.url));
const modules = {
  serve: "./stdio.js",
  reindex: "./reindex.js",
  recent: "./recent-cli.js",
  "install-hook": pathToFileURL(path.join(here, "..", "hooks", "install-hook.mjs")).href,
} as const;
await import(modules[r.command]);
