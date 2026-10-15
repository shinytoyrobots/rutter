import { vaultRoot } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { defaultDbPath, resolveVault } from "../src/config.js";
import { route } from "../src/cli-route.js";
import { openDb } from "../src/db.js";
import { reindex } from "../src/indexer.js";
import { ensureIndex } from "../src/startup-index.js";
import { readOwner, recordOwner, markClaiming, ownership, withRebuildLock } from "../src/vault-owner.js";
import { createServer } from "../src/server.js";

/**
 * Running from an npm install rather than a clone (docs/npm-plan.md): where the index
 * lives, which vault an index belongs to, and the `rutter-memory` command's routing.
 * Server-level tests spawn the BUILT dispatcher, so each server reads its own vault.
 */

const repo = path.join(import.meta.dirname, "..");
const cli = path.join(repo, "dist", "cli.js");
const built = fs.existsSync(cli);
const t = built ? test : test.skip;

let n = 0;
/** A fresh scratch folder with `notes` written into a vault inside it. */
function vault(notes: Record<string, string>, mtime?: Date): string {
  const dir = path.join(vaultRoot, "npm", `vault-${n++}`);
  for (const [rel, body] of Object.entries(notes)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body, "utf8");
    if (mtime) fs.utimesSync(abs, mtime, mtime);
  }
  return resolveVault(dir);
}
const scratchDb = (): string => path.join(vaultRoot, "npm", `db-${n++}`, "librarian.db");

function env(vaultPath: string, dbPath?: string): Record<string, string> {
  const e: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith("LIBRARIAN_")) e[k] = v;
  e.LIBRARIAN_VAULT_PATH = vaultPath;
  if (dbPath) e.LIBRARIAN_DB_PATH = dbPath;
  return e;
}

async function startServer(vaultPath: string, dbPath: string): Promise<Client> {
  const client = new Client({ name: "npm-test", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [cli], env: env(vaultPath, dbPath), stderr: "ignore" }));
  return client;
}

async function searchText(client: Client, query: string): Promise<string> {
  const res = (await client.callTool({ name: "librarian-search", arguments: { query } })) as { content: { text: string }[] };
  return res.content.map((c) => c.text).join("\n");
}

function ownerOf(dbPath: string): string | undefined {
  const db = new DatabaseSync(dbPath);
  try {
    return (db.prepare("SELECT value FROM index_owner WHERE key = 'vault'").get() as { value: string } | undefined)?.value;
  } finally {
    db.close();
  }
}

function runCli(args: string[], e: Record<string, string>): { status: number | null; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [cli, ...args], { env: e, encoding: "utf8" });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

// ---------------------------------------------------------------------------
// Default database location
// ---------------------------------------------------------------------------

test("a clone keeps data/ in the repo; an install under node_modules uses a per-vault data folder", () => {
  const home = "/home/sam";
  assert.equal(defaultDbPath("/work/rutter", "/v/a", {}, home), "/work/rutter/data/librarian.db");
  const installed = defaultDbPath("/usr/lib/node_modules/rutter-memory", "/v/a", {}, home);
  assert.match(installed, /^\/home\/sam\/\.local\/share\/rutter\/[0-9a-f]{16}\/librarian\.db$/);
  assert.equal(
    defaultDbPath("/x/node_modules/rutter-memory", "/v/a", { XDG_DATA_HOME: "/data" }, home),
    installed.replace("/home/sam/.local/share", "/data"),
    "XDG_DATA_HOME is honored, with the same vault folder"
  );
  assert.equal(
    defaultDbPath("/x/node_modules/rutter-memory", "/v/a", { XDG_DATA_HOME: "relative" }, home),
    installed,
    "a relative XDG_DATA_HOME is ignored, as the spec requires"
  );
  assert.notEqual(
    defaultDbPath("/x/node_modules/rutter-memory", "/v/b", {}, home),
    installed,
    "two vaults get two different databases"
  );
});

t("the configured path: an explicit LIBRARIAN_DB_PATH wins; without one a clone uses data/", () => {
  const probe = (e: Record<string, string>) =>
    spawnSync(process.execPath, ["--input-type=module", "-e", `const { config } = await import(${JSON.stringify(path.join(repo, "dist", "config.js"))}); console.log(config.dbPath)`], {
      env: e,
      encoding: "utf8",
    }).stdout.trim();
  const v = vault({});
  assert.equal(probe(env(v, "/somewhere/else.db")), "/somewhere/else.db");
  assert.equal(probe(env(v)), path.join(repo, "data", "librarian.db"));
});

