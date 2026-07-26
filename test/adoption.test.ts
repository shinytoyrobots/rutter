import { resetLibrarian } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { vaultRoot } from "./setup.js";
import { captureSession } from "../src/capture.js";
import { recent } from "../src/recent.js";
import { runRecent } from "../src/app.js";
import { readEvents } from "../src/instrumentation.js";
import { createServer, SERVER_INSTRUCTIONS, formatRecentEntry } from "../src/server.js";

/**
 * SCN-006: the librarian teaches its clients when to reach for memory.
 * Covers COR-R-023, COR-R-024 and COR-A-010 -- the server's own declared
 * instructions, plus project display and filtering on librarian-recent.
 */

beforeEach(resetLibrarian);

/** A directory whose basename becomes the derived project name (no .git needed). */
function projectDir(name: string): string {
  const abs = path.join(vaultRoot, "projects", name);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

/** Capture one entry at noon UTC on `day`, in `project` (omit for a legacy entry). */
function seed(day: string, summary: string, project?: string): void {
  captureSession({
    summary,
    ...(project ? { cwd: projectDir(project) } : {}),
    sessionId: `S-${day}-${project ?? "legacy"}`,
    now: new Date(`${day}T12:00:00.000Z`),
  });
}

test("COR-R-024 SCN-006/AC-instructions (SR-020): the server declares MCP instructions naming both stateful tools", () => {
  // (a) recency -> librarian-recent, (b) prior engagement/content -> librarian-search,
  // (c) consult them before reading files directly.
  assert.match(SERVER_INSTRUCTIONS, /librarian-recent/, "names librarian-recent");
  assert.match(SERVER_INSTRUCTIONS, /Recency questions[\s\S]*librarian-recent/, "for recency questions");
  assert.match(SERVER_INSTRUCTIONS, /librarian-search/, "names librarian-search");
  assert.match(
    SERVER_INSTRUCTIONS,
    /Prior-engagement and content questions[\s\S]*librarian-search/,
    "for prior-engagement / content questions"
  );
  assert.match(SERVER_INSTRUCTIONS, /before reading files directly/, "directs clients to consult them first");
});

test("COR-R-024 SCN-006/AC-instructions (SR-020): the instructions arrive in the MCP initialize result, with no client config", () => {
  // A real handshake over an in-memory transport pair: this is exactly what a fresh
  // client sees on connect, and no client-side configuration participates.
  return (async () => {
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const declared = client.getInstructions();
      assert.ok(declared && declared.trim() !== "", "instructions are declared at the MCP server level");
      assert.equal(declared, SERVER_INSTRUCTIONS, "and are the guidance that ships with the server");
      const tools = (await client.listTools()).tools.map((t) => t.name);
      for (const name of ["librarian-recent", "librarian-search", "librarian-get-note"]) {
        assert.ok(tools.includes(name), `${name} is the tool the guidance points at`);
      }
    } finally {
      await client.close();
      await server.close();
    }
  })();
});

test("COR-R-023 SCN-006/AC-display-filter (SR-019): every provenance-carrying entry displays its project; a legacy entry stays quiet", () => {
  seed("2026-07-20", "Worked on the librarian.", "my-librarian");
  seed("2026-07-21", "Drafted chapter three.", "novel");
  seed("2026-07-22", "Read the KS interviews.", "ks-research");
  seed("2026-07-23", "A pre-v3.1.0 entry with no workspace.");

  const rendered = recent().entries.map(formatRecentEntry);
  assert.match(rendered[3]!, /\[my-librarian\]/, "project shown for a provenance-carrying entry");
  assert.match(rendered[2]!, /\[novel\]/);
  assert.match(rendered[1]!, /\[ks-research\]/);
  assert.equal(rendered[0]!.includes("["), false, "the provenance-less entry gets no placeholder at all");
  assert.match(rendered[0]!, /2026-07-23 12:00:00 — A pre-v3.1.0 entry/, "it reads exactly as it did before v3.1.0");
});

