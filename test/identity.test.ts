import { resetLibrarian, writeNote, vaultRoot, librarianDir, readSession } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { config } from "../src/config.js";
import { captureSession } from "../src/capture.js";
import { reindex } from "../src/indexer.js";
import { openDb } from "../src/db.js";
import { search } from "../src/search.js";
import { enrich, buildReferenceIndex } from "../src/enrichment.js";
import { readLedger, resolveRef, ledgerPath } from "../src/identity.js";
import { recent } from "../src/recent.js";
import { formatRecentEntry } from "../src/server.js";

// `resetLibrarian` only clears `_librarian/` (session records, the ledger, the
// use log) -- by design (INV-3 is scoped there, not to vault content). This
// suite's own tests write and rename/delete vault notes to exercise identity
// resolution, so it ALSO clears its own `Notes/` fixtures between tests --
// otherwise a leftover file from an earlier test (e.g. a rename target) could
// become a spurious exact-hash candidate for a later, unrelated test.
beforeEach(() => {
  resetLibrarian();
  fs.rmSync(path.join(vaultRoot, "Notes"), { recursive: true, force: true });
});

const NOON = new Date("2026-07-24T12:00:00.000Z");

/** Rename a vault-relative file, content unchanged. */
function renameNote(from: string, to: string): void {
  fs.renameSync(path.join(vaultRoot, from), path.join(vaultRoot, to));
}

test("SCN-008/AC-1 SR-036/SR-039: a rename with unchanged content binds deterministically and appends a schema-valid ledger entry", () => {
  writeNote("Notes/old.md", "# Old\nunchanged content");
  reindex();
  const { entry } = captureSession({ summary: "Concluded old is canonical.", refs: ["Notes/old.md"], now: NOON });
  renameNote("Notes/old.md", "Notes/new.md");

  const stats = reindex(undefined, new Date("2026-07-25T00:00:00.000Z"));
  assert.equal(stats.identity.checked, 1, "exactly one dead ref found");
  assert.equal(stats.identity.bound, 1);
  assert.equal(stats.identity.unresolved, 0);
  assert.equal(stats.identity.appended, 1, "one new ledger entry written");

  const raw = fs.readFileSync(ledgerPath(), "utf8");
  const parsed = matter(raw).data as { collection: string; schema: string; bindings: unknown[] };
  assert.equal(parsed.collection, "librarian.note-identity");
  assert.equal(parsed.schema, "note-identity@1");
  assert.equal(parsed.bindings.length, 1);

  const ledger = readLedger();
  const binding = ledger[0]!;
  assert.equal(binding.from, "Notes/old.md");
  assert.equal(binding.to, "Notes/new.md");
  assert.equal(binding.hash, entry!.refs[0]!.hash, "ledger carries the recorded content hash");
  assert.equal(binding.detected, "exact-hash");
  assert.ok(binding.id, "binding carries an identity id");
  assert.ok(binding.ts, "binding carries a timestamp");
});

