import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { config } from "./config.js";
import { atomicWrite, existsConfined } from "./fs-safe.js";
import { contentHash, type VersionedRef } from "./refs.js";
import { walkMarkdown } from "./vault.js";
import { readAllRecords, type SessionRecord } from "./session-record.js";
import { resetIdentitySchema, type DB } from "./db.js";

/**
 * Note identity (SCN-008/SCN-009): when a recorded ref's path no longer
 * resolves in the vault, bind it deterministically to a renamed note when
 * exactly one current note's content hash matches what was last recorded, and
 * otherwise surface the ambiguity rather than guess (INV-6 -- no heuristics, no
 * similarity scores, no model).
 *
 * Two storage layers, deliberately different lifetimes (mirrors
 * session-record.ts's split between the durable file and the disposable cache):
 *   - The LEDGER (`_librarian/note-identity.md`) is the only durable write on
 *     this path (INV-2) and the only place a binding is decided. It is
 *     append-only (INV-3): a reindex NEVER rewrites or removes an earlier
 *     entry, only appends a fresher one when the answer changes.
 *   - The PROJECTION (`identity_bindings` / `identity_unresolved` SQLite
 *     tables, see db.ts) is rebuilt wholesale from the vault + the ledger at
 *     every reindex (INV-4/SR-040/041) so read surfaces query a table, not the
 *     ledger file, per call.
 */

export const IDENTITY_COLLECTION = "librarian.note-identity";
export const IDENTITY_SCHEMA_ID = "note-identity@1";

export const DetectedSchema = z.enum(["exact-hash", "confirmed"]);
export type Detected = z.infer<typeof DetectedSchema>;

export const IdentityBindingSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  hash: z.string(),
  ts: z.string(),
  detected: DetectedSchema,
});
export type IdentityBinding = z.infer<typeof IdentityBindingSchema>;

const LedgerSchema = z.object({
  collection: z.literal(IDENTITY_COLLECTION),
  schema: z.string(),
  bindings: z.array(IdentityBindingSchema),
});

/** Absolute path of the identity ledger, inside `_librarian/` (INV-2). */
export function ledgerPath(): string {
  return path.join(config.librarianDir, "note-identity.md");
}

/**
 * Parse and validate the ledger. Returns `[]` (never throws) for a missing or
 * malformed file -- same "absent is the legitimate empty state" contract as
 * `session-record.readAllRecords` -- so a corrupt ledger can't take down
 * reindex or a read surface.
 */
export function readLedger(): IdentityBinding[] {
  let raw: string;
  try {
    raw = fs.readFileSync(ledgerPath(), "utf8");
  } catch {
    return [];
  }
  try {
    const parsed = matter(raw);
    const result = LedgerSchema.safeParse(parsed.data);
    return result.success ? result.data.bindings : [];
  } catch {
    return [];
  }
}

/**
 * Force every binding into ONE canonical field order before handing the array
 * to the YAML dumper (gen-2/var-3-reversibility fix). Without this, a binding
 * that survived a `readLedger()` round-trip carries its FIELDS in whatever
 * order `IdentityBindingSchema`'s zod parse happens to produce -- which need
 * not match the field order it was originally constructed and written with.
 * `appendBindings` always re-serializes the FULL array (existing entries plus
 * the new one), so a silent key-order drift on an untouched existing entry
 * would rewrite its bytes even though every value is unchanged -- exactly the
 * "byte-append-only" guarantee (INV-3, and this variant's own hard
 * requirement) is meant to rule out. Normalizing here, once, at the single
 * write choke point, makes every entry's serialization a pure function of its
 * VALUES alone, independent of provenance (freshly built vs. re-parsed) or of
 * zod's internal object-construction order.
 */
