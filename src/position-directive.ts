import { z } from "zod";

/**
 * How a position directive reaches the server WITHOUT the server doing any
 * inference (INV-6) or network I/O (INV-1) -- the SCN-010 counterpart of
 * directive.ts. Deliberately a SEPARATE module and a SEPARATE HTML-comment tag
 * from the session directive, even though SCN-010 describes both as living "on
 * the same sentinel channel" (a client-authored HTML comment the Stop hook
 * lifts out of the transcript, invisible in rendered markdown): reusing
 * directive.ts's own tag would make `parseSessionDirective`'s "keep the LAST
 * occurrence" rule swallow whichever directive kind appears later in a turn,
 * so emitting a position would sometimes silently displace a session summary
 * (or vice versa) within the SAME capture invocation -- a session-record
 * behavior change caused by the mere presence of position capture, which is
 * exactly what SR-055 forbids. A distinct tag (`librarian-position`) makes the
 * two extractions independent by construction: no test has to prove they don't
 * interfere, the regexes simply can't see each other's tag. See
 * decision-ledger.md D2.
 *
 * Grammar (SR-047, literal, taught verbatim in SERVER_INSTRUCTIONS per SR-056):
 *
 *   <!-- librarian-position POSITION <assert|revise|reaffirm|retire> <topic-key>: <stance> -->
 *
 * Kind is the ONLY router capture-cli uses (grammar/prefix match, never content
 * heuristics or a model -- INV-6). A comment carrying this tag that fails to
 * match kind+topic-key, or whose stance is empty/whitespace-only (SR-057), is
 * treated as no directive at all -- reported on stderr, never misrouted to
 * session-summary handling (this is the "malformed-kind handling" gap the
 * 2026-08-12 panel flagged as the spec's least-specified corner; see
 * decision-ledger.md D3) -- and never partially stored.
 */

export const POSITION_KINDS = ["assert", "revise", "reaffirm", "retire"] as const;
export const PositionKindSchema = z.enum(POSITION_KINDS);
export type PositionKind = z.infer<typeof PositionKindSchema>;

const SENTINEL = /<!--\s*librarian-position\s+([\s\S]*?)-->/g;

/**
 * The literal grammar's fixed head: `POSITION <kind> <topic-key>:`. The tail
 * (everything after the colon, to the end of the comment payload) is the raw
 * stance candidate -- untouched here, so a caller can derive `revises` and
 * inline `[[refs]]` from the exact text the client wrote before any
 * normalization (see `deriveRevises`/`deriveRefs` below and capture from
 * position.ts, which applies SR-101 sanitization only to what is actually
 * STORED as the stance, never to what is scanned for these derived fields).
 *
 * The topic-key group is `[^:]+?` (non-greedy, any character but a colon),
 * NOT `[^\s:]+` -- SR-053 requires a topic key be reported and stored
 * byte-verbatim, never REJECTED, and a key containing whitespace (e.g.
 * `My Topic!!`) is exactly the kind of "departs from free-form kebab-case"
 * key SR-053 already contemplates, not a grammar failure. The non-greedy
 * quantifier stops at the FIRST colon in the payload, matching the grammar's
 * own `<topic-key>:` boundary read literally (gen-4/var-1-graft Fix 2; a
 * prior generation's `[^\s:]+` silently rejected any whitespace-bearing key
 * as "not a directive at all," which this fix corrects -- see
 * decision-ledger.md).
 */
const GRAMMAR = /^POSITION\s+(\S+)\s+([^:]+?):([\s\S]*)$/;

