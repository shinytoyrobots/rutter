import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSessionDirective } from "../src/directive.js";

// The directive is how the CLIENT hands a curated line to the (inference-free)
// hook; these cover the extraction contract that feeds SCN-001 capture.

test("extracts summary and refs from a well-formed directive", () => {
  const text = `blah blah\n<!-- librarian-session {"summary":"Decided X.","refs":["Notes/x.md"]} -->\ntrailing`;
  const d = parseSessionDirective(text);
  assert.deepEqual(d, { summary: "Decided X.", refs: ["Notes/x.md"] });
});

test("the LAST directive wins (reflects the session's final outcome)", () => {
  const text =
    `<!-- librarian-session {"summary":"draft"} -->\n<!-- librarian-session {"summary":"final"} -->`;
  assert.equal(parseSessionDirective(text)!.summary, "final");
});

test("no directive present yields null (feeds the SR-004 no-op path)", () => {
  assert.equal(parseSessionDirective("an ordinary transcript with no directive"), null);
});

test("an empty-summary directive yields null", () => {
  assert.equal(parseSessionDirective(`<!-- librarian-session {"summary":"   "} -->`), null);
});

test("a malformed (non-JSON) directive yields null rather than throwing", () => {
  assert.equal(parseSessionDirective(`<!-- librarian-session not json at all -->`), null);
});
