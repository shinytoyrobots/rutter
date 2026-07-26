import { recent } from "./recent.js";

/**
 * `npm run recent [-- <count>] [-- --days <N>]` -- read recent session summaries
 * from the terminal. Uses the pure `recent()` reader (no stateful-use event): the
 * instrumented "reaching for it" surface is the MCP tool, not this inspector.
 */

const args = process.argv.slice(2);
const daysFlag = args.indexOf("--days");
const windowDays = daysFlag >= 0 ? Number(args[daysFlag + 1]) : undefined;
const count = args.find((a) => /^\d+$/.test(a));

const { entries, empty } = recent({
  windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
  count: count ? Number(count) : undefined,
});

if (empty) {
  console.log("No recent sessions recorded yet.");
} else if (entries.length === 0) {
  console.log("No sessions in the requested window.");
} else {
  for (const e of entries) {
    console.log(`${e.day} ${e.time.slice(11, 19)} — ${e.summary}`);
    for (const ref of e.refs) console.log(`   refs: ${ref.path}@${ref.hash}`);
  }
}
