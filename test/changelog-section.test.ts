import "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.join(import.meta.dirname, "..", "scripts", "changelog-section.mjs");
const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
const version = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "package.json"), "utf8")).version;

test("the current package version has a CHANGELOG entry the release can use", () => {
  const notes = run(`v${version}`);
  assert.equal(notes.status, 0, notes.stderr);
  assert.match(notes.stdout, /^- \*\*/, "the section is the entry's body, not the next version's");
  assert.doesNotMatch(notes.stdout, /^## /m);
  assert.match(run("--title", version).stdout, new RegExp(`^v${version.replaceAll(".", "\\.")} — \\S`));
});

test("a version with no CHANGELOG entry fails the release", () => {
  const res = run("v99.99.99");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /no "## v99\.99\.99" entry/);
  assert.equal(run("nonsense").status, 2);
});
