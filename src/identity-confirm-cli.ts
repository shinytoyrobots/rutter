import { readAllRecords } from "./session-record.js";
import { buildVaultHashIndex, distinctRefs, appendBindings } from "./identity.js";
import { normalizeRefPath } from "./refs.js";

/**
 * `npm run identity-confirm -- <from-path> <to-path>` -- human confirmation
 * for a dead ref that exact-hash matching could not resolve on its own
 * (SCN-009/SR-038/SR-044): zero candidates (the note was renamed AND edited,
 * so no current note's hash matches what was recorded) or more than one
 * (duplicate content -- ambiguity that stays ambiguity until a person picks).
 *
 * Local-only by design (SR-044): this is a terminal command, a peer of `npm
 * run recent` / `npm run gate`, NOT an MCP tool -- an agent should never be
 * able to silently rewrite what a dead ref means.
 *
 * Validates the chosen `to-path` against the CURRENT vault before writing
 * anything (existence, not a hash match -- the rename+edit case is exactly
 * the one where the hash no longer matches). Writes nothing to the vault and
 * never touches a stored session entry (INV-2/INV-3): the ledger append is
 * the only durable effect, same choke point (fs-safe.ts) every other write
 * in this project goes through.
 *
 * `npm run identity-confirm -- <from-path> <hash> <to-path>` disambiguates
 * when the same recorded path carries more than one distinct unresolved hash.
 */

function usage(): never {
  console.error("usage: npm run identity-confirm -- <from-path> <to-path>");
  console.error(
    "       npm run identity-confirm -- <from-path> <hash> <to-path>   " +
      "(disambiguate when <from-path> has more than one unresolved hash)"
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2 || args.length > 3) usage();

const fromPath = args[0]!;
const explicitHash = args.length === 3 ? args[1] : undefined;
const toPathRaw = args[args.length - 1]!;

const hashIndex = buildVaultHashIndex();
const dead = distinctRefs(readAllRecords()).filter(
  (r) => r.path === fromPath && !hashIndex.paths.has(r.path)
);

if (dead.length === 0) {
  console.error(
    `no unresolved reference recorded for "${fromPath}" -- it either resolves already, ` +
      `was never referenced, or is already bound (nothing to confirm).`
  );
  process.exit(1);
}

let target = dead[0]!;
if (explicitHash) {
  const match = dead.find((r) => r.hash === explicitHash);
  if (!match) {
    console.error(
      `no unresolved reference for "${fromPath}" carries hash ${explicitHash}. ` +
        `Recorded unresolved hash(es): ${dead.map((r) => r.hash).join(", ")}`
    );
    process.exit(1);
  }
  target = match;
} else if (dead.length > 1) {
  console.error(`"${fromPath}" has ${dead.length} distinct unresolved hashes -- disambiguate with:`);
  for (const r of dead) console.error(`  npm run identity-confirm -- ${fromPath} ${r.hash} <to-path>`);
  process.exit(1);
}

const normalizedTo = normalizeRefPath(toPathRaw);
if (normalizedTo === null) {
  console.error(`"${toPathRaw}" is not a valid vault-relative path.`);
  process.exit(1);
}
if (!hashIndex.paths.has(normalizedTo)) {
  console.error(`"${normalizedTo}" does not resolve to a current vault note -- refusing to confirm a binding to it.`);
  process.exit(1);
}

const appended = appendBindings([
  { from: target.path, to: normalizedTo, hash: target.hash, detected: "confirmed", ts: new Date().toISOString() },
]);

if (appended.length > 0) {
  console.error(`confirmed: ${target.path} -> ${normalizedTo} (${target.hash})`);
} else {
  console.error(`already confirmed: ${target.path} -> ${normalizedTo} (${target.hash})`);
}
