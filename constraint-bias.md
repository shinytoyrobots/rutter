# Variant bias: maintainability (gen-1 / var-3)

**Bias assigned:** maintainability — composability, low coupling, named
abstractions, optimized for the next reader.

**Most consequential design choices under this bias:**

1. **Layered seams, single-responsibility modules.** The slice is split into small
   files (all 24–138 lines, well under the 200-line bound): pure domain
   (`sanitize`, `refs`, `session-record`, `recent`, `enrichment`,
   `instrumentation`), a composition seam (`app.ts`) that attaches the one
   cross-cutting concern (instrumentation) in exactly one place, and thin
   transport/CLI shells. The server and the tests both drive the same `app.ts`
   seam, so behavior is testable without standing up MCP.

2. **One write choke point (`fs-safe.ts`).** All path confinement, symlink
   refusal, and atomic append-only writes live in one auditable module, so INV-2
   (write scope) and INV-3 (no hard-delete) can be reasoned about locally rather
   than re-checked at every call site. This doubles as the SR-101 security
   boundary.

3. **Typed record as source of truth; body is a rendered view.** The
   mdbase-shaped Zod schema (`session-record`) is the contract; the human-readable
   markdown is regenerated, never hand-parsed.

**Trade-offs for the evaluator:** more files/indirection than a
simplicity-biased variant would use; append-preserving writes use atomic
temp+rename (read-merge-write) rather than raw `appendFile`, chosen so multi-
session days keep rich typed frontmatter while still preserving every prior
entry. Capture uses a client-emitted directive (documented manual-for-now).