export interface ParsedPositionDirective {
  kind: PositionKind;
  topicKey: string;
  /** Raw stance text (after the topic-key colon, otherwise untouched). */
  rawStance: string;
  /** True when `topicKey` is not free-form kebab-case (SR-053: report, never reject). */
  topicKeyNonKebab: boolean;
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Internal, pre-validation shape of whatever the fixed grammar matched. */
interface GrammarMatch {
  /** `null` when the matched kind text is not one of the four literals. */
  kind: PositionKind | null;
  topicKey: string;
  rawStance: string;
}

/**
 * Find the LAST `librarian-position` comment in arbitrary transcript text and
 * match it against the fixed grammar. Returns `null` for either of the two
 * reasons that are NOT SR-047/SR-057's concern here: no `librarian-position`
 * comment at all, or the payload doesn't match `POSITION <kind> <key>:<tail>`
 * shape (no topic-key, no colon). A kind that fails to match one of the four
 * literals, or an empty/whitespace stance, still return a match object here
 * (with `kind: null` or an empty `rawStance` respectively) so callers --
 * `parsePositionDirective` and `findEmptyStancePositionDirective` below -- can
 * each apply their own validation without re-scanning the text or re-running
 * the grammar regex a second time.
 */
function matchPositionGrammar(text: string): GrammarMatch | null {
  let payload: string | null = null;
  for (const match of text.matchAll(SENTINEL)) {
    payload = match[1]!.trim(); // keep the last occurrence, mirrors directive.ts
  }
  if (payload === null) return null;

  const grammar = GRAMMAR.exec(payload);
  if (!grammar) return null;

  const kindResult = PositionKindSchema.safeParse(grammar[1]);
  return {
    kind: kindResult.success ? kindResult.data : null,
    topicKey: grammar[2]!,
    rawStance: grammar[3]!,
  };
}

/**
 * Extract the LAST well-formed `librarian-position` comment from arbitrary
 * transcript text, parse it against the fixed grammar, and reject (return
 * `null`) anything that isn't a complete, non-empty directive:
 *   - no `librarian-position` comment at all
 *   - kind is not one of the four literals (SR-047's routing corner)
 *   - no topic-key, or no colon (grammar mismatch)
 *   - stance is empty or whitespace-only (SR-057)
 * Every rejection collapses to "no directive" -- the same SCN-001 precedent
 * `parseSessionDirective` already applies to an unfilled `<template>` -- rather
 * than a partially-stored event or a silent misroute to session capture. (The
 * SR-057 case additionally gets a stderr diagnostic -- but that is the
 * CALLER's job, via `findEmptyStancePositionDirective` below, not this
 * function's; `parsePositionDirective` itself stays a pure query with no side
 * effects, exactly as it was before gen-4/var-1-graft's Fix 1.)
 */
export function parsePositionDirective(text: string): ParsedPositionDirective | null {
  const m = matchPositionGrammar(text);
  if (!m || !m.kind) return null; // no comment, grammar mismatch, or unrecognized kind
  if (m.rawStance.trim() === "") return null; // SR-057: empty/whitespace stance is no directive

  return {
    kind: m.kind,
    topicKey: m.topicKey,
    rawStance: m.rawStance,
    topicKeyNonKebab: !KEBAB_CASE.test(m.topicKey),
  };
}

export interface EmptyStancePositionDirective {
  kind: PositionKind;
  topicKey: string;
}

/**
 * SR-057 diagnostic detector (gen-4/var-1-graft Fix 1, porting gen-3/
 * var-1-convention's stderr diagnostic onto this lineage): true precisely when
 * `parsePositionDirective` returned `null` FOR THE SR-057 REASON -- a
 * `librarian-position` comment whose kind and topic-key are both well-formed,
 * but whose stance is empty or whitespace-only. Every OTHER "no directive"
 * reason (no comment present at all -- the ordinary no-op turn -- an
 * unrecognized kind, or a missing topic-key/colon) returns `null` here too,
 * deliberately: this lineage's decision-ledger.md D3 already settled those as
 * silent, "no directive at all" outcomes, and this fix does not reopen that.
 * Only the ONE case SR-057 names gets a diagnostic.
 */
export function findEmptyStancePositionDirective(text: string): EmptyStancePositionDirective | null {
  const m = matchPositionGrammar(text);
  if (!m || !m.kind) return null; // absent comment, bad kind, or grammar mismatch -- not this case
  if (m.rawStance.trim() !== "") return null; // has content -- a valid directive, not this case
  return { kind: m.kind, topicKey: m.topicKey };
}

/**
 * Derive an explicit `revises: <event-id>` annotation from the raw stance text
 * (SR-052), without removing it from the stance. The stance the client typed
 * is stored exactly as written (SR-047/SR-054's byte-verbatim guarantee); this
 * is a read-only scan for a convenience field the future Phase B fold can use,
 * layered ON TOP of storage rather than edited OUT of it -- so there is no
 * question of the extraction silently dropping part of what was written (see
 * decision-ledger.md D2 for why this shape was chosen over a separate
 * structured slot).
 */
// Excludes a trailing `)` from the captured id so the common
// "(revises: <event-id>)" parenthetical -- shown in this module's own docs and
// used throughout the test suite -- doesn't fold the closing paren into the id.
const REVISES = /\brevises:\s*([^\s)]+)/i;
export function deriveRevises(rawStance: string): string | undefined {
  return REVISES.exec(rawStance)?.[1];
}

/**
 * Derive named refs from `[[wikilink]]`-style tokens anywhere in the raw
 * stance (SR-048: "any named refs ... exactly as session refs are"), the same
 * convention `refs.ts#normalizeRefPath` already strips for an explicit ref
 * list. A stance is ordinary prose, not a JSON payload, so a client names a
 * note the same way it would inside any vault note: `[[Notes/foo.md]]`.
 * Extraction never removes the token from the stored stance.
 */
const WIKILINK = /\[\[([^\]]+)\]\]/g;
export function deriveRefPaths(rawStance: string): string[] {
  return [...rawStance.matchAll(WIKILINK)].map((m) => m[1]!.trim()).filter((p) => p !== "");
}
