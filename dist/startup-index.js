import fs from "node:fs";
import path from "node:path";
import { openDb } from "./db.js";
import { walkMarkdown, countOverlayMarkdown } from "./vault.js";
import { reindex } from "./indexer.js";
import { config } from "./config.js";
function readMeta(db, key) {
    const row = db.prepare("SELECT value FROM index_meta WHERE key = ?").get(key);
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : undefined;
}
function isMissing(err) {
    return err?.code === "ENOENT";
}
/** Is any `.md` in `dir` newer than `since`? A missing directory is "no"; anything else throws. */
function newerMarkdownIn(dir, since) {
    let names;
    try {
        names = fs.readdirSync(dir);
    }
    catch (err) {
        if (isMissing(err))
            return false;
        throw err;
    }
    return names.some((name) => {
        if (!name.toLowerCase().endsWith(".md"))
            return false;
        try {
            return fs.statSync(path.join(dir, name)).mtimeMs > since;
        }
        catch (err) {
            if (isMissing(err))
                return false; // vanished since the listing; the count check sees it
            throw err;
        }
    });
}
/** Has anything the index is built from changed since it was last built? */
export function indexVerdict(db) {
    const indexedAt = readMeta(db, "indexed_at");
    if (indexedAt === undefined)
        return { stale: true, reason: "the index has not been built yet" };
    // Walk the WHOLE vault before deciding anything, so a locked folder is known about
    // before it can be mistaken for deleted notes.
    let walked = 0;
    let newer = false;
    let unreadable;
    for (const abs of walkMarkdown(config.vaultPath, (dir) => (unreadable ??= dir))) {
        walked++;
        try {
            if (fs.statSync(abs).mtimeMs > indexedAt)
                newer = true;
        }
        catch (err) {
            if (!isMissing(err))
                throw err; // vanished mid-walk; the count check below sees it
        }
    }
    if (unreadable !== undefined) {
        return { stale: false, warning: `part of the notes folder is unreadable (${unreadable}); keeping the existing index` };
    }
    const indexedWalked = readMeta(db, "walked_count");
    if (walked === 0 && (indexedWalked ?? 0) > 0) {
        return { stale: false, warning: `no notes found in ${config.vaultPath}; keeping the existing index` };
    }
    if (newer)
        return { stale: true, reason: "notes have changed" };
    // Added or removed notes change the count even when a copy preserved an old mtime.
    if (indexedWalked !== undefined && walked !== indexedWalked) {
        return { stale: true, reason: "notes have been added or removed" };
    }
    const indexedOverlay = readMeta(db, "overlay_count");
    if (indexedOverlay !== undefined && countOverlayMarkdown() !== indexedOverlay) {
        return { stale: true, reason: "session or position records have been added or removed" };
    }
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
        return verdict.warning ? { built: false, warning: verdict.warning } : { built: false };
    return { built: true, reason: verdict.reason, stats: reindex(database) };
}
//# sourceMappingURL=startup-index.js.map