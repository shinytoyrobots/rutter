import { resetLibrarian, increments } from "./setup.js";
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

test("COR-R-030 SCN-006/AC-no-user-authored-contract (SR-025/SR-026): the instructions carry the emission trigger AND the literal directive syntax", () => {
  // The v3.4.0 finding: before this, SERVER_INSTRUCTIONS carried the STYLE contract
  // but neither the trigger nor the syntax, so a client with no CLAUDE.md rule knew
  // a directive existed and how to style it -- but not to write one, nor its format.
  // Capture therefore only worked for the one person who had hand-installed the rule.
  assert.match(
    SERVER_INSTRUCTIONS,
    /When a session decides or produces something worth recalling later/,
    "SR-025: states WHEN a directive is to be emitted"
  );
  assert.match(SERVER_INSTRUCTIONS, /emit one directive line/, "SR-025: states THAT one is emitted");
  assert.match(SERVER_INSTRUCTIONS, /omit trivial work entirely/, "SR-025: and when not to");
  assert.match(
    SERVER_INSTRUCTIONS,
    /a line for each separable thing as you finish it/,
    "SR-025 (v3.7.0): the trigger is per outcome, and the cadence lives in the trigger paragraph"
  );
  // SR-026: the literal syntax the capture path actually parses. Asserted against
  // directive.ts's own regex rather than a hand-copied string, so the instructions
  // cannot describe a format the parser would reject.
  const example = SERVER_INSTRUCTIONS.match(/<!--\s*librarian-session\s+([\s\S]*?)-->/);
  assert.ok(example, "SR-026: includes a literal <!-- librarian-session ... --> example");
  const payload = JSON.parse(example[1]!.trim());
  assert.ok("summary" in payload, "the example's JSON carries a summary key the parser expects");
  assert.ok("refs" in payload, "and a refs key");
});

/**
 * SR-035 (v3.7.0). Until this version the instructions said BOTH "at the end of any
 * session ... emit exactly one directive line" (SR-025) and "emit a line for each as
 * you finish it" (SR-021) and "if you emit another directive later in the same
 * session" (SR-033). A client told it gets one line at the end packs the whole
 * session into that line -- which is what the 141-192 word entries of 2026-08-02..04
 * were. This guard exists so the two halves cannot drift back apart: the contract may
 * describe a per-outcome cadence, and may not describe a per-session one.
 */
test("COR-R-034 SCN-006/AC-per-outcome-trigger (SR-035): the contract never claims one-per-session or end-of-session emission", () => {
  const banned: [RegExp, string][] = [
    [/exactly one directive/i, "a one-per-session count"],
    [/\bat the end of (any|a|the) session\b/i, "end-of-session timing"],
    [/one directive per session/i, "a one-per-session count, stated directly"],
    [/one (summary|line) per session/i, "a one-per-session count, stated as a line count"],
  ];
  for (const [pattern, what] of banned) {
    assert.equal(
      pattern.test(SERVER_INSTRUCTIONS),
      false,
      `the instructions must not imply ${what} (matched ${pattern}) -- see SR-035`
    );
  }

  // And the positive half: the per-outcome cadence is actually stated, so this test
  // cannot be satisfied by an instruction set that says nothing about cadence at all.
  assert.match(
    SERVER_INSTRUCTIONS,
    /a line for each separable thing as you finish it/,
    "the per-outcome cadence is stated"
  );

  // The same prohibition applies to the README's quoted copy, since a reader takes the
  // contract from whichever they read first.
  const readme = fs.readFileSync(path.join(import.meta.dirname, "..", "README.md"), "utf8");
  const quoted = readme.slice(
    readme.indexOf("<!-- BEGIN capture-contract -->"),
    readme.indexOf("<!-- END capture-contract -->")
  );
  for (const [pattern, what] of banned) {
    assert.equal(pattern.test(quoted), false, `README's quoted contract must not imply ${what}`);
  }
});

