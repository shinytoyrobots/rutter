import { resetLibrarian, writeNote, vaultRoot, sessionsDir, positionsDir } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openDb } from "../src/db.js";
import { reindex } from "../src/indexer.js";
import { search } from "../src/search.js";
import { ensureIndex, indexVerdict } from "../src/startup-index.js";

// A plugin install has no clone and no `npm run reindex`, so the server has to build
// and refresh its own index. These tests pin that it does so when something changed,
// does NOT when nothing did (a rebuild briefly empties the index for any other
// session reading it), and never trades a good index for an empty one.

beforeEach(() => {
  resetLibrarian();
  fs.rmSync(path.join(vaultRoot, "Notes"), { recursive: true, force: true });
  fs.rmSync(path.join(vaultRoot, "data"), { recursive: true, force: true });
});

/** Push a file's mtime into the future so "changed since the last build" is unambiguous. */
function touchAhead(abs: string, seconds = 60): void {
  const when = new Date(Date.now() + seconds * 1000);
  fs.utimesSync(abs, when, when);
}

test("a fresh install builds its index on first start, so search works with no manual reindex", () => {
  writeNote("Notes/first.md", "# First\nplugin install smoke text");
  const db = openDb();

  const first = ensureIndex(db);
  assert.equal(first.built, true);
  assert.match(first.reason ?? "", /not been built/);
  assert.equal(first.stats?.notes, 1);
  assert.equal(search("smoke text", {}, db).length, 1, "the note is searchable");
});

test("an unchanged index is left alone", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  ensureIndex(db);

  const second = ensureIndex(db);
  assert.equal(second.built, false, "nothing changed, nothing rebuilt");
  assert.deepEqual(indexVerdict(db), { stale: false });
});

test("a new or edited note triggers a rebuild that makes it searchable", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  ensureIndex(db);

  const added = writeNote("Notes/b.md", "# B\nfreshly written bravo");
  touchAhead(added);

  const result = ensureIndex(db);
  assert.equal(result.built, true);
  assert.match(result.reason ?? "", /notes have changed/);
  assert.equal(search("freshly written bravo", {}, db).length, 1);
});

test("a removed note triggers a rebuild so it stops appearing in results", () => {
  writeNote("Notes/a.md", "# A\nalpha stays");
  const gone = writeNote("Notes/b.md", "# B\nbravo goes");
  const db = openDb();
  ensureIndex(db);

  fs.rmSync(gone);
  const result = ensureIndex(db);
  assert.equal(result.built, true);
  assert.match(result.reason ?? "", /removed/);
  assert.equal(search("bravo goes", {}, db).length, 0);
});

test("a missing or empty notes folder never replaces a good index with an empty one", () => {
  const only = writeNote("Notes/only.md", "# Only\nprecious index content");
  const db = openDb();
  ensureIndex(db);

  // Every note vanishes at once -- an unmounted or unreadable folder looks exactly
  // like this to the walk. That is not evidence the notes were deleted.
  fs.rmSync(only);
  const result = ensureIndex(db);
  assert.equal(result.built, false, "zero notes found is not grounds to rebuild");
  assert.equal(search("precious index content", {}, db).length, 1, "the existing index is untouched");
});

test("new session records or position streams trigger a rebuild", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  ensureIndex(db);

  fs.mkdirSync(sessionsDir, { recursive: true });
  const session = path.join(sessionsDir, "2026-10-02.md");
  fs.writeFileSync(session, "- 10:00:00 - did a thing\n", "utf8");
  touchAhead(session);
  const afterSession = ensureIndex(db);
  assert.equal(afterSession.built, true);
  assert.match(afterSession.reason ?? "", /session or position records/);

  fs.mkdirSync(positionsDir, { recursive: true });
  const stream = path.join(positionsDir, "2026-10.md");
  fs.writeFileSync(stream, "stream\n", "utf8");
  touchAhead(stream, 120);
  assert.equal(ensureIndex(db).built, true, "a position stream is also an input to the index");
});

test("an index built before this check existed counts as never built, and one rebuild fixes it", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  reindex(db); // records indexed_at
  db.exec("DELETE FROM index_meta"); // what an older install's database looks like

  assert.equal(indexVerdict(db).stale, true);
  assert.equal(ensureIndex(db).built, true);
  assert.equal(ensureIndex(db).built, false);
});

test("reindex records when it started, so staleness has a baseline", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  const before = Date.now();
  reindex(db);
  const row = db.prepare("SELECT value FROM index_meta WHERE key = 'indexed_at'").get() as { value: string };
  assert.ok(Number(row.value) >= before - 1 && Number(row.value) <= Date.now());
});
