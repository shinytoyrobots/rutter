import { toInertLine } from "./sanitize.js";
import type { RecalledEvent, TopicView } from "./position-recall.js";
import type { VersionedRef } from "./refs.js";

/**
 * How a recalled position is worded (SCN-011's attribution and inert-rendering
 * criteria; SR-060, SR-062, SR-063, SR-064).
 *
 * Pure text in, pure text out: no database handle, no MCP types, no clock.
 * Everything this file needs was already decided by position-recall.ts, so the
 * wording can be read, reviewed and unit-tested on its own -- which matters
 * because the wording is where SR-062's attribution promise is actually kept.
 *
 * ONE RULE, APPLIED WITHOUT EXCEPTION: nothing reaches the returned string
 * except through `inert()`. SR-064 names the topic key specifically -- this is
 * the first read surface in the server that ever prints a raw, unbounded,
 * client-chosen topic key, and Phase A's SG-10 deferred exactly that gap to
 * "a future Phase B renderer". But a topic key is not the only unbounded,
 * client-authored value on the page: a `session_id` comes from the hook
 * payload, a `revises` pointer is scraped out of prose by a regex that permits
 * any non-whitespace, and a ref path is whatever confined filename was on
 * disk. None of those is sanitized on the write path. Sanitizing the topic key
 * alone would satisfy SR-064's letter and still print an ANSI escape from the
 * next field along, so the rule here is the field-agnostic one. Applying it to
 * the stance is provably free: capture already stores the stance as
 * `toInertLine` output and the function is idempotent, so the byte-verbatim
 * guarantee (SR-060) is untouched. See decision-ledger.md D-inert-scope.
 */

/** The single funnel every client-authored value passes through before printing. */
function inert(raw: string): string {
  return toInertLine(raw);
}

/** `YYYY-MM-DD` from a stored ISO instant. */
function day(ts: string): string {
  return inert(ts).slice(0, 10);
}

/** `HH:MM:SS` from a stored ISO instant, matching recent.ts's rendering. */
function clock(ts: string): string {
  return inert(ts).slice(11, 19);
}

function renderRefs(refs: VersionedRef[]): string {
  return refs.map((r) => `${inert(r.path)}@${inert(r.hash)}`).join(", ");
}

/**
 * SR-062's provenance line, stated on every rendered stance without exception.
 *
 * - `formed` is the topic's ORIGINAL `assert` timestamp. A chain with no
 *   `assert` says so instead of promoting another event into the role.
 * - `revised` appears only where a `revise` exists, and names the LATEST one.
 *   A `reaffirm` never appears here (spec v12.0.0) -- it is in the chain view.
 * - `retired` appears only for a retired topic, and is labelled a retirement,
 *   never folded into the revision clause.
 */
export function renderAttribution(view: TopicView): string {
  const { attribution } = view;
  const parts = [
    attribution.formed
      ? `formed ${day(attribution.formed)}`
      : `first recorded ${day(attribution.earliest)} (no assert event)`,
  ];
  if (attribution.revised) parts.push(`revised ${day(attribution.revised)}`);
  if (attribution.retired) parts.push(`retired ${day(attribution.retired)}`);

  let line = `from your position record: ${parts.join(", ")}`;
  // SR-063: never alongside a retired stub -- `view.dormant` is already false
  // for a retired topic, so this reads as a plain consequence rather than a
  // second rule that could drift from the first.
  if (view.dormant) {
    line += `; dormant — nothing recorded since ${day(view.live.ts)}`;
  }
  return line;
}

/** One chain event, oldest-first bullet form. */
export function renderChainEvent(event: RecalledEvent): string {
  const session = event.sessionId ? ` [${inert(event.sessionId)}]` : "";
  const revises = event.revises ? ` (revises: ${inert(event.revises)})` : "";
  const refs = event.refs.length > 0 ? ` (refs: ${renderRefs(event.refs)})` : "";
  return `· ${inert(event.kind)} ${day(event.ts)} ${clock(event.ts)}${session} "${inert(
    event.stance
  )}"${revises}${refs}`;
}

/**
 * One topic. The live position only, unless the view carries a chain -- the
 * default response is the live position whatever matched it (SR-061).
 *
 * A retired topic renders as a stub carrying the RETIRE event's own kind,
 * timestamp, session id, refs and byte-verbatim stance (SR-060). Its stance
 * line is labelled `retired:` so the reader cannot mistake the retirement's own
 * text -- typically a reason -- for the stance it withdrew. Nothing is dropped
 * from the chain to produce it.
 */
export function renderTopicView(view: TopicView, index?: number): string {
  const number = index === undefined ? "" : `${index + 1}. `;
  const label = view.retired ? "retired" : inert(view.live.kind);
  const lines = [
    `${number}${inert(view.topicKey)} — ${renderAttribution(view)}`,
    `   ${label}: "${inert(view.live.stance)}"`,
  ];
  if (view.live.sessionId) lines.push(`   session: ${inert(view.live.sessionId)}`);
  if (view.live.refs.length > 0) lines.push(`   refs: ${renderRefs(view.live.refs)}`);
  if (view.chain) {
    lines.push(`   chain (${view.eventCount} events, oldest first):`);
    for (const event of view.chain) lines.push(`     ${renderChainEvent(event)}`);
  } else if (view.eventCount > 1) {
    // Say that there is more, without shipping it: matching scope and response
    // scope are independent knobs and the caller has to know the second one exists.
    lines.push(`   ${view.eventCount} events recorded — ask with chain: true for the full history`);
  }
  return lines.join("\n");
}

/** A list answer (free-text / note-identity modes), numbered like search results. */
export function renderTopicList(views: TopicView[]): string {
  return views.map((view, i) => renderTopicView(view, i)).join("\n\n");
}

/**
 * The not-found text for a topic-key query (SR-061). A normal, non-error
 * result carrying one human-readable text block that names the unmatched key,
 * worded exactly as `librarian-get-note`'s "Note not found: <path>" already is
 * -- and the key goes through `inert()` on the way, because an error message is
 * one of the three print sites SR-064 names explicitly.
 */
export function renderTopicNotFound(topicKey: string): string {
  return `Position not found: ${inert(topicKey)}`;
}

/** Empty-list wording for the free-text / note-identity modes. */
export function renderNoMatches(what: string, value: string): string {
  return `No positions matched ${what} "${inert(value)}".`;
}
