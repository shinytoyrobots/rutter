import "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readSetting } from "../src/config.js";

// Grok fills in ${CLAUDE_PLUGIN_ROOT} and ${CLAUDE_PLUGIN_DATA} but not the plugin's
// ${user_config.*} options, and Codex fills in none. Observed in Grok's own log:
//   [rutter] starting stdio server; vault=${user_config.vault_path} ...
// so the server searched a folder with that literal name and found nothing, silently.

test("a value the host never substituted is treated as unset, not used literally", () => {
  assert.equal(readSetting("X", { X: "${user_config.vault_path}" }), undefined);
  assert.equal(readSetting("X", { X: "  ${user_config.user_label}  " }), undefined);
  assert.equal(readSetting("X", { X: "${CLAUDE_PLUGIN_DATA}/librarian.db" }), undefined);
  assert.equal(readSetting("X", { X: "/Users/me/${PARTIAL}/notes" }), undefined, "a placeholder anywhere in the value counts");
});

test("real values, empty values and absent values behave sensibly", () => {
  assert.equal(readSetting("X", { X: "/Users/me/notes" }), "/Users/me/notes");
  assert.equal(readSetting("X", { X: "  /Users/me/notes  " }), "/Users/me/notes", "surrounding whitespace is trimmed");
  assert.equal(readSetting("X", { X: "Robin" }), "Robin");
  assert.equal(readSetting("X", { X: "" }), undefined, "an empty option is unset");
  assert.equal(readSetting("X", { X: "   " }), undefined);
  assert.equal(readSetting("X", {}), undefined);
  assert.equal(readSetting("X", { X: "a $5 note" }), "a $5 note", "a dollar sign alone is not a placeholder");
});

test("end to end: an unresolved notes folder and name fall back to the defaults and say why", () => {
  // A real process, because config is read once at import. Mirrors what Grok launches.
  const probe =
    'import { config } from "./src/config.js"; console.log(JSON.stringify({ vault: config.vaultPath, label: config.userLabel }));';
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", probe], {
    cwd: path.join(import.meta.dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      LIBRARIAN_VAULT_PATH: "${user_config.vault_path}",
      LIBRARIAN_USER_LABEL: "${user_config.user_label}",
      LIBRARIAN_DB_PATH: "${CLAUDE_PLUGIN_DATA}/librarian.db",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const seen = JSON.parse(result.stdout.trim().split("\n").at(-1)!) as { vault: string; label: string };
  assert.ok(!seen.vault.includes("${"), `the vault path is not the literal placeholder (got ${seen.vault})`);
  assert.equal(seen.label, "the user", "the label falls back instead of reading '${user_config.user_label}'s work'");
  assert.match(result.stderr, /LIBRARIAN_VAULT_PATH arrived unresolved/, "and the cause is logged");
  assert.match(result.stderr, /LIBRARIAN_USER_LABEL arrived unresolved/);
});
