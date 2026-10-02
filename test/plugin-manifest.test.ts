import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Claude Code loads a root .mcp.json as a PROJECT server too. There ${CLAUDE_PLUGIN_ROOT}
// is never substituted, so anyone opening Claude inside a clone of this repo saw a second
// server named "rutter" fail with CONNECTION_CLOSED beside the working plugin one
// ("Cannot find module '.../${CLAUDE_PLUGIN_ROOT}/dist/stdio.js'"). Declaring the server in
// plugin.json keeps it out of project discovery; this test stops a root .mcp.json coming back.

const root = path.join(import.meta.dirname, "..");

interface ServerDecl {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

test("the repo has no root .mcp.json for a project session to misread", () => {
  assert.equal(fs.existsSync(path.join(root, ".mcp.json")), false);
});

test("plugin.json declares the server, running the committed build from the plugin root", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8")) as {
    mcpServers?: Record<string, ServerDecl>;
  };
  const decl = manifest.mcpServers?.rutter;
  assert.ok(decl, "plugin.json declares the rutter server");
  assert.equal(decl.command, "node");
  assert.deepEqual(decl.args, ["${CLAUDE_PLUGIN_ROOT}/dist/stdio.js"]);
  assert.ok(fs.existsSync(path.join(root, "dist", "stdio.js")), "the build it runs is committed");

  const vars = decl.env ?? {};
  assert.equal(vars.LIBRARIAN_VAULT_PATH, "${user_config.vault_path}", "the notes folder comes from the plugin option");
  assert.ok(
    (vars.LIBRARIAN_DB_PATH ?? "").startsWith("${CLAUDE_PLUGIN_DATA}/"),
    "the index lives in the plugin data folder, which survives updates"
  );
});
