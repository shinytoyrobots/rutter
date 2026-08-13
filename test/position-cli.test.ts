import { resetLibrarian, readSession, readPositions, positionsExist, vaultRoot, sessionsDir } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { SERVER_INSTRUCTIONS } from "../src/server.js";
import { parsePositionDirective } from "../src/position-directive.js";

/**
 * SCN-010 at the REAL Stop-hook entry point (capture-cli.ts), mirroring
 * capture.test.ts's "hammer the full hook path" tests. This is where the
 * dispatch's MANDATORY SR-055 byte-compare regression test lives: a
 * session-record byte-compare before/after a position capture, run through
 * the actual CLI both directives share.
 */

beforeEach(resetLibrarian);

const cli = fileURLToPath(new URL("../src/capture-cli.ts", import.meta.url));

function fire(stdin: string): { status: number | null; stderr: string; stdout: string } {
  const res = spawnSync(process.execPath, ["--import", "tsx", cli], {
    input: stdin,
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `hook exits clean; stderr: ${res.stderr}`);
  assert.equal(res.stdout, "", "the hook writes nothing to stdout (INV-5)");
  return { status: res.status, stderr: res.stderr, stdout: res.stdout };
}

test("SR-055 (MANDATORY regression, dispatch requirement): a session record is byte-identical before/after a position capture", () => {
  // Fires the SAME session directive (same sessionId + summary) TWICE, adding
  // a position directive only on the SECOND firing. SR-013 makes the second
  // session-directive firing an idempotent no-op regardless of anything else
  // in the payload, so the day file after firing 2 must be byte-identical to
  // after firing 1 -- deliberately avoiding a real-clock timestamp comparison
  // across two genuinely distinct captures, which would never be byte-equal
  // even absent any position-capture interaction.
  const day = new Date().toISOString().slice(0, 10); // child uses the real clock
  const month = new Date().toISOString().slice(0, 7);
  const dayFile = path.join(sessionsDir, `${day}.md`);

  fire(JSON.stringify({ summary: "An ordinary session summary.", sessionId: "S-baseline" }));
  const afterFirst = fs.readFileSync(dayFile, "utf8");

  fire(
    JSON.stringify({
      summary: "An ordinary session summary.", // unchanged content -> SR-013 no-op for the session path
      sessionId: "S-baseline",
      position: "assert my-topic: I formed a stance this session.",
    })
  );
  const afterSecond = fs.readFileSync(dayFile, "utf8");

  assert.equal(afterSecond, afterFirst, "session-record@1 bytes are unchanged by the presence of a position capture (SR-055)");
  assert.equal(matter(afterSecond).data.schema, "session-record@1", "schema id itself is untouched");
  assert.ok(positionsExist(month), "and the position DID land, in its own separate stream -- proving this isn't a no-op skip");
});

test("SR-047/SR-048: a position directive lands via the real Stop-hook transcript path", () => {
  const transcriptPath = path.join(vaultRoot, "cc-transcript-position.jsonl");
  const directive = "<!-- librarian-position POSITION assert decision-graph-shape: A separate stream is cleaner than extending session-record. -->";
  fs.writeFileSync(transcriptPath, JSON.stringify({ message: { content: directive } }), "utf8");

  const month = new Date().toISOString().slice(0, 7);
  const { stderr } = fire(JSON.stringify({ transcript_path: transcriptPath, session_id: "S-cli-1" }));
  assert.match(stderr, /captured 1 position event \(assert decision-graph-shape\)/);

  const raw = readPositions(month);
  const stream = matter(raw).data as { events: { topic_key: string; stance: string }[] };
  assert.equal(stream.events.length, 1);
  assert.equal(stream.events[0]!.topic_key, "decision-graph-shape");
  assert.equal(stream.events[0]!.stance, "A separate stream is cleaner than extending session-record.");
});

test("SR-057: a directive with an empty stance is a clean no-op through the real hook -- nothing appended to either stream, but a stderr diagnostic IS emitted (gen-4/var-1-graft Fix 1)", () => {
  const transcriptPath = path.join(vaultRoot, "cc-transcript-empty-stance.jsonl");
  fs.writeFileSync(transcriptPath, JSON.stringify({ message: { content: "<!-- librarian-position POSITION assert my-topic: -->" } }), "utf8");
  const day = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  const { stderr } = fire(JSON.stringify({ transcript_path: transcriptPath, session_id: "S-empty" }));

  assert.equal(fs.existsSync(path.join(sessionsDir, `${day}.md`)), false, "no session file (there was no session directive either)");
  assert.equal(positionsExist(month), false, "no position file created for an empty-stance directive");
  assert.match(
    stderr,
    /position directive \(assert my-topic\) has an empty or whitespace-only stance.*SR-057/,
    "Fix 1: the malformed/empty directive now names what was empty on stderr, ported from gen-3/var-1-convention"
  );
});

test("gen-4/var-1-graft Fix 1: the ORDINARY no-position-directive turn stays silent (no false-positive diagnostic)", () => {
  const { stderr } = fire(JSON.stringify({ summary: "An ordinary session summary, no position at all.", sessionId: "S-no-position" }));
  assert.doesNotMatch(stderr, /empty or whitespace-only stance/, "no position directive was present at all -- D3's silent case, unaffected by Fix 1");
});

test("gen-4/var-1-graft Fix 2 (SR-053): a whitespace-bearing topic key is accepted, stored verbatim, and reported -- through the real hook", () => {
  const { stderr } = fire(JSON.stringify({ sessionId: "S-ws-topic", position: "assert My Topic!!: some stance" }));
  assert.match(stderr, /captured 1 position event \(assert My Topic!!\)/, "accepted, not rejected as 'not a directive at all'");
  assert.match(stderr, /topic key "My Topic!!" is not kebab-case/, "same report-not-enforce treatment as any other non-kebab-case key");
  const month = new Date().toISOString().slice(0, 7);
  const stream = matter(readPositions(month)).data as { events: { topic_key: string; stance: string }[] };
  assert.equal(stream.events[0]!.topic_key, "My Topic!!", "stored byte-verbatim, whitespace and all");
  assert.equal(stream.events[0]!.stance, "some stance");
});

test("SR-053: a non-kebab-case topic key is reported on stderr and still captured", () => {
  const { stderr } = fire(JSON.stringify({ sessionId: "S-kebab", position: "assert My_Topic: a stance" }));
  assert.match(stderr, /topic key "My_Topic" is not kebab-case/);
  assert.match(stderr, /captured 1 position event/);
});

test("SR-054: an over-ceiling stance is reported on stderr and still stored verbatim", () => {
  const dense = Array.from({ length: 90 }, (_, i) => `w${i}`).join(" ");
  const { stderr } = fire(JSON.stringify({ sessionId: "S-dense", position: `assert t: ${dense}` }));
  assert.match(stderr, /stance is 90 words/);
  const month = new Date().toISOString().slice(0, 7);
  const stream = matter(readPositions(month)).data as { events: { stance: string }[] };
  assert.equal(stream.events[0]!.stance, dense, "stored verbatim, not truncated");
});

test("SR-049: five Stop re-firings of the SAME position directive leave the stream byte-identical, one event", () => {
  const payload = JSON.stringify({ sessionId: "S-idem", position: "assert t: a stable stance" });
  fire(payload);
  const month = new Date().toISOString().slice(0, 7);
  const afterFirst = readPositions(month);
  for (let i = 0; i < 4; i++) fire(payload);
  assert.equal(readPositions(month), afterFirst, "byte-identical after 5 firings");
  const stream = matter(afterFirst).data as { events: unknown[] };
  assert.equal(stream.events.length, 1);
});

test("SR-056: SERVER_INSTRUCTIONS carries the position directive's trigger and its literal, parseable grammar", () => {
  assert.match(
    SERVER_INSTRUCTIONS,
    /form, change, reaffirm, or retire a stance/,
    "states the emission trigger"
  );
  const example = SERVER_INSTRUCTIONS.match(/<!--\s*librarian-position\s+([\s\S]*?)-->/);
  assert.ok(example, "includes a literal <!-- librarian-position ... --> example");
  // The template's kind slot is the generic alternation (never parses on its
  // own -- see position-directive.test.ts); substitute one real kind and
  // confirm the REST of the shown grammar is what the parser actually accepts.
  const filled = example![1]!.replace("assert|revise|reaffirm|retire", "assert").replace("<topic-key>", "shown-grammar-topic").replace("<stance>", "the shown grammar really parses");
  const parsed = parsePositionDirective(`<!-- librarian-position ${filled} -->`);
  assert.ok(parsed, "the documented grammar, with placeholders filled, is accepted by the real parser");
  assert.equal(parsed!.kind, "assert");
  assert.equal(parsed!.topicKey, "shown-grammar-topic");
});
