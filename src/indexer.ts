import { openDb, resetSchema, withTransaction, type DB } from "./db.js";
import { walkMarkdown, readNote } from "./vault.js";
import { config } from "./config.js";
import { runIdentityPass, type IdentityPassStats } from "./identity.js";
import { readAllRecords } from "./session-record.js";
import { materializePositionFold, type PositionFoldStats } from "./position-fold.js";

export interface IndexStats {
  notes: number;
  skipped: number;
  ms: number;
  /** SR-036..045, SR-104: dead-ref detection, exact-hash matching, projection rebuild. */
  identity: IdentityPassStats;
  /** SR-058/SR-059: the position fold. Reindex is its ONLY trigger. */
  positions: PositionFoldStats;
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

  withTransaction(database, () => {
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
  });

  // Identity pass runs AFTER the note index commits, in its own transaction,
  // so a problem here can never unwind an otherwise-successful reindex
  // (reversibility: the two phases are independently rollback-safe).
  const identity = runIdentityPass(database, readAllRecords(), now);

  // Position fold (SCN-011, SR-058): the third and last phase, again in its own
  // transaction. THIS CALL SITE IS THE FOLD'S ONLY TRIGGER -- nothing outside
  // reindex, and specifically not SCN-010's capture path, may materialize the
  // position projection. Running it last means a fold problem cannot unwind the
  // note index or the identity ledger either.
  const positions = materializePositionFold(database);

  return { notes, skipped, ms: Date.now() - start, identity, positions };
}
