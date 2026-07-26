import { resetLibrarian, writeNote, readSession } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";
import { captureSession } from "../src/capture.js";
import { reindex } from "../src/indexer.js";
import { search } from "../src/search.js";
import { recent } from "../src/recent.js";
import { enrich } from "../src/enrichment.js";
import { recordStatefulUse, weeklyCounts } from "../src/instrumentation.js";
import { readRecord } from "../src/session-record.js";

beforeEach(resetLibrarian);

const NOON = new Date("2026-07-24T12:00:00.000Z");
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function hashFile(abs: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

test("INV-2: capture + reindex never mutate store (vault) content", () => {
  const abs = writeNote("Notes/foo.md", "# Foo\nimmutable content");
  const before = hashFile(abs);
  captureSession({ summary: "Touched foo.", refs: ["Notes/foo.md"], now: NOON });
  reindex();
  assert.equal(hashFile(abs), before, "vault note is byte-identical after capture + reindex");
});

test("INV-3: re-capturing on a day appends; prior entries remain recoverable", () => {
  captureSession({ summary: "first entry", now: new Date("2026-07-24T09:00:00Z") });
  captureSession({ summary: "second entry", now: new Date("2026-07-24T10:00:00Z") });
  captureSession({ summary: "third entry", now: new Date("2026-07-24T11:00:00Z") });

  const record = readRecord("2026-07-24")!;
  assert.equal(record.sessions.length, 3, "all three entries present");
  for (const s of ["first entry", "second entry", "third entry"]) {
    assert.ok(record.sessions.some((e) => e.summary === s), `${s} still recoverable`);
  }
  assert.match(readSession("2026-07-24"), /second entry/, "prior entry preserved in the file body");
});

test("INV-3: the src tree contains no hard-delete of memory-of-use records", () => {
  const forbidden = /\b(unlinkSync|rmSync|rmdirSync|truncateSync)\b|DELETE\s+FROM/;
  for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".ts"))) {
    const code = fs.readFileSync(path.join(srcDir, file), "utf8");
    assert.ok(!forbidden.test(code), `${file} must not hard-delete records`);
  }
});

test("INV-4: deleting and rebuilding the index preserves search + session-derived behavior", () => {
  writeNote("Notes/foo.md", "# Foo\norbital telemetry alpha");
  reindex();
  captureSession({ summary: "Concluded foo.", refs: ["Notes/foo.md"], now: new Date("2026-07-22T12:00:00Z") });
  recordStatefulUse("librarian-recent", new Date("2026-07-22T12:00:00Z"));

  const before = {
    search: search("orbital telemetry").map((r) => r.path),
    recent: recent().entries.map((e) => `${e.day}:${e.summary}`),
    enriched: enrich(search("orbital telemetry")).signalCount,
    weekly: weeklyCounts(),
  };

  fs.rmSync(config.dbPath, { force: true }); // blow away the disposable cache
  reindex(); // rebuild purely from vault + _librarian/

  assert.deepEqual(search("orbital telemetry").map((r) => r.path), before.search, "search set stable");
  assert.deepEqual(recent().entries.map((e) => `${e.day}:${e.summary}`), before.recent, "recent stable");
  assert.equal(enrich(search("orbital telemetry")).signalCount, before.enriched, "enrichment stable");
  assert.deepEqual(weeklyCounts(), before.weekly, "weekly counts stable (log is not in the DB)");
});