// M1 (chavruta dissent-2026-08-05-0002, applied pre-ship 2026-08-05): the
// canonical list must stay in lockstep with IdentityBindingSchema by CHECK,
// not by comment. tsc guards REQUIRED fields, but an additive-OPTIONAL schema
// field would satisfy the types while silently vanishing through the rebuild
// below -- and appendBindings re-serializes the FULL array, so the next
// append would rewrite every prior entry's bytes without it: the exact
// failure class this function exists to rule out, reintroduced through the
// fix. Two guards, both loud, both failing CLOSED (a thrown append preserves
// the ledger; a silent drop destroys data INV-3 never lets us restore):
// the module-load assertion catches a schema field this list does not know;
// the per-binding check catches a runtime object carrying keys the schema
// does not know.
const CANONICAL_BINDING_FIELDS = ["id", "from", "to", "hash", "detected", "ts"] as const;
{
  const schemaKeys = Object.keys(IdentityBindingSchema.shape).sort().join(",");
  const canonical = [...CANONICAL_BINDING_FIELDS].sort().join(",");
  if (schemaKeys !== canonical) {
    throw new Error(
      `normalizeFieldOrder is out of sync with IdentityBindingSchema: schema fields [${schemaKeys}] vs canonical [${canonical}] -- update CANONICAL_BINDING_FIELDS and normalizeFieldOrder together`
    );
  }
}

function normalizeFieldOrder(b: IdentityBinding): IdentityBinding {
  const extra = Object.keys(b).filter((k) => !(CANONICAL_BINDING_FIELDS as readonly string[]).includes(k));
  if (extra.length > 0) {
    throw new Error(
      `identity binding carries fields outside note-identity@1: [${extra.join(",")}] -- refusing to serialize (a silent drop would rewrite every prior entry without them; update CANONICAL_BINDING_FIELDS and normalizeFieldOrder together)`
    );
  }
  return { id: b.id, from: b.from, to: b.to, hash: b.hash, detected: b.detected, ts: b.ts };
}

function serializeLedger(bindings: IdentityBinding[]): string {
  const ordered = bindings.map(normalizeFieldOrder);
  const record = { collection: IDENTITY_COLLECTION, schema: IDENTITY_SCHEMA_ID, bindings: ordered };
  const body = renderLedgerBody(ordered);
  // `lineWidth: -1` disables folding, same reason as session-record.ts: long
  // content hashes and paths stay on one line.
  return matter.stringify(body, record, { lineWidth: -1 } as Parameters<typeof matter.stringify>[2]);
}

function renderLedgerBody(bindings: IdentityBinding[]): string {
  if (bindings.length === 0) return "# Note identity bindings\n\nNone recorded yet.\n";
  const lines = bindings.map((b) => `- ${b.ts} ${b.detected}: ${b.from} -> ${b.to} (${b.hash})`);
  return `# Note identity bindings\n\n${lines.join("\n")}\n`;
}

/** Byte-identical to an already-recorded entry? (idempotent-append guard.) */
function isDuplicateBinding(existing: IdentityBinding[], candidate: Omit<IdentityBinding, "id">): boolean {
  return existing.some(
    (b) => b.from === candidate.from && b.hash === candidate.hash && b.to === candidate.to && b.detected === candidate.detected
  );
}

let idSeq = 0;
function makeId(now: Date): string {
  idSeq += 1;
  return `${now.toISOString().replace(/[-:.]/g, "")}-${idSeq}`;
}

/**
 * Append zero or more bindings to the ledger, preserving every earlier entry
 * verbatim (INV-3) and skipping any that already exist byte-identical, so
 * repeat reindexes over an unchanged vault never duplicate a row (informative:
 * "ledger appends are idempotent"). Returns the bindings actually appended.
 */
export function appendBindings(
  candidates: Omit<IdentityBinding, "id">[],
  now: Date = new Date()
): IdentityBinding[] {
  if (candidates.length === 0) return [];
  const existing = readLedger();
  const appended: IdentityBinding[] = [];
  for (const c of candidates) {
    if (isDuplicateBinding(existing, c)) continue;
    const binding: IdentityBinding = { id: makeId(now), ...c };
    existing.push(binding);
    appended.push(binding);
  }
  if (appended.length > 0) atomicWrite(ledgerPath(), serializeLedger(existing));
  return appended;
}

/** Current vault paths and a content-hash -> path[] index, for exact-hash matching. */
export interface VaultHashIndex {
  paths: Set<string>;
  byHash: Map<string, string[]>;
}

