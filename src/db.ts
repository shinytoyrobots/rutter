import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

// Node's built-in SQLite (Node 22+). No native build step; FTS5 is compiled in.
export type DB = DatabaseSync;

export function openDb(dbPath: string = config.dbPath): DB {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  initSchema(db);
  return db;
}

export function initSchema(db: DB): void {
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
  `);
  initPositionSchema(db);
}

/**
 * Position projection (SCN-011 / SR-058, SR-059): the SECOND reindex-only,
 * wholesale-rebuilt projection in this codebase, deliberately shaped like the
 * `identity_*` tables above rather than as a new pattern -- durable data stays
 * in markdown (`_librarian/positions/<YYYY-MM>.md`, see src/positions.ts),
 * these tables are a disposable cache rebuilt from that stream at every
 * reindex and never incrementally patched (INV-4).
 *
 * Three tables, one responsibility each:
 *   - `position_events` -- every event, in fold order, exactly as recorded.
 *     This is the full supersession chain; nothing is ever omitted from it,
 *     including a `retire` (SR-060, INV-3).
 *   - `position_refs`   -- each event's refs, one row per (event, path, hash),
 *     so the note-identity query mode is an index lookup rather than a scan
 *     over serialized JSON.
 *   - `positions`       -- one row per topic: the fold's structural conclusion
 *     (which event is live) and nothing else.
 *
 * What is deliberately NOT here: any column for dormancy, staleness, decay,
 * "retired", or an attribution date (SR-063). Every one of those is derived at
 * read time from the timestamps already on `position_events` (see
 * src/position-recall.ts), so changing how any of them is computed is a code
 * change with no schema migration and no stale stored value to invalidate.
 */
function initPositionSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS position_events (
      event_id   TEXT NOT NULL,
      topic_key  TEXT NOT NULL,
      seq        INTEGER NOT NULL,
      kind       TEXT NOT NULL,
      stance     TEXT NOT NULL,
      ts         TEXT NOT NULL,
      session_id TEXT,
      revises    TEXT,
      month      TEXT NOT NULL,
      PRIMARY KEY (topic_key, seq)
    );
    CREATE INDEX IF NOT EXISTS position_events_by_event
      ON position_events (event_id);
    CREATE TABLE IF NOT EXISTS position_refs (
      topic_key TEXT NOT NULL,
      seq       INTEGER NOT NULL,
      path      TEXT NOT NULL,
      hash      TEXT NOT NULL,
      PRIMARY KEY (topic_key, seq, path, hash)
    );
    CREATE INDEX IF NOT EXISTS position_refs_by_path
      ON position_refs (path);
    CREATE TABLE IF NOT EXISTS positions (
      topic_key     TEXT PRIMARY KEY,
      live_seq      INTEGER NOT NULL,
      event_count   INTEGER NOT NULL
    );
  `);
}

export function resetSchema(db: DB): void {
  db.exec(`
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS notes_fts;
  `);
  resetIdentitySchema(db);
  resetPositionSchema(db);
  initSchema(db);
}

/**
 * Drop-and-rebuild wholesale (informative: projection tables are never
 * incrementally patched) for JUST the identity projection, so the identity
 * pass can rebuild it independently of the note/FTS reindex phase. This is a
 * disposable, fully rebuildable cache (INV-4), not a memory-of-use record --
 * cleared the same way `resetSchema` already clears `notes`/`notes_fts`.
 */
export function resetIdentitySchema(db: DB): void {
  db.exec(`
    DROP TABLE IF EXISTS identity_bindings;
    DROP TABLE IF EXISTS identity_unresolved;
    DROP TABLE IF EXISTS identity_conflicts;
  `);
  initSchema(db);
}

/**
 * The same drop-and-rebuild for JUST the position projection (SR-058/SR-059),
 * so the fold can rebuild it independently of the note and identity phases.
 * A sibling of `resetIdentitySchema` rather than a shared generic helper:
 * naming each projection's reset after the projection keeps the call sites
 * readable ("rebuild the positions") and lets each own its table list, which
 * is the one thing that genuinely differs between them.
 */
export function resetPositionSchema(db: DB): void {
  db.exec(`
    DROP TABLE IF EXISTS position_events;
    DROP TABLE IF EXISTS position_refs;
    DROP TABLE IF EXISTS positions;
  `);
  initSchema(db);
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
export function withTransaction<T>(db: DB, work: () => T): T {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
