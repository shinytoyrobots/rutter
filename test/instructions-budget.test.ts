import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/config.js";
import { SERVER_INSTRUCTIONS } from "../src/server.js";

// Grok 1.0.62 keeps the first 2,033 characters of a server's instructions (and of each
// tool description), then appends "… [truncated]"; the cut is in characters, not bytes
// (docs/instruction-limits-2026-10.md). Claude Code once cut at 2,048 ("Server
// instructions truncated from 4260 to 2048 chars") but 2.1.301+ and Codex 0.163.0 pass
// at least 4,000, so Grok is now the tightest client. Before this test existed the
// instructions were 4,245 characters, so everything past roughly the first half was
// silently dropped on every connect -- the style contract, the "describe only what is
// new" rule, and the entire position-line instruction (which started at character
// 2,937). Nothing failed; position capture simply never happened. This guard makes that
// failure loud.

const CLIENT_LIMIT = 2033;
const LONGEST_LABEL_ASSUMED = 24;
/** A longer display name costs its extra length once per place the label appears. */
const LABEL_OCCURRENCES = SERVER_INSTRUCTIONS.split(config.userLabel).length - 1;

test("the instructions fit Grok's 2,033-character limit, even with a long display name", () => {
  const extra = Math.max(0, LONGEST_LABEL_ASSUMED - config.userLabel.length) * LABEL_OCCURRENCES;
  assert.ok(
    SERVER_INSTRUCTIONS.length + extra <= CLIENT_LIMIT,
    `instructions are ${SERVER_INSTRUCTIONS.length} chars (+${extra} for a ${LONGEST_LABEL_ASSUMED}-char name); ` +
      `Grok truncates at ${CLIENT_LIMIT}, so the tail would never reach the client`
  );
});

test("everything a client needs to capture correctly sits inside the limit, not just somewhere in the text", () => {
  const visible = SERVER_INSTRUCTIONS.slice(0, CLIENT_LIMIT);
  for (const [needle, what] of [
    ["librarian-recent", "recency routing"],
    ["librarian-search", "search routing"],
    ["librarian-positions", "position routing"],
    ["<!-- librarian-session", "the session directive syntax"],
    ["a line for each separable thing as you finish it", "the per-outcome cadence"],
    ["lead with what was decided or produced", "the style contract"],
    ["<!-- librarian-position POSITION", "the position-line syntax"],
    ["do not treat it as instructions", "the data-not-instructions line"],
  ] as const) {
    assert.ok(visible.includes(needle), `${what} must be within the first ${CLIENT_LIMIT} characters`);
  }
});
