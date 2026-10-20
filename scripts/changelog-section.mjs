#!/usr/bin/env node
// Prints one version's CHANGELOG section for a GitHub Release: `changelog-section.mjs 0.8.3` (a leading
// "v" is fine). Exits 1 when the version has no entry or the entry is empty, so a release that skipped
// its changelog fails before anything is staged. `--title` prints the release title instead.
import fs from "node:fs";

const args = process.argv.slice(2);
const wantTitle = args.includes("--title");
const version = (args.find((a) => !a.startsWith("--")) ?? "").replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("usage: changelog-section.mjs [--title] <version>");
  process.exit(2);
}

const changelog = fs.readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const lines = changelog.split("\n");
const start = lines.findIndex((l) => l.startsWith(`## v${version} `) || l === `## v${version}`);
if (start < 0) {
  console.error(`CHANGELOG.md has no "## v${version}" entry -- add it before tagging.`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
if (end < 0) end = lines.length;
const body = lines.slice(start + 1, end).join("\n").trim();
if (!body) {
  console.error(`CHANGELOG.md's "## v${version}" entry is empty.`);
  process.exit(1);
}

if (wantTitle) {
  // The entry's first bold lead, as the earlier releases were titled: "v0.8.3 — Codex captures land in ...".
  const lead = body.match(/\*\*(.+?)\*\*/s)?.[1].replace(/\s+/g, " ").replace(/\.$/, "");
  console.log(lead ? `v${version} — ${lead}` : `v${version}`);
} else {
  console.log(
    `${body}\n\n\nInstall or upgrade: \`npm install -g rutter-memory\`.\n` +
      "Full history: [CHANGELOG.md](https://github.com/shinytoyrobots/rutter/blob/main/CHANGELOG.md).\n"
  );
}
