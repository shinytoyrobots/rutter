import { recent } from "./recent.js";

/**
 * `npm run recent [-- <count>] [-- --days <N>] [-- --project <name>]` -- read
 * recent session summaries from the terminal. Uses the pure `recent()` reader (no
 * stateful-use event): the instrumented "reaching for it" surface is the MCP tool,
 * not this inspector.
 */

const args = process.argv.slice(2);
const daysFlag = args.indexOf("--days");
const windowDays = daysFlag >= 0 ? Number(args[daysFlag + 1]) : undefined;
const projectFlag = args.indexOf("--project");
const project = projectFlag >= 0 ? args[projectFlag + 1] : undefined;
const count = args.find((a) => /^\d+$/.test(a));

const { sessions, empty } = recent({
  windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
  count: count ? Number(count) : undefined,
  project,
  detail: args.includes("--brief") ? "brief" : undefined,
});

if (empty) {
  console.log("No recent sessions recorded yet.");
} else if (sessions.length === 0) {
  console.log(project ? `No sessions recorded for project "${project}".` : "No sessions in the requested window.");
} else {
  for (const s of sessions) {
    // A multi-increment session is headed so the steps read as one session's work
    // rather than as unrelated entries; a single-increment one prints as before.
    if (s.incrementCount > 1) {
      const label = s.project ? ` [${s.project}]` : "";
      const span = s.day === s.lastDay ? s.day : `${s.day} → ${s.lastDay}`;
      const omitted = s.abbreviated ? ` (showing first and last; ${s.incrementCount - 2} omitted)` : "";
      console.log(`${span}${label} — one session, ${s.incrementCount} steps${omitted}:`);
    }
    for (const e of s.increments) {
      const indent = s.incrementCount > 1 ? "  · " : "";
      // Project shown only when the entry carries provenance (SR-019, quiet when absent).
      const label = s.incrementCount > 1 ? "" : e.workspace ? ` [${e.workspace.project}]` : "";
      console.log(`${indent}${e.day} ${e.time.slice(11, 19)}${label} — ${e.summary}`);
      for (const ref of e.refs) console.log(`   ${indent ? "  " : ""}refs: ${ref.path}@${ref.hash}`);
    }
  }
}