// ---------------------------------------------------------------------------
// Vault ownership
// ---------------------------------------------------------------------------

t("a database built from vault A, opened with vault B, is refused: neither rebuilt nor read", async () => {
  const a = vault({ "only-a.md": "# A\nalphaonly marker" });
  const b = vault({ "only-b.md": "# B\nbravoonly marker" });
  const db = scratchDb();

  const serverA = await startServer(a, db);
  try {
    assert.match(await searchText(serverA, "alphaonly marker"), /only-a\.md/);
    assert.equal(ownerOf(db), a);

    // Server B starts against the same explicit path while A is still running.
    const serverB = await startServer(b, db);
    try {
      const refused = await searchText(serverB, "bravoonly marker");
      assert.match(refused, /belongs to the vault/);
      assert.ok(refused.includes(a), "names the owning vault");
      assert.match(refused, /LIBRARIAN_DB_PATH/, "says how to fix it");
      const res = (await serverB.callTool({ name: "librarian-recent", arguments: {} })) as { content: { text: string }[] };
      assert.match(res.content[0]!.text, /belongs to the vault/, "every tool refuses, not only search");
    } finally {
      await serverB.close();
    }
    assert.equal(ownerOf(db), a, "B did not take the database over");
    assert.match(await searchText(serverA, "alphaonly marker"), /only-a\.md/, "A still answers from vault A");
    assert.doesNotMatch(await searchText(serverA, "bravoonly marker"), /only-b\.md/);

    // reindex refuses the same way, and --force hands the file to B by rebuilding it.
    const plain = runCli(["reindex"], env(b, db));
    assert.equal(plain.status, 1);
    assert.match(plain.stderr, /belongs to the vault/);
    assert.equal(ownerOf(db), a);
    const forced = runCli(["reindex", "--force"], env(b, db));
    assert.equal(forced.status, 0, forced.stderr);
    assert.equal(ownerOf(db), b);
    assert.match(await searchText(serverA, "alphaonly marker"), /belongs to the vault/, "A stops answering at once");
  } finally {
    await serverA.close();
  }
});

t("an index with no recorded vault is rebuilt from this vault before it answers anything", async () => {
  const old = new Date("2020-01-01T00:00:00Z");
  const a = vault({ "a1.md": "# A1\nlegacyaonly text", "a2.md": "# A2\nalpha" });
  const b = vault({ "b1.md": "# B1\nbravo", "b2.md": "# B2\nbravo two" }, old);
  const db = scratchDb();

  // Build from A, then strip the owner: what a database from before this release looks like.
  assert.equal(runCli(["reindex"], env(a, db)).status, 0);
  const raw = new DatabaseSync(db);
  raw.exec("DELETE FROM index_owner");
  raw.close();
  assert.equal(ownerOf(db), undefined);

  // Same note count, all older than the last index: the count and time checks would call it current.
  const serverB = await startServer(b, db);
  try {
    assert.doesNotMatch(await searchText(serverB, "legacyaonly text"), /a1\.md/, "vault A's notes are gone");
    assert.match(await searchText(serverB, "bravo"), /b1\.md/);
  } finally {
    await serverB.close();
  }
  assert.equal(ownerOf(db), b);
});

