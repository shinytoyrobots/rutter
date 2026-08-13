import { config } from "./config.js";

/**
 * Reduce an untrusted, client-authored summary to a single inert line (SR-101)
 * WITHOUT mangling legitimate markdown (SEC-R-004 guards against over-reach).
 *
 * The threat model is narrow and structural: the line is later (a) stored as a
 * YAML string value in a session record and (b) rendered back to a terminal via
 * librarian-recent. So the only things we must neutralise are characters that
 * break out of "one line of inert text":
 *   - line breaks / CRLF, which could forge extra list entries (SEC-A-008) or a
 *     multi-document `---` split (SEC-A-003) -- collapsed to spaces.
 *   - control, ANSI, BiDi-override and zero-width chars, which spoof the
 *     terminal or the record structure (SEC-A-007, SEC-A-009) -- dropped.
 * Ordinary markdown (links, bold, `code`, a leading `---`) is preserved as
 * text; YAML-structural safety comes from serialising via a real YAML encoder
 * (see session-record.ts), not from stripping punctuation here.
 *
 * Patterns are built with `new RegExp` from escape-strings so this source file
 * contains only printable ASCII -- no literal control bytes to be mangled.
 */

const NEWLINE_LIKE = new RegExp("[\\r\\n\\t\\f\\v]+", "g");
const ANSI_CSI = new RegExp("\\u001b\\[[0-9;]*[A-Za-z]", "g");
// C0 controls (includes NUL 0x00), DEL 0x7f, and the C1 range 0x80-0x9f.
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]", "g");
// Zero-width chars and BiDi embeddings/overrides used for display-spoofing.
const INVISIBLE = new RegExp("[\\u200b-\\u200f\\u202a-\\u202e\\u2060\\ufeff]", "g");

export function toInertLine(raw: string): string {
  const spaced = raw.replace(NEWLINE_LIKE, " ");
  const printable = spaced.replace(ANSI_CSI, "").replace(CONTROL, "").replace(INVISIBLE, "");
  const collapsed = printable.replace(/ {2,}/g, " ").trim();
  // Bound length last so a multi-megabyte payload can't blow up memory downstream
  // (SEC-A-011); truncation is graceful, never a partial-write of the record.
  return collapsed.length > config.maxSummaryChars
    ? collapsed.slice(0, config.maxSummaryChars).trimEnd()
    : collapsed;
}

/**
 * Words in a piece of client-authored text, counted the way a reader would:
 * whitespace-separated tokens. Shared by every style-contract length check
 * (SR-021/SR-034 for a session summary, SR-054 for a position stance) so the
 * two carriers of the SAME 40/60 word budget (`config.summaryWordTarget`/
 * `summaryWordCeiling`) never drift into counting words two different ways.
 */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/** True when `text` exceeds the shared style-contract's word ceiling. */
export function overWordCeiling(text: string): boolean {
  return wordCount(text) > config.summaryWordCeiling;
}
