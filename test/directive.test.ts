import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
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

test("SR-029: an unfilled <angle-bracketed> template yields null, not a junk entry", () => {
  // v3.4.0 ships the literal syntax in SERVER_INSTRUCTIONS, the README and the docs,
  // so the template is now in front of clients and users constantly -- and copying it
  // unfilled parses as valid JSON with a non-empty summary. Without this guard the
  // record fills with "<one plain-English line>".
  const template = `<!-- librarian-session {"summary":"<one plain-English line>","refs":["<paths touched, relative to the knowledge base>"]} -->`;
  assert.equal(parseSessionDirective(template), null);
  // A real summary that merely CONTAINS angle brackets is unaffected -- only a
  // summary that is entirely one bracketed placeholder is refused.
  const real = `<!-- librarian-session {"summary":"Chose A <over> B for the parser."} -->`;
  assert.equal(parseSessionDirective(real)!.summary, "Chose A <over> B for the parser.");
});

test("SR-029: the README's own quoted example is not capturable", () => {
  // Belt-and-braces on the doc-copied-into-a-session path: whatever example the
  // shipped contract shows, feeding it through the parser must capture nothing.
  const readme = readFileSync(path.join(import.meta.dirname, "..", "README.md"), "utf8");
  const block = readme.slice(readme.indexOf("<!-- BEGIN capture-contract -->"), readme.indexOf("<!-- END capture-contract -->"));
  assert.equal(parseSessionDirective(block), null, "the documented template captures nothing until filled in");
});
