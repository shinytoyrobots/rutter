import { openDb, resetSchema, type DB } from "./db.js";
import { walkMarkdown, readNote } from "./vault.js";
import { config } from "./config.js";
import { runIdentityPass, type IdentityPassStats } from "./identity.js";
import { readAllRecords } from "./session-record.js";

export interface IndexStats {
  notes: number;
  skipped: number;
  ms: number;
  /** SR-036..045, SR-104: dead-ref detection, exact-hash matching, projection rebuild. */
  identity: IdentityPassStats;
}

/**
 * Full rebuild of the derived index from the vault. The vault is the source of
 * truth; this cache is disposable and regenerable (QA3). At ~2k notes a full
 * rebuild is well under the 60s budget, so incremental indexing is deferred.
 *
 * `now` is injectable so tests can drive the identity pass deterministically;
 * it does not affect the note-indexing phase, which carries no clock of its
 * own.
 */
export function reindex(db?: DB, now: Date = new Date()): IndexStats {
  const database = db ?? openDb();
  const start = Date.now();
  resetSchema(database);

  const insertNote = database.prepare(
    `INSERT OR REPLACE INTO notes (path, title, type, status, created, domain, tags, mtime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertFts = database.prepare(
    `INSERT INTO notes_fts (path, title, body, tags) VALUES (?, ?, ?, ?)`
  );

  let notes = 0;
  let skipped = 0;

  database.exec("BEGIN");
  try {
    for (const abs of walkMarkdown(config.vaultPath)) {
      const note = readNote(abs);
      if (!note) {
        skipped++;
        continue;
      }
      const tagsStr = note.tags.join(", ");
      insertNote.run(
        note.path,
        note.title,
        note.type,
        note.status,
        note.created,
        note.domain,
        tagsStr,
        note.mtime
      );
      insertFts.run(note.path, note.title, note.body, tagsStr);
      notes++;
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }

  // Identity pass runs AFTER the note index commits, in its own transaction,
  // so a problem here can never unwind an otherwise-successful reindex
  // (reversibility: the two phases are independently rollback-safe).
  const identity = runIdentityPass(database, readAllRecords(), now);

  return { notes, skipped, ms: Date.now() - start, identity };
}
