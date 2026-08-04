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
  `);
}

export function resetSchema(db: DB): void {
  db.exec(`
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS notes_fts;
  `);
  resetIdentitySchema(db);
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
  `);
  initSchema(db);
}
