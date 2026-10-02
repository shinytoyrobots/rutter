import { readAllRecords } from "./session-record.js";
import { isoDay } from "./capture.js";
/**
 * Flatten every entry across all records, order reverse-chronologically by SESSION
 * DATE then capture time (never by file mtime, so touching an old file can't fake
 * recency -- COR-A-008), apply the project/window filters, then GROUP into sessions
 * and cap by session count.
 *
 * Order of operations matters. Filters run on ENTRIES (so a project filter still
 * means what it meant pre-v3.5.0), grouping runs after, and `count` caps GROUPS --
 * because a caller asking for 5 wants five units of work, and under the old
 * entry-cap a single chatty session could consume the whole budget. Filters only
 * ever REMOVE, and `empty` keeps meaning "no records at all" rather than "nothing
 * matched".
 */
export function recent(opts = {}, records = readAllRecords()) {
    const all = flatten(records).sort(byMostRecent);
    let selected = all;
    if (opts.project !== undefined) {
        selected = selected.filter((e) => matchesProject(e, opts.project));
    }
    if (opts.windowDays !== undefined) {
        const cutoff = new Date((opts.now ?? new Date()).getTime() - opts.windowDays * DAY_MS);
        const cutoffDay = isoDay(cutoff);
        selected = selected.filter((e) => e.day >= cutoffDay);
    }
    let sessions = groupSessions(selected);
    if (opts.count !== undefined) {
        sessions = sessions.slice(0, opts.count);
    }
    if (opts.detail === "brief") {
        sessions = sessions.map(abbreviate);
    }
    return { sessions, empty: all.length === 0 };
}
const DAY_MS = 86_400_000;
/**
 * Group entries into sessions, newest session first, increments oldest-first
 * within each (SR-030).
 *
 * The key is (session id + project), not session id alone. A session that moved
 * between projects splits, which is correct: "what was I working on in the novel?"
 * should not drag in the hour that session spent in a work repo. Both fields are
 * already on the entry, so this is pure code -- no inference (INV-6).
 *
 * An entry with NO session id is its own singleton group. Such entries are
 * unrelated by construction (they are direct-CLI payloads with no session
 * identity), exactly as `isDuplicateEntry` refuses to dedupe them; bucketing them
 * together would invent a session that never existed.
 *
 * Grouping happens AFTER flattening across all day records, so a session that
 * straddled UTC midnight forms one group whose `day`/`lastDay` differ, rather than
 * two half-sessions in adjacent files.
 */
function groupSessions(entries) {
    const groups = new Map();
    let anonymous = 0;
    for (const entry of entries) {
        // A distinct key per session-id-less entry keeps them singletons. JSON-encoded
        // so no crafted session id or project name can collide two real sessions.
        const key = entry.session_id
            ? JSON.stringify([entry.session_id, entry.workspace?.project ?? null])
            : `anon:${anonymous++}`;
        const bucket = groups.get(key);
        if (bucket)
            bucket.push(entry);
        else
            groups.set(key, [entry]);
    }
    const sessions = [];
    for (const bucket of groups.values()) {
        // `entries` arrived newest-first; a session reads as it happened, so reverse.
        const increments = [...bucket].reverse();
        const first = increments[0];
        const last = increments[increments.length - 1];
        sessions.push({
            ...(first.session_id ? { session_id: first.session_id } : {}),
            ...(first.workspace ? { project: first.workspace.project } : {}),
            day: first.day,
            lastDay: last.day,
            increments,
            incrementCount: increments.length,
            abbreviated: false,
        });
    }
    // Map iteration order follows first-seen, i.e. the newest-first entry order, so
    // groups are already ranked by their most recent increment. Sorting explicitly
    // makes that a guarantee rather than a property of Map internals.
    return sessions.sort(byLatestIncrement);
}
/**
 * detail: "brief" -- first and last increment only, for wide windows where full
 * increments would swamp the caller's context. `incrementCount` still reports the
 * true total and `abbreviated` is set, so a client can say what it is not showing
 * (no silent truncation). A session of 1 or 2 increments is returned whole.
 */
function abbreviate(session) {
    if (session.increments.length <= 2)
        return session;
    const first = session.increments[0];
    const last = session.increments[session.increments.length - 1];
    return { ...session, increments: [first, last], abbreviated: true };
}
/** Newest session first, judged by its LAST increment. */
function byLatestIncrement(a, b) {
    const aLast = a.increments[a.increments.length - 1];
    const bLast = b.increments[b.increments.length - 1];
    return byMostRecent(aLast, bLast);
}
/**
 * Project filter (SR-019). Matches ONLY the entry's derived
 * `workspace.project`, case-insensitively, as a whole name. An entry with no
 * workspace provenance can never match: it is excluded silently rather than
 * fabricated into one by substring-matching its summary or its ref paths, which
 * would invent coverage the record does not have (COR-A-010).
 */
function matchesProject(entry, project) {
    if (!entry.workspace)
        return false;
    // NFC-normalize both sides so an NFD-spelled filter (macOS paths, some IMEs)
    // matches an NFC-stored project name -- "café" is one project, however spelled.
    return fold(entry.workspace.project) === fold(project.trim());
}
/** Case- and unicode-normalization fold for whole-name project comparison. */
function fold(name) {
    return name.normalize("NFC").toLowerCase();
}
function flatten(records) {
    return records.flatMap((r) => r.sessions.map((s) => ({ ...s, day: r.day })));
}
/** Reverse-chronological comparator: later day first, then later capture time. */
function byMostRecent(a, b) {
    if (a.day !== b.day)
        return a.day < b.day ? 1 : -1;
    return a.time < b.time ? 1 : a.time > b.time ? -1 : 0;
}
//# sourceMappingURL=recent.js.map