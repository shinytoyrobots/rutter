// site-drift: has the published docs site gone stale against its sources?
//
// The gh-pages site carries a sources.json recording the content hash of each
// repo doc it was built from — the site's own versioned reference, the same
// move a session record makes. This script compares those recorded hashes
// against the docs as they stand here and names any drift.
//
// Usage: npm run site-drift        (run from a checkout with the gh-pages ref;
//                                   `git fetch origin gh-pages` first if stale)
// Exit codes: 0 site matches, 1 drift found, 2 no manifest reachable.
//
// This is repo tooling, not librarian behavior: it may run git, unlike the
// server (INV-1 applies to the server, not to maintenance scripts).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

let raw = null;
let readFrom = null;
for (const ref of ["origin/gh-pages", "gh-pages"]) {
  try {
    raw = execFileSync("git", ["show", `${ref}:sources.json`], { encoding: "utf8" });
    readFrom = ref;
    break;
  } catch {
    // try the next ref
  }
}

if (raw === null) {
  console.error(
    "[site-drift] no sources.json found on origin/gh-pages or gh-pages.\n" +
    "            Run `git fetch origin gh-pages` and try again."
  );
  process.exit(2);
}

const manifest = JSON.parse(raw);
console.log(`[site-drift] manifest from ${readFrom} (site built from ${manifest.builtFrom}, ${manifest.generated})\n`);

let drifted = 0;
for (const [file, recorded] of Object.entries(manifest.sources)) {
  let current;
  try {
    current = "sha256:" + createHash("sha256").update(readFileSync(file)).digest("hex");
  } catch {
    console.log(`  MISSING  ${file}  (recorded ${recorded.slice(0, 17)}…, no such file here)`);
    drifted += 1;
    continue;
  }
  if (current === recorded) {
    console.log(`  ok       ${file}`);
  } else {
    console.log(`  DRIFT    ${file}`);
    console.log(`           site built from ${recorded.slice(0, 24)}…`);
    console.log(`           this tree is at ${current.slice(0, 24)}…`);
    drifted += 1;
  }
}

if (drifted > 0) {
  console.log(
    `\n[site-drift] ${drifted} source(s) drifted — the published site is stale.` +
    `\n            Update the gh-pages pages, refresh sources.json with the new` +
    `\n            hashes and build commit, and push.`
  );
  process.exit(1);
}

console.log(`\n[site-drift] site matches these sources.`);