test("a failed claim leaves the database unowned, and the server's tools return the error", async () => {
  const db = openDb(scratchDb());
  // A rebuild that dies after every phase but before completing.
  const dying = new Proxy(db, {
    get(target, prop) {
      if (prop === "prepare") {
        return (sql: string) => {
          if (/INSERT OR REPLACE INTO index_meta/.test(sql)) throw new Error("simulated claim failure");
          return target.prepare(sql);
        };
      }
      const value = Reflect.get(target, prop) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  assert.throws(() => ensureIndex(dying), /simulated claim failure/);
  assert.equal(ownership(db).status, "claiming", "never recorded as owned by a rebuild that did not finish");
  assert.equal(ownership(db, "/some/other/vault").status, "foreign", "and every other vault still refuses it");
  assert.equal(ensureIndex(db).built, true, "this vault's next start retries the claim");
  assert.equal(ownership(db).status, "owned");

  const server = createServer({ indexError: () => "rutter could not build its index: simulated claim failure" });
  const client = new Client({ name: "npm-test", version: "0.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  try {
    // The in-process server opens this file's own database, which nothing has built yet.
    const shared = openDb();
    assert.equal(readOwner(shared), undefined);
    const res = (await client.callTool({ name: "librarian-search", arguments: { query: "anything" } })) as { content: { text: string }[] };
    assert.match(res.content[0]!.text, /simulated claim failure/);
    reindex(shared); // this vault now owns it, so a stale startup error no longer applies
    const after = (await client.callTool({ name: "librarian-search", arguments: { query: "anything" } })) as { content: { text: string }[] };
    assert.doesNotMatch(after.content[0]!.text, /simulated claim failure/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("a takeover marks the index before touching any table, so the previous owner refuses throughout -- and after a failure", () => {
  const db = openDb(scratchDb());
  recordOwner(db, "/vault/a");
  const dying = new Proxy(db, {
    get(target, prop) {
      if (prop === "prepare") {
        return (sql: string) => {
          // Fail once the notes are committed: the old owner must not be serving them.
          if (/INSERT OR REPLACE INTO index_meta/.test(sql)) {
            assert.equal(ownership(target, "/vault/a").status, "foreign", "A refuses while B's notes are in the tables");
            throw new Error("simulated failure after the notes committed");
          }
          return target.prepare(sql);
        };
      }
      const value = Reflect.get(target, prop) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  assert.throws(() =>
    withRebuildLock(db, () => {
      markClaiming(db);
      return reindex(dying);
    })
  );
  assert.equal(ownership(db, "/vault/a").status, "foreign", "still refused by A after the failed takeover");
});

test("the rebuild lock: a live holder makes others leave the index alone; a dead holder's lock is taken over", () => {
  const db = openDb(scratchDb());
  db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('rebuild', ?)").run(String(process.ppid));
  const busy = ensureIndex(db);
  assert.equal(busy.built, false);
  assert.match(busy.warning ?? "", /another process is rebuilding/);
  assert.equal(readOwner(db), undefined, "no claim was made while another process held the lock");

  db.prepare("INSERT OR REPLACE INTO index_owner (key, value) VALUES ('rebuild', '2147483646')").run();
  assert.equal(ensureIndex(db).built, true, "a lock left by a process that no longer exists does not block forever");
  assert.equal(ownership(db).status, "owned");
  const lock = db.prepare("SELECT value FROM index_owner WHERE key = 'rebuild'").get() as { value: string };
  assert.equal(lock.value, "", "released when done");
});

test("reindex records the owner only after every phase succeeded", () => {
  const db = openDb(scratchDb());
  reindex(db);
  assert.equal(readOwner(db), resolveVault(process.env.LIBRARIAN_VAULT_PATH!));
});

// ---------------------------------------------------------------------------
// The rutter-memory command
// ---------------------------------------------------------------------------

test("routing: no subcommand serves; known subcommands pass their arguments on; anything else is usage", () => {
  assert.deepEqual(route([]), { command: "serve", args: [] });
  assert.deepEqual(route(["serve"]), { command: "serve", args: [] });
  assert.deepEqual(route(["reindex", "--force"]), { command: "reindex", args: ["--force"] });
  assert.deepEqual(route(["recent", "5", "--days", "3"]), { command: "recent", args: ["5", "--days", "3"] });
  assert.deepEqual(route(["install-hook", "--client", "codex"]), { command: "install-hook", args: ["--client", "codex"] });
  assert.equal(route(["--help"]).command, "usage");
  assert.equal(route(["--help"]).error, undefined);
  assert.match(route(["bogus"]).error ?? "", /unknown command "bogus"/);
});

t("an unknown subcommand exits non-zero with usage on stderr, and nothing on stdout", () => {
  const res = runCli(["bogus"], env(vault({})));
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /usage: rutter-memory/);
  assert.equal(res.stdout, "");
});

t("the built entry point carries a shebang, so npm can run it as a command", () => {
  assert.match(fs.readFileSync(cli, "utf8"), /^#!\/usr\/bin\/env node\n/);
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8")) as { bin: Record<string, string> };
  assert.deepEqual(pkg.bin, { "rutter-memory": "./dist/cli.js", rutter: "./dist/cli.js" });
});
