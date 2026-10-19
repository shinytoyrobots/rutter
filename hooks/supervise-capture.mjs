#!/usr/bin/env node
/**
 * Run the capture CLI under a wall-clock limit, for hosts that wait on a Stop hook for as long as
 * it runs (Muse Code held a turn for a full 300 s hang, probed 2026-10-18).
 *
 * Node owns the child, so there is no PID to guess at, no `ps` to depend on, and no second process to
 * orphan: the limit is a timer, the signal goes through the child handle (a no-op once it has exited),
 * and the exit is always 0 with nothing on stdout (the hook contract in librarian-stop.sh). The child
 * inherits stdin directly and its stdout is discarded; stderr stays the diagnostic channel.
 *
 *   LIBRARIAN_CAPTURE_TIMEOUT_SEC  seconds, a positive number up to 600; anything else means 20.
 */
import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_SEC = 20;
const GRACE_MS = 2000;

function limitMs(raw) {
  const s = (raw ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return DEFAULT_SEC * 1000;
  const sec = Number(s);
  return sec > 0 && sec <= 600 ? Math.round(sec * 1000) : DEFAULT_SEC * 1000;
}

const capture = path.join(import.meta.dirname, "..", "dist", "capture-cli.js");
let child;
try {
  child = spawn(process.execPath, [capture, ...process.argv.slice(2)], { stdio: ["inherit", "ignore", "inherit"] });
} catch {
  process.exit(0);
}

let killTimer;
const termTimer = setTimeout(() => {
  child.kill("SIGTERM");
  killTimer = setTimeout(() => {
    child.kill("SIGKILL");
    // If even SIGKILL cannot end it, give up waiting: the hook must return.
    setTimeout(() => process.exit(0), GRACE_MS).unref();
  }, GRACE_MS);
}, limitMs(process.env.LIBRARIAN_CAPTURE_TIMEOUT_SEC));

const finish = () => {
  clearTimeout(termTimer);
  clearTimeout(killTimer);
  process.exit(0);
};
child.on("exit", finish);
child.on("error", finish);
