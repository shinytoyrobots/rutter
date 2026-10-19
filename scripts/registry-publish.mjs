// registry-publish: list every approved rutter release in the official MCP Registry.
//
// Run by .github/workflows/registry.yml, never from a laptop. See docs/archived/mcp-registry-plan.md,
// item 2. The npm release workflow only stages a version; it reaches npm once the maintainer
// approves it, and the Registry refuses a version npm doesn't serve yet. So this runs on its
// own, after approval, and reconciles: every release tag that carries server.json and is
// public on npm should be in the Registry, with the metadata that shipped in that tag.
//
// Usage: node scripts/registry-publish.mjs [version]
//   With a version: that release only. Without: every eligible release tag, oldest first.
// Exit codes: 0 nothing failed (including "nothing to do"), 1 at least one version failed.
//
// The Registry refuses a name and version it already has, even with identical metadata, so
// each version is looked up first. Found and matching is success; found but different is a
// failure, because a published version can't be changed (the fix is a new release).

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const SERVER_NAME = "io.github.shinytoyrobots/rutter";
export const NPM_PACKAGE = "rutter-memory";
const REGISTRY = "https://registry.modelcontextprotocol.io";
const SEMVER = /^\d+\.\d+\.\d+$/;

export function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * The Registry's serializer leaves out optional fields that hold their default (isRequired:
 * false, an empty format, ...). Drop false, null, "", [] and {} recursively, on both sides,
 * so an unchanged entry compares equal to the server.json it came from.
 */
export function normalize(value) {
  if (Array.isArray(value)) {
    const out = value.map(normalize).filter((v) => v !== undefined);
    return out.length ? out : undefined;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const v = normalize(value[key]);
      if (v !== undefined) out[key] = v;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === false || value === null || value === "") return undefined;
  return value;
}

/**
 * Where the published entry differs from the local server.json, as dotted paths. Both sides
 * are normalized first, then must match exactly, in both directions: a field on only one
 * side is a difference. So `isSecret: false` locally against `isSecret: true` in the Registry
 * is caught (the false is dropped, the true is not). The Registry stores what was published
 * and adds no fields of its own to `.server` (checked live 2026-10-15: `registryBaseUrl`
 * appears only on entries whose publisher set it), so a two-way match is safe.
 */
export function differences(local, remote, at = "") {
  const l = normalize(local);
  const r = normalize(remote);
  const here = at || "(root)";
  if (l === undefined || r === undefined) return l === r ? [] : [here];
  if (Array.isArray(l) || Array.isArray(r)) {
    if (!Array.isArray(l) || !Array.isArray(r) || r.length !== l.length) return [here];
    return l.flatMap((v, i) => differences(v, r[i], `${at}[${i}]`));
  }
  if (typeof l === "object" || typeof r === "object") {
    if (typeof l !== "object" || typeof r !== "object") return [here];
    const keys = [...new Set([...Object.keys(l), ...Object.keys(r)])].sort();
    return keys.flatMap((k) => differences(l[k], r[k], at ? `${at}.${k}` : k));
  }
  return l === r ? [] : [here];
}

/**
 * Bring the Registry up to date for each candidate version. Every outside effect comes in
 * through `deps`, so tests can stand in for npm, git, the Registry and mcp-publisher.
 *
 * deps.npm          Map of version -> mcpName, for versions public on npm
 * deps.readLocal    (version) => that tag's server.json, parsed
 * deps.lookup       async (version) => the Registry's {server, _meta}, or null if absent
 * deps.publish      async (version, serverJson) => { ok } | { duplicate } | { error }
 * deps.log          (line) => void
 */
