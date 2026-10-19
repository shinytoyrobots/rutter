import { vaultRoot } from "./setup.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * hooks/librarian-stop.sh must never break or stall a host's turn. Muse Code waits for a Stop
 * hook as long as it runs (probed 2026-10-18), so a hung capture child has to be bounded by the
 * wrapper. The wrapper is copied beside a fake dist/capture-cli.js so each child behavior can be
 * forced: normal, crashing, hanging.
 */

const wrapper = fileURLToPath(new URL("../hooks/librarian-stop.sh", import.meta.url));
const supervisor = fileURLToPath(new URL("../hooks/supervise-capture.mjs", import.meta.url));
let n = 0;

function rig(captureJs: string): string {
  const root = path.join(vaultRoot, `wrapper-${n++}`);
  fs.mkdirSync(path.join(root, "hooks"), { recursive: true });
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.copyFileSync(wrapper, path.join(root, "hooks", "librarian-stop.sh"));
  fs.copyFileSync(supervisor, path.join(root, "hooks", "supervise-capture.mjs"));
  fs.writeFileSync(path.join(root, "dist", "capture-cli.js"), captureJs, "utf8");
  return root;
}

function run(root: string, input: string, env: Record<string, string> = {}, args: string[] = []) {
  const started = Date.now();
  const res = spawnSync("/bin/bash", [path.join(root, "hooks", "librarian-stop.sh"), ...args], {
    input,
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env },
    encoding: "utf8",
    timeout: 30_000,
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, ms: Date.now() - started };
}

test("wrapper: the child receives the hook's stdin and arguments", () => {
  const root = rig(`let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{ require("node:fs").writeFileSync(${JSON.stringify(path.join(vaultRoot, "wrapper-echo.txt"))}, process.argv.slice(2).join(" ") + "|" + s); });`.replace("require(", "process.getBuiltinModule("));
  const res = run(root, '{"a":1}', {}, ["--client", "muse"]);
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
  assert.equal(fs.readFileSync(path.join(vaultRoot, "wrapper-echo.txt"), "utf8"), '--client muse|{"a":1}');
});

test("wrapper: a crashing child still exits 0 with empty stdout", () => {
  const root = rig(`throw new Error("boom");`);
  const res = run(root, "{}");
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("wrapper: a hung child is killed at the timeout and the hook still exits 0", () => {
  const root = rig(`setInterval(() => {}, 1000);`);
  const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: "2" });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
  assert.ok(res.ms >= 1900, `waited for the child (${res.ms} ms)`);
  assert.ok(res.ms < 8000, `bounded by the timeout, not the hang (${res.ms} ms)`);
});

test("wrapper: a child that ignores SIGTERM is still killed", () => {
  const root = rig(`process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);`);
  const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: "1" });
  assert.equal(res.status, 0);
  assert.ok(res.ms < 8000, `escalated to SIGKILL (${res.ms} ms)`);
});

test("wrapper: a fast child returns promptly and does not wait out the watchdog", () => {
  const root = rig(`process.exit(0);`);
  const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: "20" });
  assert.equal(res.status, 0);
  assert.ok(res.ms < 5000, `returned in ${res.ms} ms`);
});

test("wrapper: unusable or zero timeout values mean the default, never an instant kill or an error", () => {
  // A child that lives 1.5 s: a wrongly honored "0" or "00" would kill it early (no marker), and "08" must
  // not trip octal arithmetic (it is simply 8 seconds).
  for (const bad of ["abc", "0", "00", "-3", "", "1e2", "601", "0x10", "08"]) {
    const marker = path.join(vaultRoot, `wrapper-late-${n}-${bad.replace(/\W/g, "_")}.txt`);
    const root = rig(`setTimeout(() => process.getBuiltinModule("node:fs").writeFileSync(${JSON.stringify(marker)}, "done"), 1500);`);
    const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: bad });
    assert.equal(res.status, 0, `timeout "${bad}"`);
    assert.ok(fs.existsSync(marker), `timeout "${bad}": the child ran to completion instead of being cut short or failing`);
  }
});

test("wrapper: a fractional timeout is honored", () => {
  const root = rig(`setInterval(() => {}, 1000);`);
  const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: "0.5" });
  assert.equal(res.status, 0);
  assert.ok(res.ms < 4000, `stopped near 0.5 s + grace, not the 20 s default (${res.ms} ms)`);
});

test("wrapper: it does not depend on ps", () => {
  const root = rig(`setInterval(() => {}, 1000);`);
  const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: "1", PATH: "/nonexistent" , LIBRARIAN_NODE: process.execPath });
  assert.equal(res.status, 0);
  assert.ok(res.ms < 6000, `still bounded with no usable PATH (${res.ms} ms)`);
});

test("wrapper: LIBRARIAN_NODE selects the node binary (Muse clears PATH)", () => {
  const marker = path.join(vaultRoot, "wrapper-node.txt");
  const root = rig(`process.getBuiltinModule("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");`);
  const res = run(root, "{}", { LIBRARIAN_NODE: process.execPath, PATH: "/nonexistent" });
  assert.equal(res.status, 0);
  assert.equal(fs.readFileSync(marker, "utf8"), "ran");
});

test("wrapper: a noisy child cannot put anything on the hook's stdout", () => {
  const root = rig(`console.log("banner"); process.stdout.write("more");`);
  const res = run(root, "{}");
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("wrapper: a timed-out child leaves no process behind", () => {
  const marker = path.join(vaultRoot, `wrapper-pid-${n}.txt`);
  const root = rig(`process.getBuiltinModule("node:fs").writeFileSync(${JSON.stringify(marker)}, String(process.pid)); setInterval(() => {}, 1000);`);
  const res = run(root, "{}", { LIBRARIAN_CAPTURE_TIMEOUT_SEC: "1" });
  assert.equal(res.status, 0);
  const pid = Number(fs.readFileSync(marker, "utf8"));
  assert.throws(() => process.kill(pid, 0), "the hung child is gone");
});
