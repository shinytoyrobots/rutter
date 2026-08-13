import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  parsePositionDirective,
  findEmptyStancePositionDirective,
  deriveRevises,
  deriveRefPaths,
} from "../src/position-directive.js";
import { parseSessionDirective } from "../src/directive.js";

// SCN-010: the client-authored position directive, extracted with no inference
// (INV-6) -- the position-write-path counterpart of directive.test.ts.

test("SR-047: extracts kind, topic-key, and stance from a well-formed directive", () => {
  const text = `blah\n<!-- librarian-position POSITION assert my-topic: I think X because Y. -->\ntrailing`;
  const d = parsePositionDirective(text);
  assert.deepEqual(d, {
    kind: "assert",
    topicKey: "my-topic",
    rawStance: " I think X because Y.",
    topicKeyNonKebab: false,
  });
});

test("SR-047: all four kinds route", () => {
  for (const kind of ["assert", "revise", "reaffirm", "retire"] as const) {
    const d = parsePositionDirective(`<!-- librarian-position POSITION ${kind} t: stance -->`);
    assert.equal(d?.kind, kind);
  }
});

test("the LAST position directive wins (mirrors the session directive's rule)", () => {
  const text =
    `<!-- librarian-position POSITION assert t: draft -->\n<!-- librarian-position POSITION assert t: final -->`;
  assert.equal(parsePositionDirective(text)!.rawStance.trim(), "final");
});

test("no librarian-position comment present yields null", () => {
  assert.equal(parsePositionDirective("an ordinary transcript with no directive"), null);
});

test("SR-047 (malformed-kind handling, 2026-08-12 panel gap): an unrecognized kind yields null, never a directive", () => {
  assert.equal(parsePositionDirective(`<!-- librarian-position POSITION maybe my-topic: a stance -->`), null);
});

test("a missing colon (no topic-key boundary) yields null", () => {
  assert.equal(parsePositionDirective(`<!-- librarian-position POSITION assert not-a-directive -->`), null);
});

test("SR-057: an empty stance after a well-formed topic-key colon yields null", () => {
  assert.equal(parsePositionDirective(`<!-- librarian-position POSITION assert my-topic: -->`), null);
});

test("SR-057: a whitespace-only stance yields null", () => {
  assert.equal(parsePositionDirective(`<!-- librarian-position POSITION assert my-topic:    -->`), null);
});

test("SR-057: a non-empty stance of any length (even one char) is a valid directive", () => {
  const d = parsePositionDirective(`<!-- librarian-position POSITION assert my-topic: X -->`);
  assert.ok(d, "one non-whitespace character is enough -- SR-054's budget is advisory, never a minimum");
  assert.equal(d!.rawStance.trim(), "X");
});

test("gen-4/var-1-graft Fix 1 (SR-057): an empty stance is detected as the empty-stance case, for the caller's stderr diagnostic", () => {
  const found = findEmptyStancePositionDirective(`<!-- librarian-position POSITION assert my-topic: -->`);
  assert.deepEqual(found, { kind: "assert", topicKey: "my-topic" });
});

test("gen-4/var-1-graft Fix 1 (SR-057): a whitespace-only stance is also detected as the empty-stance case", () => {
  const found = findEmptyStancePositionDirective(`<!-- librarian-position POSITION retire my-topic:    -->`);
  assert.deepEqual(found, { kind: "retire", topicKey: "my-topic" });
});

test("gen-4/var-1-graft Fix 1: a valid, non-empty directive is NOT the empty-stance case", () => {
  assert.equal(findEmptyStancePositionDirective(`<!-- librarian-position POSITION assert my-topic: a real stance -->`), null);
});

test("gen-4/var-1-graft Fix 1: an absent comment is NOT the empty-stance case (stays silent, per decision-ledger.md D3)", () => {
  assert.equal(findEmptyStancePositionDirective("an ordinary transcript with no directive"), null);
});

test("gen-4/var-1-graft Fix 1: an unrecognized kind is NOT the empty-stance case (D3's malformed-kind reading is unchanged)", () => {
  assert.equal(findEmptyStancePositionDirective(`<!-- librarian-position POSITION maybe my-topic: -->`), null);
});

