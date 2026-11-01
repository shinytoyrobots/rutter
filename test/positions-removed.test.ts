import { resetLibrarian, positionsDir, sessionsDir, statefulLogPath, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { captureSession } from "../src/capture.js";
import { createServer } from "../src/server.js";
import { openDb } from "../src/db.js";
import { reindex } from "../src/indexer.js";
import { weeklyCounts, readEvents } from "../src/instrumentation.js";

/**
 * v1.0.0 position removal: SR-012 (old log lines), SR-105 (frozen files, no tables),
 * SR-106 (session records untouched), SR-107 (no tool, standard unknown-tool error).
 */

beforeEach(resetLibrarian);

const MONTH_FILE = () => path.join(positionsDir, "2026-07.md");

function plantPositionStream(): string {
  fs.mkdirSync(positionsDir, { recursive: true });
  fs.writeFileSync(MONTH_FILE(), "---\nschema: position-stream@1\n---\nfrozen history\n", "utf8");
  return fs.readFileSync(MONTH_FILE(), "utf8");
}

async function connect(): Promise<Client> {
  const server = createServer();
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

async function outcome(client: Client, name: string): Promise<string> {
  try {
    const res = await client.callTool({ name, arguments: {} });
    return JSON.stringify(res);
  } catch (err) {
    return `threw: ${(err as Error).message}`;
  }
}

test("SR-107: librarian-positions is not listed, and a call gets the same error as any unregistered tool", async () => {
  const client = await connect();
  const names = (await client.listTools()).tools.map((t) => t.name);
  assert.ok(!names.includes("librarian-positions"));
  const removed = await outcome(client, "librarian-positions");
  const other = await outcome(client, "librarian-no-such-tool");
  assert.equal(removed.replaceAll("librarian-positions", "X"), other.replaceAll("librarian-no-such-tool", "X"));
  assert.match(removed, /not found|unknown|isError|threw/i);
});

test("SR-105: reindex leaves the positions files byte-identical and keeps no position tables", () => {
  const before = plantPositionStream();
  const db = openDb();
  db.exec("CREATE TABLE IF NOT EXISTS position_events (x TEXT); CREATE TABLE IF NOT EXISTS positions (x TEXT); CREATE TABLE IF NOT EXISTS position_refs (x TEXT);");
  reindex(db);
  assert.equal(fs.readFileSync(MONTH_FILE(), "utf8"), before);
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name);
  for (const t of ["position_events", "position_refs", "positions"]) assert.ok(!tables.includes(t), `${t} dropped`);
});

test("SR-106: reindexing and queries leave session record bytes unchanged", async () => {
  captureSession({ summary: "decided a thing", sessionId: "S-1", now: new Date("2026-07-24T12:00:00.000Z") });
  const file = path.join(sessionsDir, "2026-07-24.md");
  const before = fs.readFileSync(file, "utf8");
  reindex(openDb());
  const client = await connect();
  await client.callTool({ name: "librarian-recent", arguments: {} });
  await client.callTool({ name: "librarian-search", arguments: { query: "decided" } });
  assert.equal(fs.readFileSync(file, "utf8"), before);
});

test("SR-012: historical librarian-positions log lines are skipped without error and not counted", () => {
  fs.mkdirSync(path.dirname(statefulLogPath), { recursive: true });
  fs.writeFileSync(
    statefulLogPath,
    [
      JSON.stringify({ ts: "2026-07-20T10:00:00.000Z", kind: "librarian-positions" }),
      JSON.stringify({ ts: "2026-07-21T10:00:00.000Z", kind: "librarian-recent" }),
      "",
    ].join("\n"),
    "utf8"
  );
  assert.equal(readEvents().length, 2);
  assert.deepEqual(weeklyCounts(), [{ week: "2026-W30", count: 1 }]);
  assert.ok(vaultRoot);
});
