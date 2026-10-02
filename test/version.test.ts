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

test("the repository's own marketplace lists this plugin, from the repo root, and leaves the version to plugin.json", () => {
  // `/plugin marketplace add shinytoyrobots/rutter` reads this file. If its entry drifted
  // from the manifest (a different name, a pinned version that goes stale) the install
  // command in the README would quietly stop working or install an old release.
  const market = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8")) as {
    name: string;
    plugins: { name: string; source: string; version?: string }[];
  };
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8")) as { name: string };
  assert.equal(market.name, "rutter", "the marketplace id is the second half of rutter@rutter in the README");
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0]!.name, manifest.name, "the entry names the plugin the manifest declares");
  assert.equal(market.plugins[0]!.source, ".", "the plugin is the repository root");
  assert.equal(
    market.plugins[0]!.version,
    undefined,
    "no version on the entry: plugin.json is the single authority, so there is nothing to forget to bump"
  );
});