test("COR-R-030 SCN-006/AC-single-source (SR-027): README and docs quote the contract, and drift is a failure", () => {
  // SERVER_INSTRUCTIONS is authoritative. Before v3.4.0 the contract lived in four
  // hand-maintained copies (server, README, docs, a user's global CLAUDE.md) and
  // they had already drifted. This test is what makes "single source" enforceable.
  const repoRoot = path.join(import.meta.dirname, "..");
  const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
  const docs = fs.readFileSync(path.join(repoRoot, "docs", "memory-of-use.md"), "utf8");

  // Every sentence of the authoring contract must appear verbatim in the README's
  // quoted block. Compared sentence-by-sentence so a failure names the drifted line
  // rather than just reporting "the blocks differ".
  const contract = SERVER_INSTRUCTIONS.slice(SERVER_INSTRUCTIONS.indexOf("When a session decides or produces"));
  const authoring = contract.slice(0, contract.indexOf("When you report recalled summaries back"));
  const quoted = readme.slice(readme.indexOf("<!-- BEGIN capture-contract -->"), readme.indexOf("<!-- END capture-contract -->"));
  assert.ok(quoted.length > 0, "README carries a delimited capture-contract block");
  for (const sentence of authoring.split("\n").map((s) => s.trim()).filter((s) => s !== "")) {
    assert.ok(
      quoted.includes(sentence),
      `README's quoted contract has drifted from SERVER_INSTRUCTIONS; missing verbatim:\n  ${sentence}`
    );
  }

  // Neither doc may still present a CLAUDE.md rule as a required install step
  // (SR-028). Naming it as an explicit fallback is fine, and the README does.
  assert.match(readme, /nothing to add to your `CLAUDE\.md`/i, "README states no CLAUDE.md edit is needed");
  assert.match(docs, /nothing to add to your `CLAUDE\.md`/i, "docs state the same");
  assert.equal(
    /Add a standing rule to your\s+global `~\/\.claude\/CLAUDE\.md`/.test(readme),
    false,
    "the old 'add a standing rule to your global CLAUDE.md' install step is gone"
  );
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

  const rendered = increments(recent()).map(formatRecentEntry);
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
  const filtered = increments(recent({ project: "Novel" }));
  assert.deepEqual(
    filtered.map((e) => e.summary),
    ["Novel, session two.", "Novel, session one."],
    "exactly the novel entries, still most-recent-first"
  );
  for (const e of filtered) assert.equal(e.workspace!.project, "novel");

  // Ordering is the unfiltered ordering with non-matches removed -- nothing re-sorts.
  const unfilteredOrder = increments(recent()).map((e) => e.summary);
  const expected = unfilteredOrder.filter((s) => s.startsWith("Novel"));
  assert.deepEqual(filtered.map((e) => e.summary), expected, "filter only removes; it never re-orders");

  assert.equal(increments(recent({ project: "NOVEL" })).length, 2, "match is case-insensitive in both directions");
  assert.equal(increments(recent({ project: "nov" })).length, 0, "a partial project name is not a match");
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

  const filtered = increments(recent({ project: "novel" }));
  assert.equal(filtered.length, 1, "exactly the one provenance-carrying entry returns");
  assert.equal(filtered[0]!.summary, "Drafted chapter four.");
  assert.ok(filtered[0]!.workspace, "and it matched on its recorded provenance");
  for (const e of filtered) {
    assert.notEqual(e.summary, "Wrote a novel approach to the novel index.", "no summary-text match smuggled in");
    assert.notEqual(e.summary, "Touched a note whose path says novel.", "no ref-path match smuggled in");
  }
  assert.equal(increments(recent()).length, 3, "all three are still readable unfiltered -- exclusion is silent, not destructive");
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
  assert.equal(increments(recent({ project: nfd })).length, 1, "NFD filter matches the NFC-stored project");
  assert.equal(increments(recent({ project: "CAFÉ-NOTES" })).length, 1, "case folding still composes with normalization");
  assert.equal(increments(recent({ project: "cafe-notes" })).length, 0, "an accent-stripped name is a DIFFERENT project, not a match");
});
