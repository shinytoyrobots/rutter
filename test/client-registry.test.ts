import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { CLIENTS, isClient, parseExplicitIdentity } from "../src/client.js";
import { CLIENT_CAPABILITIES, RECALL_ONLY_ROW } from "../src/client-registry.js";

const read = (rel: string) => fs.readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), "utf8");
const SURFACES = ["docs/index.md", "docs/getting-started.md", "README.md"] as const;

/** Rows of the "You use | Follow | What it takes" table: name, anchor, what it takes. */
function clientTable(md: string): Map<string, { anchor: string; whatItTakes: string }> {
  const rows = new Map<string, { anchor: string; whatItTakes: string }>();
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^\|\s*You use\s*\|\s*Follow\s*\|/.test(l));
  assert.notEqual(start, -1, "client table not found");
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    const [name, follow, takes] = line.split("|").slice(1, 4).map((c) => c.trim());
    const anchor = /\(([^)]*)\)/.exec(follow)?.[1].split("#")[1] ?? "";
    rows.set(name, { anchor, whatItTakes: takes });
  }
  return rows;
}

/** The text of a getting-started section, from its heading anchor to the next `## `. */
function section(md: string, anchor: string): string {
  const heading = md.split("\n").findIndex((l) => l.startsWith("## ") && slug(l.slice(3)) === anchor);
  assert.notEqual(heading, -1, `no section for #${anchor}`);
  const rest = md.split("\n").slice(heading + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return rest.slice(0, end === -1 ? undefined : end).join("\n");
}
const slug = (h: string) => h.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/ /g, "-");

test("registry keys equal the capture identity set", () => {
  assert.deepEqual(Object.keys(CLIENT_CAPABILITIES).sort(), [...CLIENTS].sort());
});

test("the recall-only row is not a capture identity", () => {
  assert.equal(RECALL_ONLY_ROW.capture, false);
  for (const key of ["mcp", "recall-only", RECALL_ONLY_ROW.anchor, RECALL_ONLY_ROW.name]) {
    assert.equal(isClient(key), false, key);
    assert.deepEqual(parseExplicitIdentity(key), { kind: "unrecognized" });
  }
  assert.equal(Object.keys(CLIENT_CAPABILITIES).includes(RECALL_ONLY_ROW.anchor), false);
});

for (const surface of SURFACES) {
  test(`${surface} agrees with the registry on every client`, () => {
    const rows = clientTable(read(surface));
    const expected = [...Object.values(CLIENT_CAPABILITIES), RECALL_ONLY_ROW];
    for (const c of expected) {
      const row = rows.get(c.name);
      assert.ok(row, `${surface}: no row for ${c.name}`);
      assert.equal(row.anchor, c.anchor, `${surface}: ${c.name} anchor`);
      assert.equal(row.whatItTakes, c.whatItTakes, `${surface}: ${c.name} requirements`);
    }
    for (const q of new Set(Object.values(CLIENT_CAPABILITIES).map((c) => c.qualification).filter(Boolean))) {
      assert.ok(read(surface).includes(`known-issues.md#${q}`), `${surface}: missing qualification link #${q}`);
    }
  });
}

test("each setup path states what the registry says", () => {
  const gs = read("docs/getting-started.md");
  for (const c of Object.values(CLIENT_CAPABILITIES)) {
    const text = section(gs, c.anchor);
    if (c.name !== "Claude Code") {
      assert.ok(text.includes(`Verified with`) && text.includes(c.lastVerified.version), `${c.name}: verified version ${c.lastVerified.version}`);
    }
    const mentionsFile = /instructions file|rule file|AGENTS\.md/.test(text);
    if (c.instructionsFile) assert.ok(mentionsFile, `${c.name}: path never mentions its instructions file`);
    assert.ok(/capture/i.test(text) && /recall/i.test(text), `${c.name}: path lacks a capture or recall check`);
  }
});
