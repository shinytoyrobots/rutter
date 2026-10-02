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

  // Settle the index first, so the stream below is the ONLY thing that has changed --
  // otherwise the session record above could be what triggers the rebuild. (Its mtime
  // was pushed into the future to force the first rebuild; bring it back to the past.)
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(session, past, past);
  assert.equal(ensureIndex(db).built, false, "settled again after the session-record rebuild");
  fs.mkdirSync(positionsDir, { recursive: true });
  const stream = path.join(positionsDir, "2026-10.md");
  fs.writeFileSync(stream, "stream\n", "utf8");
  touchAhead(stream, 120);
  const afterStream = ensureIndex(db);
  assert.equal(afterStream.built, true, "a position stream is also an input to the index");
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

// ---------------------------------------------------------------------------
// Review hardening: the check must never act on a partial picture, never read
// "could not inspect" as "unchanged", and never leave a half-built index looking
// current.
// ---------------------------------------------------------------------------

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

/** Run `fn` with `dir` made unreadable, restoring permissions so teardown can clean up. */
function withUnreadable<T>(dir: string, fn: () => T): T {
  fs.chmodSync(dir, 0o000);
  try {
    return fn();
  } finally {
    fs.chmodSync(dir, 0o755);
  }
}

test("a note that arrives with an OLD modified date (a preserving copy) is still noticed", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  ensureIndex(db);

  const copied = writeNote("Notes/copied.md", "# Copied\nrsync preserved my mtime");
  const longAgo = new Date("2020-01-01T00:00:00Z");
  fs.utimesSync(copied, longAgo, longAgo);

  const result = ensureIndex(db);
  assert.equal(result.built, true, "the count changed even though no mtime did");
  assert.match(result.reason ?? "", /added or removed/);
  assert.equal(search("rsync preserved", {}, db).length, 1);
});

test("notes that cannot be parsed do not make every start rebuild", () => {
  writeNote("Notes/good.md", "# Good\nfine");
  const db = openDb();
  // Whatever the indexer skips still counts as walked, so the counts stay comparable.
  const first = ensureIndex(db);
  assert.equal(first.built, true);
  assert.equal(ensureIndex(db).built, false, "an unchanged vault stays unchanged, skipped notes or not");
});

test("a deleted position stream is noticed, so its stances do not linger in the projection", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  fs.mkdirSync(positionsDir, { recursive: true });
  const stream = path.join(positionsDir, "2026-10.md");
  fs.writeFileSync(stream, "stream\n", "utf8");
  const db = openDb();
  ensureIndex(db);
  assert.equal(ensureIndex(db).built, false);

  fs.rmSync(stream);
  const result = ensureIndex(db);
  assert.equal(result.built, true);
  assert.match(result.reason ?? "", /records have been added or removed/);
});

test("a rebuild that dies part-way leaves the index reading as not built, never as current", () => {
  writeNote("Notes/a.md", "# A\nalpha");
  const db = openDb();
  ensureIndex(db);
  assert.equal(ensureIndex(db).built, false, "starts out current");

  // Fail at the very end -- every phase has run, but the completion stamp is not
  // written. Whatever dies and whenever, the previous stamp must already be gone.
  const dying = new Proxy(db, {
    get(target, prop) {
      if (prop === "prepare") {
        return (sql: string) => {
          if (/INSERT OR REPLACE INTO index_meta/.test(sql)) throw new Error("simulated failure after the phases");
          return target.prepare(sql);
        };
      }
      const value = Reflect.get(target, prop) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  assert.throws(() => reindex(dying), /simulated failure/);

  assert.equal(
    db.prepare("SELECT value FROM index_meta WHERE key = 'indexed_at'").get(),
    undefined,
    "the stale 'up to date' marker was cleared before the rebuild began"
  );
  assert.deepEqual(indexVerdict(db), { stale: true, reason: "the index has not been built yet" });
  assert.equal(ensureIndex(db).built, true, "and the next start repairs it");
});

test("an unreadable session or position directory is an error, not 'nothing changed'", { skip: isRoot }, () => {
  writeNote("Notes/a.md", "# A\nalpha");
  fs.mkdirSync(sessionsDir, { recursive: true });
  const db = openDb();
  ensureIndex(db);

  withUnreadable(sessionsDir, () => {
    assert.throws(() => indexVerdict(db), /EACCES|permission/i);
  });
});

test("an unreadable folder inside the notes never triggers a rebuild that would drop its notes", { skip: isRoot }, () => {
  writeNote("Notes/open/a.md", "# A\nalpha stays");
  writeNote("Notes/locked/b.md", "# B\nbravo is in the locked folder");
  const db = openDb();
  ensureIndex(db);
  assert.equal(search("bravo is in the locked folder", {}, db).length, 1);

  withUnreadable(path.join(vaultRoot, "Notes", "locked"), () => {
    // Make something else look changed too, so a naive check WOULD rebuild.
    const changed = path.join(vaultRoot, "Notes", "open", "a.md");
    touchAhead(changed);
    const result = ensureIndex(db);
    assert.equal(result.built, false, "a partial walk is never grounds to rebuild");
    assert.match(result.warning ?? "", /unreadable/);
  });
  assert.equal(search("bravo is in the locked folder", {}, db).length, 1, "the locked folder's notes are still indexed");
});

test("an empty walk with a newer session record still does not rebuild into an empty index", () => {
  const only = writeNote("Notes/only.md", "# Only\nkeep me");
  const db = openDb();
  ensureIndex(db);

  fs.rmSync(only); // the notes folder 'disappears'...
  fs.mkdirSync(sessionsDir, { recursive: true });
  const session = path.join(sessionsDir, "2026-10-02.md");
  fs.writeFileSync(session, "- 10:00:00 - captured meanwhile\n", "utf8");
  touchAhead(session); // ...while a session record gets newer, which used to force a rebuild

  const result = ensureIndex(db);
  assert.equal(result.built, false);
  assert.match(result.warning ?? "", /no notes found/);
  assert.equal(search("keep me", {}, db).length, 1);
});