test("COR-R-023 SCN-006/AC-display-filter (SR-019): a project filter matches case-insensitively and leaves ordering untouched", () => {
  seed("2026-07-20", "Novel, session one.", "novel");
  seed("2026-07-21", "Worked on the librarian.", "my-librarian");
  seed("2026-07-22", "Novel, session two.", "novel");
  seed("2026-07-23", "A pre-v3.1.0 entry with no workspace.");

  // Filter case differs from the recorded project name on purpose.
  const filtered = recent({ project: "Novel" }).entries;
  assert.deepEqual(
    filtered.map((e) => e.summary),
    ["Novel, session two.", "Novel, session one."],
    "exactly the novel entries, still most-recent-first"
  );
  for (const e of filtered) assert.equal(e.workspace!.project, "novel");

  // Ordering is the unfiltered ordering with non-matches removed -- nothing re-sorts.
  const unfilteredOrder = recent().entries.map((e) => e.summary);
  const expected = unfilteredOrder.filter((s) => s.startsWith("Novel"));
  assert.deepEqual(filtered.map((e) => e.summary), expected, "filter only removes; it never re-orders");

  assert.equal(recent({ project: "NOVEL" }).entries.length, 2, "match is case-insensitive in both directions");
  assert.equal(recent({ project: "nov" }).entries.length, 0, "a partial project name is not a match");
  assert.equal(recent({ project: "novel" }).empty, false, "empty still means 'no records at all', not 'no matches'");
});

test("COR-A-010 SCN-006/AC-display-filter (SR-019): a provenance-less entry whose SUMMARY says 'novel' is excluded, never faked into a match", () => {
  // The trap: the legacy entry's text contains the filter term, and a real entry
  // carries project 'novel'. Only provenance may satisfy a provenance filter.
  seed("2026-07-20", "Wrote a novel approach to the novel index.");
  seed("2026-07-21", "Drafted chapter four.", "novel");
  // Same trap on the ref path, which is the other tempting text to match on.
  const abs = path.join(vaultRoot, "Notes", "novel.md");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, "# novel", "utf8");
  captureSession({
    summary: "Touched a note whose path says novel.",
    refs: ["Notes/novel.md"],
    sessionId: "S-path-trap",
    now: new Date("2026-07-22T12:00:00.000Z"),
  });

  const filtered = recent({ project: "novel" }).entries;
  assert.equal(filtered.length, 1, "exactly the one provenance-carrying entry returns");
  assert.equal(filtered[0]!.summary, "Drafted chapter four.");
  assert.ok(filtered[0]!.workspace, "and it matched on its recorded provenance");
  for (const e of filtered) {
    assert.notEqual(e.summary, "Wrote a novel approach to the novel index.", "no summary-text match smuggled in");
    assert.notEqual(e.summary, "Touched a note whose path says novel.", "no ref-path match smuggled in");
  }
  assert.equal(recent().entries.length, 3, "all three are still readable unfiltered -- exclusion is silent, not destructive");
});

test("SCN-006/AC-4 (SR-011): display and filtering do not change instrumentation -- one event per invocation", () => {
  seed("2026-07-21", "Drafted chapter five.", "novel");
  seed("2026-07-22", "Worked on the librarian.", "my-librarian");

  runRecent({ now: new Date("2026-07-22T13:00:00.000Z") });
  runRecent({ project: "novel", now: new Date("2026-07-22T13:05:00.000Z") });
  runRecent({ project: "no-such-project", now: new Date("2026-07-22T13:10:00.000Z") });

  const events = readEvents();
  assert.equal(events.length, 3, "one stateful-use event per librarian-recent call, filtered or not");
  for (const e of events) assert.equal(e.kind, "librarian-recent");
});

test("chavruta finding (SR-019): unicode-normalization-insensitive project matching -- NFD filter matches NFC-stored project", () => {
  seed("2026-07-20", "Journaled at the café.", "café-notes"); // NFC "é"
  // The same name spelled NFD (e + combining acute), as macOS paths and some IMEs produce it.
  const nfd = "café-notes";
  assert.equal(recent({ project: nfd }).entries.length, 1, "NFD filter matches the NFC-stored project");
  assert.equal(recent({ project: "CAFÉ-NOTES" }).entries.length, 1, "case folding still composes with normalization");
  assert.equal(recent({ project: "cafe-notes" }).entries.length, 0, "an accent-stripped name is a DIFFERENT project, not a match");
});