/**
 * Enumerate the CURRENT vault (candidate pool = the indexer's note
 * enumeration, per spec) and hash each note's raw bytes with the same
 * mechanism `refs.ts` uses to build a ref in the first place, so an exact-hash
 * match here means exactly what it meant when the ref was recorded.
 */
export function buildVaultHashIndex(root: string = config.vaultPath): VaultHashIndex {
  const paths = new Set<string>();
  const byHash = new Map<string, string[]>();
  for (const abs of walkMarkdown(root)) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    paths.add(rel);
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(abs);
    } catch {
      continue; // unreadable -- excluded from the candidate pool, not crashed on
    }
    const hash = contentHash(bytes);
    const list = byHash.get(hash);
    if (list) list.push(rel);
    else byHash.set(hash, [rel]);
  }
  return { paths, byHash };
}

/**
 * Path resolution (identity pass), per spec v3.10.2's glossary entry: a
 * recorded ref's path resolves iff a FILE EXISTS on disk at that vault-relative
 * path, inside vault confinement -- regardless of file type or whether it is
 * an indexed markdown note. `hashIndex.paths` (from `buildVaultHashIndex`,
 * i.e. `walkMarkdown`) covers the common case cheaply, since almost every
 * live ref is to an indexed note; `existsConfined` is the fallback for a
 * confined, live, NON-note artifact (`.gitignore`, `_librarian/*`, an
 * exported `.html`/`.yaml` under `Notes/Reference/`, etc.) -- capture may
 * legitimately reference any confined vault file (`refs.ts`/`buildRef` hashes
 * whatever bytes are actually there), so the identity pass must not treat
 * "not an indexed note" as "dead". Candidate generation for exact-hash
 * matching stays scoped to NOTES ONLY (`hashIndex.byHash`) -- that was never
 * wrong, and this function does not touch it.
 */
function pathResolvesOnDisk(vaultRoot: string, hashIndex: VaultHashIndex, relPath: string): boolean {
  return hashIndex.paths.has(relPath) || existsConfined(vaultRoot, relPath);
}

/** Every distinct (path, hash) pair referenced anywhere across all records. */
export function distinctRefs(records: SessionRecord[]): VersionedRef[] {
  const seen = new Map<string, VersionedRef>();
  for (const r of records) {
    for (const ref of r.refs) seen.set(`${ref.path} ${ref.hash}`, ref);
  }
  return [...seen.values()];
}

export interface PairResolution {
  status: "bound" | "unresolved";
  to?: string;
  detected?: Detected;
  candidates?: string[];
  /**
   * SR-046: set only when `detected === "confirmed"` AND a fresh automatic
   * exact-hash detection points somewhere else. `to` above stays the CONFIRMED
   * target (confirmed is sticky); `conflict.to` is what automatic detection
   * would have said absent the confirmation, surfaced so a human can see the
   * disagreement and re-confirm (SR-044) if the automatic answer is actually
   * the right one now.
   */
  conflict?: { to: string };
}

/**
 * Deterministic resolution for one dead ref's (path, hash) pair (SR-036,
 * SR-037, SR-045, SR-046). Always re-hashes the CURRENT vault directly against
 * the ORIGINALLY RECORDED pair -- never composes through an intermediate
 * binding's `to` -- so a note renamed more than once yields a fresh direct
 * binding rather than a chain (SR-045).
 *
 * SR-045's "newest binding wins" is scoped to AUTOMATIC bindings only
 * (SR-046): once a pair carries a `detected: confirmed` entry, that entry is
 * sticky against automatic re-detection. A fresh single-candidate exact-hash
 * match that disagrees with a confirmed binding is recorded nowhere (no
 * automatic binding is appended for that ref) and surfaced as a `conflict` on
 * the resolution instead -- read surfaces render it, only a fresh human
 * confirmation (SR-044, itself a later `detected: confirmed` entry) can move
 * the binding. Two AUTOMATIC bindings for the same pair still resolve
 * newest-first exactly as SR-045 always did; this only carves out confirmed
 * bindings from being outvoted by automation (see decision-ledger.md).
 */
