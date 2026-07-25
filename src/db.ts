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
  `);
}

export function resetSchema(db: DB): void {
  db.exec(`DROP TABLE IF EXISTS notes; DROP TABLE IF EXISTS notes_fts;`);
  initSchema(db);
}
