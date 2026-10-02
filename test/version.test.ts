import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

// One release number, in four places: package.json (the source), the plugin manifest
// the directory shows and pins users to, the version the server announces to every
// client, and the newest CHANGELOG heading. They used to disagree (server 0.5.0,
// package and manifest 0.2.0) because the server's was a literal nobody bumped.

const root = path.join(import.meta.dirname, "..");
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")) as { version: string };

test("package.json, the plugin manifest, the server and the CHANGELOG all name the same release", async () => {
  const pkg = readJson("package.json").version;
  assert.match(pkg, /^\d+\.\d+\.\d+$/, "package.json carries a plain semver");
  assert.equal(readJson(".claude-plugin/plugin.json").version, pkg, "plugin manifest matches package.json");
  assert.equal(readJson("package-lock.json").version, pkg, "the lockfile matches package.json");

  const server = createServer();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    assert.equal(client.getServerVersion()?.version, pkg, "the server announces the package version");
  } finally {
    await client.close();
    await server.close();
  }

  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  const newest = changelog.match(/^## v(\d+\.\d+\.\d+)/m);
  assert.ok(newest, "the CHANGELOG has a versioned heading");
  assert.equal(newest[1], pkg, "the newest CHANGELOG heading is this release (no stray 'Unreleased' ahead of it)");
});