export function resolvePair(
  ref: VersionedRef,
  hashIndex: VaultHashIndex,
  ledger: IdentityBinding[],
  now: Date
): { resolution: PairResolution; toAppend: Omit<IdentityBinding, "id"> | null } {
  const candidates = (hashIndex.byHash.get(ref.hash) ?? []).filter((p) => p !== ref.path);
  const forPair = ledger.filter((b) => b.from === ref.path && b.hash === ref.hash);
  const latest = forPair.length > 0 ? forPair.reduce((a, b) => (b.ts > a.ts ? b : a)) : null;

  if (candidates.length === 1) {
    const to = candidates[0]!;
    if (latest && latest.to === to) {
      // Already resolves to the same target the ledger already recorded --
      // nothing new to append, whichever provenance decided it.
      return { resolution: { status: "bound", to, detected: latest.detected }, toAppend: null };
    }
    if (latest && latest.detected === "confirmed") {
      // SR-046: confirmed is sticky. The automatic match disagrees with the
      // confirmed target -- keep the confirmed binding, append no automatic
      // binding, surface the disagreement.
      return {
        resolution: { status: "bound", to: latest.to, detected: "confirmed", conflict: { to } },
        toAppend: null,
      };
    }
    // No confirmed binding stands in the way (none exists yet, or the latest
    // entry was itself automatic -- SR-045 newest-wins among automatic
    // bindings). Record the fresh direct match.
    return {
      resolution: { status: "bound", to, detected: "exact-hash" },
      toAppend: { from: ref.path, to, hash: ref.hash, detected: "exact-hash", ts: now.toISOString() },
    };
  }
  if (latest) {
    return { resolution: { status: "bound", to: latest.to, detected: latest.detected }, toAppend: null };
  }
  return { resolution: { status: "unresolved", candidates }, toAppend: null };
}

export interface IdentityPassStats {
  /** Distinct recorded (path, hash) pairs whose path no longer resolves. */
  checked: number;
  bound: number;
  unresolved: number;
  /** New ledger entries actually written this pass (idempotent -- often 0). */
  appended: number;
  ms: number;
}

/**
 * Full identity pass: rebuild the identity projection tables from the vault +
 * the ledger alone (INV-4). Report-only wall-time instrumentation (SR-104) --
 * `ms` is returned for the caller to report; there is no threshold and no
 * failure mode tied to it.
 */