test("SR-053: a non-kebab-case topic key is flagged, never rejected", () => {
  const d = parsePositionDirective(`<!-- librarian-position POSITION assert My_Topic: a stance -->`);
  assert.ok(d);
  assert.equal(d!.topicKey, "My_Topic", "stored verbatim");
  assert.equal(d!.topicKeyNonKebab, true, "flagged for the caller to report on stderr");
});

test("SR-053: a proper kebab-case topic key is not flagged", () => {
  const d = parsePositionDirective(`<!-- librarian-position POSITION assert my-real-topic-2: a stance -->`);
  assert.equal(d!.topicKeyNonKebab, false);
});

test("gen-4/var-1-graft Fix 2 (SR-053): a whitespace-bearing topic key is ACCEPTED, not rejected -- stored verbatim, flagged non-kebab", () => {
  const d = parsePositionDirective(`<!-- librarian-position POSITION assert My Topic!!: some stance -->`);
  assert.ok(d, "a topic key containing whitespace is a valid directive, never rejected as 'not a directive at all'");
  assert.equal(d!.topicKey, "My Topic!!", "stored byte-verbatim, exactly as written");
  assert.equal(d!.rawStance.trim(), "some stance");
  assert.equal(d!.topicKeyNonKebab, true, "flagged for the caller to report on stderr, same treatment as any other non-kebab-case key");
});

test("gen-4/var-1-graft Fix 2 (SR-053): the topic-key/stance boundary is still the FIRST colon in the payload, even with a whitespace-bearing key", () => {
  const d = parsePositionDirective(`<!-- librarian-position POSITION revise Topic Name: stance mentioning a: colon later -->`);
  assert.ok(d);
  assert.equal(d!.topicKey, "Topic Name", "the key stops at the first colon; the grammar's topic-key/stance boundary is unchanged by Fix 2");
  assert.equal(d!.rawStance.trim(), "stance mentioning a: colon later");
});

test("SR-052: deriveRevises finds an explicit revises annotation without removing it from the stance", () => {
  const stance = " I now think Y (revises: 20260810T120000000Z) because of new evidence.";
  assert.equal(deriveRevises(stance), "20260810T120000000Z");
});

test("SR-052: deriveRevises returns undefined when no annotation is present", () => {
  assert.equal(deriveRevises(" a plain stance with no supersession pointer"), undefined);
});

test("SR-048: deriveRefPaths extracts every [[wikilink]] token from the stance", () => {
  const stance = " Based on [[Notes/foo.md]] and also [[Notes/bar.md]], I think X.";
  assert.deepEqual(deriveRefPaths(stance), ["Notes/foo.md", "Notes/bar.md"]);
});

test("SR-048: deriveRefPaths returns an empty list when the stance names nothing", () => {
  assert.deepEqual(deriveRefPaths(" just prose, no links"), []);
});

test("position and session directives are independently extracted (SR-055 isolation): one tag never affects the other's parse", () => {
  const text = [
    `<!-- librarian-session {"summary":"Decided X."} -->`,
    `<!-- librarian-position POSITION assert my-topic: stance -->`,
  ].join("\n");
  const session = parseSessionDirective(text);
  const position = parsePositionDirective(text);
  assert.equal(session?.summary, "Decided X.", "session directive is unaffected by the position comment sharing the transcript");
  assert.equal(position?.kind, "assert", "position directive is unaffected by the session comment sharing the transcript");
});

test("SR-047: the README's own quoted position example is not itself capturable when unfilled", () => {
  const readme = readFileSync(path.join(import.meta.dirname, "..", "README.md"), "utf8");
  const block = readme.slice(readme.indexOf("<!-- BEGIN capture-contract -->"), readme.indexOf("<!-- END capture-contract -->"));
  // The README's block quotes SERVER_INSTRUCTIONS' generic grammar template
  // (kind alternatives separated by `|`), which cannot itself match a single
  // literal kind -- so, like the session example, it captures nothing.
  assert.equal(parsePositionDirective(block), null);
});
