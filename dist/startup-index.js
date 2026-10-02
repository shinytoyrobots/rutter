import fs from "node:fs";
import path from "node:path";
import { openDb } from "./db.js";
import { walkMarkdown } from "./vault.js";
import { reindex } from "./indexer.js";
import { config } from "./config.js";
function readIndexedAt(db) {
    const row = db.prepare("SELECT value FROM index_meta WHERE key = 'indexed_at'").get();
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : undefined;
}
function newerMarkdownIn(dir, since) {
    let names;
    try {
        names = fs.readdirSync(dir);
    }
    catch {
        return false; // the overlay directory not existing yet is simply "nothing new"
    }
    return names.some((name) => {
        if (!name.toLowerCase().endsWith(".md"))
            return false;
        try {
            return fs.statSync(path.join(dir, name)).mtimeMs > since;
        }
        catch {
            return false;
        }
    });
}
/** Has anything the index is built from changed since it was last built? */
export function indexVerdict(db) {
    const indexedAt = readIndexedAt(db);
    if (indexedAt === undefined)
        return { stale: true, reason: "the index has not been built yet" };
    let walked = 0;
    for (const abs of walkMarkdown()) {
        walked++;
        try {
            if (fs.statSync(abs).mtimeMs > indexedAt)
                return { stale: true, reason: "notes have changed" };
        }
        catch {
            // vanished between the walk and the stat; the count check below catches removals
        }
    }
    const indexed = db.prepare("SELECT COUNT(*) AS c FROM notes").get().c;
    // Zero notes found while the index holds some means the notes folder is missing,
    // unmounted or unreadable -- not that every note was deleted. Rebuilding then would
    // replace a good index with an empty one, so leave it alone.
    if (walked > 0 && walked < indexed)
        return { stale: true, reason: "notes have been removed" };
    if (newerMarkdownIn(config.sessionsDir, indexedAt) || newerMarkdownIn(config.positionsDir, indexedAt)) {
        return { stale: true, reason: "session or position records have changed" };
    }
    return { stale: false };
}
/** Rebuild the index if (and only if) it is missing or out of date. */
export function ensureIndex(db) {
    const database = db ?? openDb();
    const verdict = indexVerdict(database);
    if (!verdict.stale)
        return { built: false };
    return { built: true, reason: verdict.reason, stats: reindex(database) };
}
//# sourceMappingURL=startup-index.js.map