export function runIdentityPass(
  db: DB,
  records: SessionRecord[] = readAllRecords(),
  now: Date = new Date(),
  vaultRoot: string = config.vaultPath
): IdentityPassStats {
  const start = Date.now();
  const hashIndex = buildVaultHashIndex(vaultRoot);
  const ledger = readLedger();
  const refs = distinctRefs(records);

  let checked = 0;
  let bound = 0;
  let unresolved = 0;
  const toAppend: Omit<IdentityBinding, "id">[] = [];
  const projections: Array<{ ref: VersionedRef; resolution: PairResolution }> = [];

  for (const ref of refs) {
    if (pathResolvesOnDisk(vaultRoot, hashIndex, ref.path)) continue; // still resolves -- not a dead ref
    checked++;
    const { resolution, toAppend: pending } = resolvePair(ref, hashIndex, ledger, now);
    if (pending) toAppend.push(pending);
    projections.push({ ref, resolution });
  }

  // Durable write FIRST (the ledger), so the disposable projection never
  // claims a binding that didn't actually get recorded.
  const appended = appendBindings(toAppend, now);

  // Projection tables are rebuilt wholesale every pass (drop-and-rebuild, not
  // incrementally patched), so a ref that resolved normally again, or that no
  // longer appears in any record, leaves no stale row behind.
  resetIdentitySchema(db);
  const insertBinding = db.prepare(
    `INSERT OR REPLACE INTO identity_bindings (from_path, hash, to_path, detected, ts) VALUES (?, ?, ?, ?, ?)`
  );
  const insertUnresolved = db.prepare(
    `INSERT OR REPLACE INTO identity_unresolved (from_path, hash, candidates) VALUES (?, ?, ?)`
  );
  // SR-046: additive alongside identity_bindings -- a bound pair with a
  // conflict still gets its normal identity_bindings row (confirmed, sticky);
  // this table only records that a fresher automatic match disagreed with it.
  const insertConflict = db.prepare(
    `INSERT OR REPLACE INTO identity_conflicts (from_path, hash, confirmed_to, detected_to) VALUES (?, ?, ?, ?)`
  );

  db.exec("BEGIN");
  try {
    for (const { ref, resolution } of projections) {
      if (resolution.status === "bound") {
        insertBinding.run(ref.path, ref.hash, resolution.to!, resolution.detected!, now.toISOString());
        bound++;
        if (resolution.conflict) {
          insertConflict.run(ref.path, ref.hash, resolution.to!, resolution.conflict.to);
        }
      } else {
        insertUnresolved.run(ref.path, ref.hash, JSON.stringify(resolution.candidates ?? []));
        unresolved++;
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return { checked, bound, unresolved, appended: appended.length, ms: Date.now() - start };
}

export interface RefResolution {
  status: "current" | "bound" | "unresolved";
  /** The path to report: unchanged for "current"/"unresolved", the bound target for "bound". */
  path: string;
  detected?: Detected;
  candidates?: string[];
  /** SR-046: present only for a `detected: "confirmed"` binding a fresher automatic exact-hash match disagrees with -- see PairResolution.conflict. */
  conflict?: { to: string };
}

function noteExistsInProjection(db: DB, notePath: string): boolean {
  const row = db.prepare(`SELECT 1 FROM notes WHERE path = ? LIMIT 1`).get(notePath);
  return row !== undefined;
}

/**
 * Read-time resolution (SR-042/SR-043) for one ref, queried against the
 * rebuildable projection -- never against the ledger file directly (that
 * happens once, at reindex, in `runIdentityPass`) -- with ONE narrow exception
 * for path resolution itself (spec v3.10.2): the `notes` projection only ever
 * indexes markdown notes, so a ref to a confined NON-note artifact that still
 * exists on disk (`.gitignore`, `_librarian/*`, a `.html`/`.yaml` export) has
 * no row there even though it plainly still resolves. `existsConfined` covers
 * exactly that gap, and only runs as a fallback when the notes projection
 * didn't already answer "current" -- the common case (an indexed note) never
 * pays for it. Never throws; a ref this projection has no opinion on yet (e.g.
 * captured after the last reindex) reports "unresolved" with an empty
 * candidate list rather than silently passing the stale path through as if
 * nothing were wrong.
 */
export function resolveRef(db: DB, ref: VersionedRef, vaultRoot: string = config.vaultPath): RefResolution {
  if (noteExistsInProjection(db, ref.path)) return { status: "current", path: ref.path };
  if (existsConfined(vaultRoot, ref.path)) return { status: "current", path: ref.path };

  const binding = db
    .prepare(`SELECT to_path, detected FROM identity_bindings WHERE from_path = ? AND hash = ?`)
    .get(ref.path, ref.hash) as { to_path: string; detected: string } | undefined;
  if (binding) {
    const resolution: RefResolution = { status: "bound", path: binding.to_path, detected: binding.detected as Detected };
    // SR-046: only a confirmed binding can carry a conflict row -- automatic
    // bindings among themselves already resolve newest-wins with no conflict
    // to surface (SR-045).
    if (binding.detected === "confirmed") {
      const conflict = db
        .prepare(`SELECT detected_to FROM identity_conflicts WHERE from_path = ? AND hash = ?`)
        .get(ref.path, ref.hash) as { detected_to: string } | undefined;
      if (conflict) resolution.conflict = { to: conflict.detected_to };
    }
    return resolution;
  }

  const row = db
    .prepare(`SELECT candidates FROM identity_unresolved WHERE from_path = ? AND hash = ?`)
    .get(ref.path, ref.hash) as { candidates: string } | undefined;
  let candidates: string[] = [];
  if (row) {
    try {
      candidates = JSON.parse(row.candidates) as string[];
    } catch {
      candidates = [];
    }
  }
  return { status: "unresolved", path: ref.path, candidates };
}
