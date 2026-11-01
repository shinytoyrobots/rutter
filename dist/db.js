import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
export function openDb(dbPath = config.dbPath) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    // Several servers can share one index; wait briefly for another's write rather than fail.
    db.exec("PRAGMA busy_timeout = 5000;");
    initSchema(db);
    return db;
}
export function initSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      path     TEXT PRIMARY KEY,
      title    TEXT,
      type     TEXT,
      status   TEXT,
      created  TEXT,
      domain   TEXT,
      tags     TEXT,
      mtime    INTEGER
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      path UNINDEXED,
      title,
      body,
      tags,
      tokenize = 'porter unicode61'
    );
    -- Note identity projection (SR-040/041): rebuilt wholesale from the vault
    -- + the ledger (_librarian/note-identity.md) at every reindex. Never a
    -- source of truth by itself -- see src/identity.ts.
    CREATE TABLE IF NOT EXISTS identity_bindings (
      from_path TEXT NOT NULL,
      hash      TEXT NOT NULL,
      to_path   TEXT NOT NULL,
      detected  TEXT NOT NULL,
      ts        TEXT NOT NULL,
      PRIMARY KEY (from_path, hash)
    );
    CREATE TABLE IF NOT EXISTS identity_unresolved (
      from_path  TEXT NOT NULL,
      hash       TEXT NOT NULL,
      candidates TEXT NOT NULL,
      PRIMARY KEY (from_path, hash)
    );
    -- SR-046 (gen-2/var-3-reversibility, additive): a fresh automatic exact-hash
    -- detection that conflicts with an existing detected:confirmed binding for the
    -- same (from_path, hash) pair. A NEW table rather than a new column on
    -- identity_bindings, deliberately: identity_bindings' shape is unchanged, so
    -- rolling this feature back is "drop this table and this code path", never a
    -- migration of the existing one. Like the other identity_* tables this is a
    -- disposable cache (INV-4) recomputed wholesale from the vault + ledger at
    -- every reindex -- never a source of truth by itself.
    CREATE TABLE IF NOT EXISTS identity_conflicts (
      from_path    TEXT NOT NULL,
      hash         TEXT NOT NULL,
      confirmed_to TEXT NOT NULL,
      detected_to  TEXT NOT NULL,
      PRIMARY KEY (from_path, hash)
    );
    -- When the last full reindex STARTED (epoch ms), so a server can tell whether
    -- anything it indexes from has changed since. Deliberately NOT dropped by
    -- resetSchema: it describes the cache as a whole, and reindex() rewrites it last.
    -- Additive (rolling back is "drop this table"); like everything here it is a
    -- disposable cache, never a source of truth.
    ${INDEX_META_DDL}
    -- Which vault this index was built from (see src/vault-owner.ts). Kept apart from
    -- index_meta on purpose: a rebuild clears index_meta first, and ownership must not
    -- lapse while one runs, or a second server could claim the file mid-rebuild.
    CREATE TABLE IF NOT EXISTS index_owner (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
const INDEX_META_DDL = `CREATE TABLE IF NOT EXISTS index_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`;
/**
 * Forget when (and over what) the index was last built. Dropped and recreated rather
 * than emptied row by row: this is a disposable cache table, and a rebuild already
 * clears its siblings with DROP TABLE (INV-3 forbids row deletion anywhere in src/).
 */
export function clearIndexMeta(db) {
    db.exec(`DROP TABLE IF EXISTS index_meta; ${INDEX_META_DDL}`);
}
export function resetSchema(db) {
    db.exec(`
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS notes_fts;
  `);
    resetIdentitySchema(db);
    dropLegacyPositionTables(db);
    initSchema(db);
}
/**
 * Drop-and-rebuild wholesale (informative: projection tables are never
 * incrementally patched) for JUST the identity projection, so the identity
 * pass can rebuild it independently of the note/FTS reindex phase. This is a
 * disposable, fully rebuildable cache (INV-4), not a memory-of-use record --
 * cleared the same way `resetSchema` already clears `notes`/`notes_fts`.
 */
export function resetIdentitySchema(db) {
    db.exec(`
    DROP TABLE IF EXISTS identity_bindings;
    DROP TABLE IF EXISTS identity_unresolved;
    DROP TABLE IF EXISTS identity_conflicts;
  `);
    initSchema(db);
}
/**
 * v1.0.0 (SR-105): the position projection tables are gone with `librarian-positions`.
 * An index built by an earlier release still has them, so every reindex drops them.
 * The `_librarian/positions/` files they were folded from are never touched.
 */
export function dropLegacyPositionTables(db) {
    db.exec(`
    DROP TABLE IF EXISTS position_events;
    DROP TABLE IF EXISTS position_refs;
    DROP TABLE IF EXISTS positions;
  `);
}
/**
 * Run `work` inside one SQLite transaction, committing on return and rolling
 * back on throw.
 *
 * Extracted (gen-5/var-2-maintainability) because this exact BEGIN / try /
 * COMMIT / catch-ROLLBACK-rethrow block had two hand-written copies already
 * (indexer.ts's note-index phase, identity.ts's projection rebuild) and the
 * position fold would have made a third. Three copies of a rollback path is
 * three places to forget the `ROLLBACK` -- and a forgotten rollback leaves the
 * connection inside an open transaction, which turns one failed phase into a
 * failure of every later phase on the same connection. One named helper, three
 * call sites; behaviour at each is unchanged.
 */
export function withTransaction(db, work) {
    db.exec("BEGIN");
    try {
        const result = work();
        db.exec("COMMIT");
        return result;
    }
    catch (err) {
        db.exec("ROLLBACK");
        throw err;
    }
}
//# sourceMappingURL=db.js.map