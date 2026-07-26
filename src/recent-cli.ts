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

const { entries, empty } = recent({
  windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
  count: count ? Number(count) : undefined,
  project,
});

if (empty) {
  console.log("No recent sessions recorded yet.");
} else if (entries.length === 0) {
  console.log(project ? `No sessions recorded for project "${project}".` : "No sessions in the requested window.");
} else {
  for (const e of entries) {
    // Project shown only when the entry carries provenance (SR-019, quiet when absent).
    const label = e.workspace ? ` [${e.workspace.project}]` : "";
    console.log(`${e.day} ${e.time.slice(11, 19)}${label} — ${e.summary}`);
    for (const ref of e.refs) console.log(`   refs: ${ref.path}@${ref.hash}`);
  }
}