test("SCN-008/AC-2 INV-6: matching is exact-hash only -- a decoy with different content is never bound", () => {
  writeNote("Notes/old.md", "# Old\nunchanged content");
  reindex();
  captureSession({ summary: "Concluded old is canonical.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  writeNote("Notes/decoy.md", "# Old\ncompletely different body");

  reindex();
  assert.deepEqual(readLedger(), [], "no binding -- content hash never matched, so no deterministic answer exists");
});

test("SCN-008/AC-3 SR-042: recent + search enrichment resolve the old ref through the binding, stored bytes unchanged", () => {
  writeNote("Notes/old.md", "# Old\northogonal telemetry content");
  reindex();
  captureSession({ summary: "Concluded old is the canonical source.", refs: ["Notes/old.md"], now: NOON });
  const before = readSession("2026-07-24");

  renameNote("Notes/old.md", "Notes/new.md");
  reindex();

  assert.equal(readSession("2026-07-24"), before, "the stored session entry is byte-identical (INV-3, no retrofit)");

  const db = openDb();
  const entry = increments1(recent());
  const rendered = formatRecentEntry(entry, db);
  assert.match(rendered, /renamed to Notes\/new\.md/, "librarian-recent resolves the old ref to the current path");

  const { results } = enrich(search("orthogonal telemetry"), buildReferenceIndex(undefined, db));
  const hit = results.find((r) => r.path === "Notes/new.md");
  assert.ok(hit?.priorEngagement, "search enrichment surfaces the engagement against the renamed note's CURRENT path");
});

function increments1(result: ReturnType<typeof recent>) {
  return result.sessions[0]!.increments[0]!;
}

test("SCN-008/AC-4 SR-041: double reindex with no change yields byte-identical identity projections", () => {
  writeNote("Notes/old.md", "# Old\nstable content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  renameNote("Notes/old.md", "Notes/new.md");
  reindex();
  const ledgerAfterFirst = fs.readFileSync(ledgerPath(), "utf8");

  const stats2 = reindex(); // nothing changed in the vault or session records
  const ledgerAfterSecond = fs.readFileSync(ledgerPath(), "utf8");

  assert.equal(ledgerAfterSecond, ledgerAfterFirst, "ledger unchanged -- idempotent append, no duplicate entry");
  assert.equal(stats2.identity.appended, 0, "second pass appends nothing new");
  assert.equal(stats2.identity.bound, 1, "projection still reflects the existing binding");
});

test("SCN-008/AC-5 INV-2: the only durable write on this path is the ledger under _librarian/", () => {
  const beforeFiles = fs.existsSync(librarianDir)
    ? new Set(fs.readdirSync(librarianDir).filter((f) => fs.statSync(path.join(librarianDir, f)).isFile()))
    : new Set<string>();
  writeNote("Notes/old.md", "# Old\ncontent");
  reindex();
  const abs = path.join(vaultRoot, "Notes/old.md");
  const noteBefore = fs.readFileSync(abs);
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  renameNote("Notes/old.md", "Notes/new.md");
  reindex();

  assert.deepEqual(fs.readFileSync(path.join(vaultRoot, "Notes/new.md")), noteBefore, "vault content byte-identical (INV-2)");
  const afterFiles = fs.readdirSync(librarianDir).filter((f) => fs.statSync(path.join(librarianDir, f)).isFile());
  const newFiles = afterFiles.filter((f) => !beforeFiles.has(f));
  assert.deepEqual(newFiles, ["note-identity.md"], "the ledger is the only new durable file under _librarian/");
});

test("SCN-008/AC-6 SR-104: the identity pass reports a wall-time measurement, report-only", () => {
  writeNote("Notes/old.md", "# Old\ncontent");
  const stats = reindex();
  assert.equal(typeof stats.identity.ms, "number");
  assert.ok(stats.identity.ms >= 0, "non-negative wall time reported, no threshold enforced");
});

test("SCN-009/AC-1 SR-037: zero exact-hash candidates -- unresolved with an empty candidate set, binds nothing", () => {
  writeNote("Notes/old.md", "# Old\noriginal content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md")); // renamed AND edited -- no note anywhere has this hash now
  writeNote("Notes/old-edited.md", "# Old\nedited content, different hash");

  const stats = reindex();
  assert.equal(stats.identity.unresolved, 1);
  assert.equal(stats.identity.bound, 0);
  assert.deepEqual(readLedger(), [], "no binding -- ambiguity is recorded in the projection only, never the ledger");

  const db = openDb();
  const ref = increments1(recent()).refs[0]!;
  const resolution = resolveRef(db, ref);
  assert.equal(resolution.status, "unresolved");
  assert.deepEqual(resolution.candidates, []);
});

test("SCN-009/AC-2 SR-037: more than one exact-hash candidate -- unresolved lists EVERY candidate, binds nothing", () => {
  writeNote("Notes/old.md", "# Old\nduplicated content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  writeNote("Notes/dup1.md", "# Old\nduplicated content");
  writeNote("Notes/dup2.md", "# Old\nduplicated content");

  const stats = reindex();
  assert.equal(stats.identity.unresolved, 1);
  assert.equal(stats.identity.bound, 0);
  assert.deepEqual(readLedger(), [], "duplicate content is ambiguity, not a tie to break -- no binding");

  const db = openDb();
  const ref = increments1(recent()).refs[0]!;
  const resolution = resolveRef(db, ref);
  assert.equal(resolution.status, "unresolved");
  assert.deepEqual([...resolution.candidates!].sort(), ["Notes/dup1.md", "Notes/dup2.md"], "every candidate listed");
});

test("SCN-009/AC-3 SR-043: read surfaces render unresolved explicitly with candidates -- never silently dropped or bound", () => {
  writeNote("Notes/old.md", "# Old\nduplicated content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  writeNote("Notes/dup1.md", "# Old\nduplicated content");
  writeNote("Notes/dup2.md", "# Old\nduplicated content");
  reindex();

  const db = openDb();
  const rendered = formatRecentEntry(increments1(recent()), db);
  assert.match(rendered, /UNRESOLVED/);
  assert.match(rendered, /Notes\/dup1\.md/);
  assert.match(rendered, /Notes\/dup2\.md/);
});

test("SCN-009/AC-4 SR-038/SR-044: a human-confirmed binding appends detected:confirmed, preserving all earlier entries", () => {
  // An earlier, unrelated binding that must survive untouched.
  writeNote("Notes/first.md", "# First\nfirst content");
  reindex();
  captureSession({ summary: "Touched first.", refs: ["Notes/first.md"], now: NOON });
  renameNote("Notes/first.md", "Notes/first-renamed.md");
  reindex();
  const earlierLedger = readLedger();
  assert.equal(earlierLedger.length, 1, "the auto-bound rename is recorded");

  // The ambiguous case a human must resolve.
  writeNote("Notes/old.md", "# Old\nduplicated content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: new Date("2026-07-24T13:00:00.000Z") });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  writeNote("Notes/dup1.md", "# Old\nduplicated content");
  writeNote("Notes/dup2.md", "# Old\nduplicated content");
  reindex();

  const cli = fileURLToPath(new URL("../src/identity-confirm-cli.ts", import.meta.url));
  const res = spawnSync(process.execPath, ["--import", "tsx", cli, "Notes/old.md", "Notes/dup1.md"], {
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `confirm CLI exits clean; stderr: ${res.stderr}`);
  assert.equal(res.stdout, "", "the confirm CLI writes nothing to stdout");

  const ledger = readLedger();
  assert.equal(ledger.length, 2, "the earlier rename binding is preserved, never rewritten/reordered/compacted");
  assert.deepEqual(ledger[0], earlierLedger[0], "earlier entry byte-for-byte unchanged");
  const confirmed = ledger[1]!;
  assert.equal(confirmed.from, "Notes/old.md");
  assert.equal(confirmed.to, "Notes/dup1.md");
  assert.equal(confirmed.detected, "confirmed");

  // Sticks even though the vault is STILL ambiguous by content hash alone --
  // once confirmed, automated re-detection never regresses it back to unresolved.
  reindex();
  const db = openDb();
  const ref = readLedger()[1]!;
  const resolution = resolveRef(db, { path: ref.from, hash: ref.hash });
  assert.equal(resolution.status, "bound");
  assert.equal(resolution.path, "Notes/dup1.md");
  assert.equal(resolution.detected, "confirmed");
});

test("SR-044: the confirm CLI validates the candidate against the CURRENT vault and refuses a nonexistent target", () => {
  writeNote("Notes/old.md", "# Old\nduplicated content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  writeNote("Notes/dup1.md", "# Old\nduplicated content");
  writeNote("Notes/dup2.md", "# Old\nduplicated content");
  reindex();

  const cli = fileURLToPath(new URL("../src/identity-confirm-cli.ts", import.meta.url));
  const res = spawnSync(process.execPath, ["--import", "tsx", cli, "Notes/old.md", "Notes/does-not-exist.md"], {
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });
  assert.notEqual(res.status, 0, "refuses a target that does not resolve in the current vault");
  assert.deepEqual(readLedger(), [], "nothing written to the ledger on a refused confirmation");
});

test("SR-044: identity confirmation is a local CLI, never an MCP tool", () => {
  const serverSrc = fs.readFileSync(fileURLToPath(new URL("../src/server.ts", import.meta.url)), "utf8");
  const toolNames = [...serverSrc.matchAll(/registerTool\(\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(toolNames.length > 0, "sanity: the server does register tools");
  assert.ok(
    !toolNames.some((name) => /identity/i.test(name!)),
    `no registered MCP tool name mentions identity confirmation; found: ${toolNames.join(", ")}`
  );
});

test("SR-045: a multiply-renamed note yields a fresh direct binding -- ledger entries are never composed into chains", () => {
  writeNote("Notes/old.md", "# Old\ncontent that keeps moving");
  reindex();
  const { entry } = captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  const originalHash = entry!.refs[0]!.hash;

  renameNote("Notes/old.md", "Notes/mid.md");
  reindex(undefined, new Date("2026-07-25T00:00:00.000Z"));
  const afterFirstRename = readLedger();
  assert.equal(afterFirstRename.length, 1);
  assert.equal(afterFirstRename[0]!.to, "Notes/mid.md");

  renameNote("Notes/mid.md", "Notes/final.md");
  reindex(undefined, new Date("2026-07-26T00:00:00.000Z"));
  const afterSecondRename = readLedger();

  assert.equal(afterSecondRename.length, 2, "the first binding is preserved, not rewritten");
  assert.deepEqual(afterSecondRename[0], afterFirstRename[0], "earlier entry untouched");
  const freshest = afterSecondRename[1]!;
  assert.equal(freshest.from, "Notes/old.md", "the fresh binding is computed against the ORIGINALLY RECORDED path");
  assert.equal(freshest.to, "Notes/final.md", "direct hash match against the current vault, not a hop through mid.md");
  assert.equal(freshest.hash, originalHash);

  const db = openDb();
  const resolution = resolveRef(db, { path: "Notes/old.md", hash: originalHash });
  assert.equal(resolution.status, "bound");
  assert.equal(resolution.path, "Notes/final.md", "newest binding wins at resolution time");
});

test("SR-040/INV-4: identity projections rebuild from the vault + ledger alone", () => {
  writeNote("Notes/old.md", "# Old\nfixture content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  renameNote("Notes/old.md", "Notes/new.md");
  reindex();

  const db = openDb();
  const before = resolveRef(db, { path: "Notes/old.md", hash: readLedger()[0]!.hash });

  fs.rmSync(config.dbPath, { force: true }); // blow away the disposable cache
  reindex(); // rebuild purely from vault + _librarian/ (ledger included)

  const db2 = openDb();
  const after = resolveRef(db2, { path: "Notes/old.md", hash: readLedger()[0]!.hash });
  assert.deepEqual(after, before, "identical resolution after a full cache rebuild");
});

// -- gen-2/var-3-reversibility: SR-046 (confirmed bindings are sticky) ------

/**
 * The ledger is a gray-matter file: a YAML frontmatter block (whose
 * `bindings:` key holds a growable LIST) followed by a regenerated markdown
 * BODY (also a growable list, one line per binding). Appending a binding
 * necessarily moves the frontmatter's closing `---` delimiter (the list it
 * closes just grew) -- so a naive "first N raw bytes of the whole file are
 * unchanged" check is architecturally impossible to satisfy for ANY correct
 * implementation of this format, appended entry or not.
 *
 * What "byte-append-only" actually promises, given that shape, is that EACH
 * of the two growable list sections -- the frontmatter's `bindings:` array
 * body and the markdown body's line list -- is a byte-for-byte PREFIX of its
 * own later self: earlier entries' rendered text is carried forward
 * unchanged and un-reordered, with new text landing strictly after it. This
 * extracts those two sections from a ledger file's raw bytes via string
 * markers only (never via `readLedger`'s zod parse), so the comparison below
 * is a genuine raw-byte check, not a parsed-structure one.
 */
function ledgerSections(raw: Buffer): { frontmatterList: Buffer; bodyList: Buffer } {
  const text = raw.toString("utf8");
  const bindingsKey = "bindings:\n";
  const listStart = text.indexOf(bindingsKey) + bindingsKey.length;
  assert.ok(listStart > bindingsKey.length - 1, "ledger frontmatter carries a bindings: key");
  const frontmatterEnd = text.indexOf("\n---\n", listStart);
  assert.ok(frontmatterEnd >= 0, "frontmatter closes with its own --- delimiter");
  const bodyMarker = "# Note identity bindings\n\n";
  const bodyStart = text.indexOf(bodyMarker, frontmatterEnd) + bodyMarker.length;
  assert.ok(bodyStart > bodyMarker.length - 1, "body carries its own heading");
  return {
    frontmatterList: Buffer.from(text.slice(listStart, frontmatterEnd + 1), "utf8"),
    bodyList: Buffer.from(text.slice(bodyStart), "utf8"),
  };
}

/** Assert `after`'s two growable sections carry `before`'s as an exact byte PREFIX. */
function assertLedgerAppendedNotRewritten(before: Buffer, after: Buffer, msg: string): void {
  const b = ledgerSections(before);
  const a = ledgerSections(after);
  assert.equal(a.frontmatterList.indexOf(b.frontmatterList), 0, `${msg} (frontmatter bindings: list)`);
  assert.equal(a.bodyList.indexOf(b.bodyList), 0, `${msg} (markdown body list)`);
}

test(
  "SR-046: a fresh automatic exact-hash detection never outvotes a confirmed binding -- " +
    "conflict surfaced, ledger append-only through the conflict path (byte-level)",
  () => {
    // An UNRELATED earlier binding whose bytes must survive byte-for-byte
    // through everything that follows -- this is the "existing-prefix
    // preservation" the mandatory byte-level assertion below checks for.
    writeNote("Notes/first.md", "# First\nfirst content");
    captureSession({ summary: "Touched first.", refs: ["Notes/first.md"], now: NOON });
    renameNote("Notes/first.md", "Notes/first-renamed.md");
    reindex(undefined, new Date("2026-07-24T13:00:00.000Z"));
    const bytesAfterFirst = fs.readFileSync(ledgerPath());
    assert.equal(readLedger().length, 1, "sanity: one auto-bound entry so far");

    // A pair a human confirms to a target that is DELIBERATELY NOT what
    // exact-hash matching would say (SR-044 validates existence, never a hash
    // match -- a human is allowed to override what the hash alone implies).
    writeNote("Notes/old.md", "# Old\nconflict-prone content");
    captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: new Date("2026-07-24T14:00:00.000Z") });
    renameNote("Notes/old.md", "Notes/actual.md"); // exact-hash would say THIS
    writeNote("Notes/confirmed-target.md", "# Confirmed target\nunrelated content"); // a human confirms THIS instead

    const cli = fileURLToPath(new URL("../src/identity-confirm-cli.ts", import.meta.url));
    const res = spawnSync(process.execPath, ["--import", "tsx", cli, "Notes/old.md", "Notes/confirmed-target.md"], {
      env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
      encoding: "utf8",
    });
    assert.equal(res.status, 0, `confirm CLI exits clean; stderr: ${res.stderr}`);

    const bytesAfterConfirm = fs.readFileSync(ledgerPath());
    assertLedgerAppendedNotRewritten(
      bytesAfterFirst,
      bytesAfterConfirm,
      "confirming appends -- the earlier auto-bound entry's bytes are untouched"
    );
    assert.equal(readLedger().length, 2, "confirmed entry appended, nothing rewritten");

    // A SECOND, unrelated rename in the SAME reindex pass, so this pass
    // legitimately appends a fresh automatic binding elsewhere while the
    // SR-046 conflict path below appends NOTHING for its own (confirmed) ref
    // -- proving the byte-append-only guarantee holds even when *something*
    // does get appended in the same pass as a suppressed conflict.
    writeNote("Notes/third.md", "# Third\nthird content");
    captureSession({ summary: "Touched third.", refs: ["Notes/third.md"], now: new Date("2026-07-24T15:00:00.000Z") });
    renameNote("Notes/third.md", "Notes/third-renamed.md");

    // THIS is the first reindex pass since old.md was renamed to actual.md --
    // exact-hash matching now finds exactly one candidate (actual.md) for the
    // CONFIRMED pair, disagreeing with the confirmed target. SR-046 governs.
    const stats = reindex(undefined, new Date("2026-07-24T16:00:00.000Z"));
    assert.equal(
      stats.identity.appended,
      1,
      "only the UNRELATED rename (third.md) appends -- the conflicted, confirmed pair appends nothing"
    );

    const bytesAfterConflictPass = fs.readFileSync(ledgerPath());
    assert.ok(bytesAfterConflictPass.length > bytesAfterConfirm.length, "the unrelated append DID grow the file");
    assertLedgerAppendedNotRewritten(
      bytesAfterConfirm,
      bytesAfterConflictPass,
      "SR-046 byte-level check: the confirmed binding's bytes are an exact PREFIX of the growable ledger " +
        "sections across the conflict pass -- no automatic entry was appended for the conflicted pair, and " +
        "nothing earlier was rewritten, reordered, or compacted, even though this SAME pass legitimately " +
        "appended an unrelated entry at the end"
    );

    const ledger = readLedger();
    assert.equal(ledger.length, 3, "confirmed binding preserved + the one legitimate unrelated auto-bind, nothing else");
    assert.ok(
      !ledger.some((b) => b.from === "Notes/old.md" && b.to === "Notes/actual.md"),
      "no automatic binding was ever recorded for the conflicted pair -- confirmed stays sticky"
    );

    const db = openDb();
    const confirmedEntry = ledger.find((b) => b.from === "Notes/old.md")!;
    const resolution = resolveRef(db, { path: "Notes/old.md", hash: confirmedEntry.hash });
    assert.equal(resolution.status, "bound");
    assert.equal(resolution.path, "Notes/confirmed-target.md", "confirmed binding is sticky at read time");
    assert.equal(resolution.detected, "confirmed");
    assert.deepEqual(
      resolution.conflict,
      { to: "Notes/actual.md" },
      "the disagreement is surfaced on the resolution, never silently resolved either way"
    );

    // Read surface 1: librarian-recent.
    const oldEntry = recent()
      .sessions.flatMap((s) => s.increments)
      .find((e) => e.summary === "Touched old.")!;
    const rendered = formatRecentEntry(oldEntry, db);
    assert.match(
      rendered,
      /confirmed Notes\/confirmed-target\.md; the hash now matches Notes\/actual\.md/,
      "librarian-recent surfaces the conflict explicitly, naming both the confirmed target and the fresh hash match"
    );

    // Read surface 2: search prior-engagement enrichment.
    const { results } = enrich(search("unrelated content"), buildReferenceIndex(undefined, db));
    const hit = results.find((r) => r.path === "Notes/confirmed-target.md")!;
    assert.ok(hit.priorEngagement, "the confirmed binding's target still carries the prior engagement");
    assert.deepEqual(
      hit.identityConflict,
      { to: "Notes/actual.md" },
      "search enrichment ALSO surfaces the SR-046 conflict, riding alongside the prior-engagement annotation"
    );
  }
);

test("SR-046: candidates.length > 1 (still genuinely ambiguous) never triggers a conflict -- SR-046 is scoped to single-candidate automatic detection", () => {
  // Reuses the exact ambiguity shape from SCN-009/AC-4: a confirmed binding
  // sticks even though the vault stays ambiguous by hash alone, and that is
  // NOT the SR-046 conflict case (no single-candidate automatic detection
  // exists to disagree with it).
  writeNote("Notes/old.md", "# Old\nduplicated content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  writeNote("Notes/dup1.md", "# Old\nduplicated content");
  writeNote("Notes/dup2.md", "# Old\nduplicated content");
  reindex();

  const cli = fileURLToPath(new URL("../src/identity-confirm-cli.ts", import.meta.url));
  spawnSync(process.execPath, ["--import", "tsx", cli, "Notes/old.md", "Notes/dup1.md"], {
    env: { ...process.env, LIBRARIAN_VAULT_PATH: vaultRoot, LIBRARIAN_DB_PATH: path.join(vaultRoot, "data", "librarian.db") },
    encoding: "utf8",
  });

  reindex(); // still 2 candidates by hash -- no single-candidate automatic detection exists
  const db = openDb();
  const ref = readLedger().find((b) => b.detected === "confirmed")!;
  const resolution = resolveRef(db, { path: ref.from, hash: ref.hash });
  assert.equal(resolution.status, "bound");
  assert.equal(resolution.detected, "confirmed");
  assert.equal(resolution.conflict, undefined, "no conflict -- SR-046 requires a SINGLE-candidate automatic match to disagree with");
});

// -- gen-2/var-3-reversibility: SR-043 (enrichment surface, complete conformance) --

test("SR-043: search prior-engagement enrichment renders an unresolved ref explicitly with its candidates -- never silently dropped, never a fabricated engagement", () => {
  writeNote("Notes/old.md", "# Old\nduplicated searchable content");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  // BYTE-IDENTICAL to old.md (exact-hash matching, INV-6 -- no heuristics): two
  // current notes share the recorded hash, so the ref is genuinely ambiguous.
  writeNote("Notes/dup1.md", "# Old\nduplicated searchable content");
  writeNote("Notes/dup2.md", "# Old\nduplicated searchable content");
  reindex();

  const db = openDb();
  const { results } = enrich(search("duplicated searchable content"), buildReferenceIndex(undefined, db));
  const dup1 = results.find((r) => r.path === "Notes/dup1.md")!;
  const dup2 = results.find((r) => r.path === "Notes/dup2.md")!;

  for (const hit of [dup1, dup2]) {
    assert.ok(hit, "both candidates are present -- enrichment never adds or drops a result (SR-009/SR-010)");
    assert.equal(hit.priorEngagement, undefined, "a mere CANDIDATE is never annotated as a prior engagement (constitution prohibition 8)");
    assert.ok(hit.unresolvedReference, "the unresolved state is rendered explicitly, not silently dropped (SR-043)");
    assert.equal(hit.unresolvedReference!.from, "Notes/old.md");
    assert.deepEqual(
      [...hit.unresolvedReference!.candidates].sort(),
      ["Notes/dup1.md", "Notes/dup2.md"],
      "every candidate is listed, on both candidate results"
    );
  }

  const baseline = search("duplicated searchable content").map((r) => r.path);
  assert.deepEqual(
    results.map((r) => r.path),
    baseline,
    "rendering the unresolved state changes no result's membership or ranking (SR-010)"
  );
});

test("SR-043: an unresolved ref whose candidates are NOT among the search results renders no annotation anywhere (enrichment never invents a result)", () => {
  writeNote("Notes/old.md", "# Old\nduplicated ambiguous content");
  writeNote("Notes/unrelated.md", "# Unrelated\nsomething else entirely");
  reindex();
  captureSession({ summary: "Touched old.", refs: ["Notes/old.md"], now: NOON });
  fs.rmSync(path.join(vaultRoot, "Notes/old.md"));
  // BYTE-IDENTICAL to old.md, same reasoning as the test above.
  writeNote("Notes/dup1.md", "# Old\nduplicated ambiguous content");
  writeNote("Notes/dup2.md", "# Old\nduplicated ambiguous content");
  reindex();

  const db = openDb();
  const { results } = enrich(search("unrelated"), buildReferenceIndex(undefined, db));
  assert.equal(results.length, 1);
  assert.equal(results[0]!.path, "Notes/unrelated.md");
  assert.equal(results[0]!.unresolvedReference, undefined, "no candidate of the unresolved ref is in THIS result set");
  assert.equal(results[0]!.priorEngagement, undefined);
});
