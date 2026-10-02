import { resetLibrarian, vaultRoot } from "./setup.js";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deriveWorkspace, redactRemoteUrl } from "../src/workspace.js";

// A git remote is sometimes written with a credential in it. The remote URL is stored in
// a session record (a markdown file in the user's notes, often synced or committed), so a
// token read from .git/config must never be copied across.

beforeEach(resetLibrarian);

test("a token or password in a scheme-style URL is dropped; the host and path are kept", () => {
  assert.equal(redactRemoteUrl("https://ghp_exampletoken123@github.com/org/repo.git"), "https://github.com/org/repo.git");
  assert.equal(redactRemoteUrl("https://user:s3cret@gitlab.example.com/group/repo.git"), "https://gitlab.example.com/group/repo.git");
  assert.equal(redactRemoteUrl("https://oauth2:abc@host:8443/a/b.git"), "https://host:8443/a/b.git", "a port survives");
  assert.equal(redactRemoteUrl("ssh://git@github.com/org/repo.git"), "ssh://github.com/org/repo.git");
  assert.equal(redactRemoteUrl("HTTPS://tok@Host.com/x"), "HTTPS://Host.com/x", "the scheme is matched case-insensitively");
});

test("query strings and fragments, which can carry a token, are dropped", () => {
  assert.equal(redactRemoteUrl("https://github.com/org/repo.git?access_token=abc123"), "https://github.com/org/repo.git");
  assert.equal(redactRemoteUrl("https://github.com/org/repo.git#frag"), "https://github.com/org/repo.git");
  assert.equal(redactRemoteUrl("https://tok@github.com/org/repo.git?x=1#y"), "https://github.com/org/repo.git");
});

test("ordinary remotes are unchanged", () => {
  for (const ok of [
    "https://github.com/shinytoyrobots/rutter.git",
    "git@github.com:shinytoyrobots/rutter.git",
    "ssh://github.com/org/repo.git",
    "file:///srv/git/repo.git",
    "../relative/path.git",
  ]) {
    assert.equal(redactRemoteUrl(ok), ok);
  }
});

test("end to end: a credential in .git/config never reaches the derived workspace", () => {
  const root = path.join(vaultRoot, "redaction", "with-token");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".git", "config"),
    ['[core]', '\tbare = false', '[remote "origin"]', "\turl = https://ghp_SECRETSECRET@github.com/org/repo.git"].join("\n") + "\n",
    "utf8"
  );

  const workspace = deriveWorkspace(root);
  assert.ok(workspace, "a workspace is derived");
  assert.equal(workspace.repo, "https://github.com/org/repo.git");
  assert.ok(!JSON.stringify(workspace).includes("SECRETSECRET"), "the token appears nowhere in what would be stored");
});
