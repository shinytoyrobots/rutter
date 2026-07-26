import { weeklyCounts } from "./instrumentation.js";

/**
 * `npm run gate [-- <from> <to>]` -- print the per-ISO-week stateful-use count
 * used to evaluate the desirability gate ("unprompted >=3x/week for 2 weeks").
 * Dates are `YYYY-MM-DD`; omit them to count the full history. Read-only: it
 * inspects the log, never appends an event.
 */

const [from, to] = process.argv.slice(2);
const range = {
  from: from ? new Date(from) : undefined,
  to: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
};

const weeks = weeklyCounts(range);
if (weeks.length === 0) {
  console.log("No stateful-use events logged yet.");
} else {
  console.log("stateful-use per ISO week (gate target: >=3):");
  for (const { week, count } of weeks) {
    console.log(`  ${week}: ${count}${count >= 3 ? "  ✓" : ""}`);
  }
}
