import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SERVER_NAME, normalize, differences, reconcile } from "../scripts/registry-publish.mjs";

/**
 * scripts/registry-publish.mjs, run by .github/workflows/registry.yml (docs/mcp-registry-plan.md,
 * item 2). Every outside effect (npm, git, the Registry, mcp-publisher) is a stand-in here.
 */

type Entry = { name: string; version: string; packages: { version: string }[] } & Record<string, unknown>;

const repo = path.join(import.meta.dirname, "..");
const shipped = JSON.parse(fs.readFileSync(path.join(repo, "server.json"), "utf8")) as Entry;

/** server.json for `version`, as the tag v<version> would carry it. */
function entry(version: string): Entry {
  const e = structuredClone(shipped);
  e.version = version;
  e.packages[0]!.version = version;
  return e;
}

/** What the Registry hands back for a published entry: a wrapper, with defaults left out. */
function asServed(e: Entry) {
  return {
    server: normalize(e),
    _meta: { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: true } },
  };
}

function world(opts: {
  npm: string[];
  registry?: Record<string, ReturnType<typeof asServed>>;
  publish?: (v: string) => { ok?: true; duplicate?: true; error?: string };
}) {
  const registry = { ...(opts.registry ?? {}) };
  const published: string[] = [];
  const lines: string[] = [];
  return {
    published,
    lines,
    registry,
    deps: {
      npm: new Map(opts.npm.map((v) => [v, SERVER_NAME])),
      readLocal: (v: string) => entry(v),
      lookup: async (v: string) => registry[v] ?? null,
      publish: async (v: string, e: Entry) => {
        const outcome = opts.publish?.(v) ?? { ok: true as const };
        if (outcome.ok) {
          published.push(v);
          registry[v] = asServed(e);
        }
        return outcome;
      },
      log: (line: string) => lines.push(line),
    },
  };
}

test("an unchanged entry compares equal to the server.json it came from, though the Registry drops default values", () => {
  const withDefaults = structuredClone(shipped) as Entry & {
    packages: { environmentVariables: Record<string, unknown>[] }[];
  };
  withDefaults.packages[0]!.environmentVariables[1]!.isRequired = false;
  withDefaults.packages[0]!.environmentVariables[1]!.isSecret = false;
  assert.deepEqual(differences(withDefaults, asServed(shipped).server), []);
});

test("a changed field is a difference, named by its path", () => {
  const changed = structuredClone(shipped);
  changed.description = "something else";
  assert.deepEqual(differences(changed, asServed(shipped).server), ["description"]);
});

test("a version not yet approved on npm is skipped without failing, and approved ones publish oldest first", async () => {
  const w = world({ npm: ["0.6.2", "0.6.3"] });
  const result = await reconcile(["0.7.0", "0.6.3", "0.6.2"], w.deps);
  assert.deepEqual(w.published, ["0.6.2", "0.6.3"], "both approved versions, in version order");
  assert.deepEqual(result.pending, ["0.7.0"]);
  assert.deepEqual(result.failed, []);
});

test("a rerun publishes nothing and passes", async () => {
  const w = world({ npm: ["0.6.2"], registry: { "0.6.2": asServed(entry("0.6.2")) } });
  const result = await reconcile(["0.6.2"], w.deps);
  assert.deepEqual(w.published, []);
  assert.deepEqual(result.already, ["0.6.2"]);
  assert.deepEqual(result.failed, []);
});

test("a listed version with different metadata fails, and the rest still run", async () => {
  const stale = entry("0.6.2");
  stale.description = "an older description";
  const w = world({ npm: ["0.6.2", "0.6.3"], registry: { "0.6.2": asServed(stale) } });
  const result = await reconcile(["0.6.2", "0.6.3"], w.deps);
  assert.deepEqual(result.failed, ["0.6.2"]);
  assert.deepEqual(w.published, ["0.6.3"]);
  assert.ok(w.lines.some((l) => l.includes("description") && l.includes("new release")));
});

test("a duplicate-version error from a publish that raced another run looks again and passes when it matches", async () => {
  const w = world({ npm: ["0.6.2"] });
  let first = true;
  w.deps.lookup = async (v: string) => {
    if (first) {
      first = false;
      return null; // the lookup ran before the other run published
    }
    return asServed(entry(v));
  };
  w.deps.publish = async () => ({ duplicate: true as const });
  const result = await reconcile(["0.6.2"], w.deps);
  assert.deepEqual(result.already, ["0.6.2"]);
  assert.deepEqual(result.failed, []);
});

test("a duplicate-version error with different metadata on the second look fails", async () => {
  const w = world({ npm: ["0.6.2"] });
  let first = true;
  w.deps.lookup = async (v: string) => {
    if (first) {
      first = false;
      return null;
    }
    const other = entry(v);
    other.title = "not rutter";
    return asServed(other);
  };
  w.deps.publish = async () => ({ duplicate: true as const });
  const result = await reconcile(["0.6.2"], w.deps);
  assert.deepEqual(result.failed, ["0.6.2"]);
});

test("a publish failure that isn't a duplicate fails that version only", async () => {
  const w = world({ npm: ["0.6.2", "0.6.3"], publish: (v) => (v === "0.6.2" ? { error: "boom" } : { ok: true }) });
  const result = await reconcile(["0.6.2", "0.6.3"], w.deps);
  assert.deepEqual(result.failed, ["0.6.2"]);
  assert.deepEqual(w.published, ["0.6.3"]);
});

test("npm's mcpName or a tag's server.json disagreeing with the release fails before anything is published", async () => {
  const w = world({ npm: ["0.6.2", "0.6.3"] });
  w.deps.npm.set("0.6.2", "io.github.someone/else");
  w.deps.readLocal = (v: string) => (v === "0.6.3" ? entry("0.6.4") : entry(v));
  const result = await reconcile(["0.6.2", "0.6.3"], w.deps);
  assert.deepEqual(result.failed, ["0.6.2", "0.6.3"]);
  assert.deepEqual(w.published, []);
});