export async function reconcile(candidates, deps) {
  const result = { published: [], already: [], pending: [], failed: [] };
  const fail = (v, why) => {
    result.failed.push(v);
    deps.log(`v${v}: FAILED. ${why}`);
  };

  for (const v of [...candidates].sort(compareSemver)) {
    try {
      if (!deps.npm.has(v)) {
        result.pending.push(v);
        deps.log(`v${v}: not approved on npm yet. Skipped; a later run will pick it up.`);
        continue;
      }
      if (deps.npm.get(v) !== SERVER_NAME) {
        fail(v, `npm's ${NPM_PACKAGE}@${v} has mcpName ${JSON.stringify(deps.npm.get(v))}, not ${SERVER_NAME}.`);
        continue;
      }

      const local = deps.readLocal(v);
      const wrong = [
        ["name", local.name, SERVER_NAME],
        ["version", local.version, v],
        ["packages[0].version", local.packages?.[0]?.version, v],
      ].filter(([, found, want]) => found !== want);
      if (wrong.length) {
        fail(v, `server.json in tag v${v} has ${wrong.map(([f, found]) => `${f} ${JSON.stringify(found)}`).join(", ")}.`);
        continue;
      }

      let remote = await deps.lookup(v);
      if (!remote) {
        const outcome = await deps.publish(v, local);
        if (outcome.ok) {
          result.published.push(v);
          deps.log(`v${v}: published to the MCP Registry.`);
          continue;
        }
        if (!outcome.duplicate) {
          fail(v, `mcp-publisher failed: ${outcome.error}`);
          continue;
        }
        // Something else published it between the lookup and the publish. Judge what's there.
        deps.log(`v${v}: the Registry already had it by the time we published. Checking it matches.`);
        remote = await deps.lookup(v);
        if (!remote) {
          fail(v, "the Registry reported a duplicate version but the lookup can't find it.");
          continue;
        }
      }

      const diffs = differences(local, remote.server);
      if (diffs.length) {
        fail(
          v,
          `the Registry already lists this version with different metadata (${diffs.join(", ")}). ` +
            "A published version can't be changed; ship the fix as a new release."
        );
      } else {
        result.already.push(v);
        deps.log(`v${v}: already published, and matches. Nothing to do.`);
      }
    } catch (err) {
      fail(v, err instanceof Error ? err.message : String(err));
    }
  }
  return result;
}

// ---- The real outside world, used when run as a script. ----

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function tagHasServerJson(version) {
  try {
    git(["cat-file", "-e", `v${version}:server.json`]);
    return true;
  } catch {
    return false;
  }
}

async function npmVersions() {
  const res = await fetch(`https://registry.npmjs.org/${NPM_PACKAGE}`);
  if (res.status === 404) return new Map();
  if (!res.ok) throw new Error(`npm registry answered ${res.status} for ${NPM_PACKAGE}`);
  const doc = await res.json();
  return new Map(Object.entries(doc.versions ?? {}).map(([v, meta]) => [v, meta.mcpName]));
}

async function lookup(version) {
  const url = `${REGISTRY}/v0/servers/${encodeURIComponent(SERVER_NAME)}/versions/${encodeURIComponent(version)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`the MCP Registry answered ${res.status} for ${url}`);
  return res.json();
}

function publisher() {
  const bin = process.env.MCP_PUBLISHER ?? "./mcp-publisher";
  let loggedIn = false;
  const run = (args) => {
    const r = spawnSync(bin, args, { encoding: "utf8" });
    const output = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    if (output) console.log(output);
    return { status: r.error ? -1 : r.status, output: r.error ? r.error.message : output };
  };
  return async (version, serverJson) => {
    if (!loggedIn) {
      const login = run(["login", "github-oidc"]);
      if (login.status !== 0) return { error: `login github-oidc failed: ${login.output}` };
      loggedIn = true;
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "registry-"));
    const file = path.join(dir, "server.json");
    fs.writeFileSync(file, JSON.stringify(serverJson, null, 2));
    const r = run(["publish", file]);
    if (r.status === 0) return { ok: true };
    if (/cannot publish duplicate version/i.test(r.output)) return { duplicate: true };
    return { error: r.output || `exit ${r.status}` };
  };
}

async function main() {
  const requested = (process.argv[2] ?? process.env.VERSION ?? "").trim().replace(/^v/, "");
  if (requested && !SEMVER.test(requested)) {
    console.error(`"${requested}" isn't a release version (expected something like 0.6.2).`);
    process.exit(1);
  }
  if (requested && !tagHasServerJson(requested)) {
    console.error(`Tag v${requested} has no server.json (or doesn't exist), so it can't be listed in the Registry.`);
    process.exit(1);
  }

  const candidates = requested
    ? [requested]
    : git(["tag", "--list", "v*"])
        .split("\n")
        .map((t) => t.trim().replace(/^v/, ""))
        .filter((v) => SEMVER.test(v) && tagHasServerJson(v));

  if (!candidates.length) {
    console.log("No release tag carries server.json yet. Nothing to publish.");
    return;
  }

  const result = await reconcile(candidates, {
    npm: await npmVersions(),
    readLocal: (v) => JSON.parse(git(["show", `v${v}:server.json`])),
    lookup,
    publish: publisher(),
    log: (line) => console.log(line),
  });

  console.log(
    `Done: ${result.published.length} published, ${result.already.length} already listed, ` +
      `${result.pending.length} awaiting npm approval, ${result.failed.length} failed.`
  );
  if (result.failed.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  });
}
