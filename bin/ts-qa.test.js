import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { parseArgs } from "./ts-qa.js";

/**
 * Unit tests for the CLI arg parser (GitHub issue #6, BUG C/D). Run with
 * `node --test bin/ts-qa.test.js` — bin/ is plain JS and lives outside the
 * vitest `src/**` include glob, so it uses the built-in node test runner.
 */

// BUG C: -t / -p with a missing operand must fail loudly, not silently set undefined.
test("-t with no operand throws", () => {
  assert.throws(() => parseArgs(["-t"]), /-t requires a value/);
});

test("-t followed by another flag throws (does not swallow the flag)", () => {
  assert.throws(() => parseArgs(["-t", "--json"]), /-t requires a value/);
});

test("-t with a real operand sets options.tool", () => {
  const { options } = parseArgs(["-t", "tsc"]);
  assert.equal(options.tool, "tsc");
});

test("-p with no operand throws", () => {
  assert.throws(() => parseArgs(["-p"]), /-p requires a value/);
});

test("-p followed by another flag throws", () => {
  assert.throws(() => parseArgs(["-p", "--aggregate"]), /-p requires a value/);
});

test("-p with a real operand sets options.path", () => {
  const { options } = parseArgs(["-p", "src/foo.ts"]);
  assert.equal(options.path, "src/foo.ts");
});

// BUG D: plain --aggregate must be forced read-only.
test("--aggregate forces read-only", () => {
  const { options } = parseArgs(["--aggregate"]);
  assert.equal(options.forceReadOnly, true);
  assert.equal(options.aggregate, true);
});

test("--aggregate --read-only stays read-only", () => {
  const { options } = parseArgs(["--aggregate", "--read-only"]);
  assert.equal(options.forceReadOnly, true);
});

test("--aggregate --write is still rejected", () => {
  assert.throws(
    () => parseArgs(["--aggregate", "--write"]),
    /--aggregate is only valid for read-only/,
  );
});

test("a plain run is NOT forced read-only", () => {
  const { options } = parseArgs([]);
  assert.equal(options.forceReadOnly, undefined);
});

// The bin must actually run when invoked through a SYMLINK — every package
// manager installs this package behind one (pnpm's .pnpm virtual store, npm/yarn
// workspace links), so argv[1] (through the link) differs from import.meta.url
// (resolved to realpath). A URL-equality isInvokedDirectly() check is false for
// every real consumer, silently no-op'ing `ts-qa` / `ts-qa init`. This spawns the
// bin via a symlink and asserts main() runs (unrecognized arg => exit 2 + error).
test("runs through a symlinked bin path (realpath-based direct-invocation check)", () => {
  const realBin = fileURLToPath(new URL("./ts-qa.js", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "tsqa-bin-"));
  const link = join(dir, "ts-qa.js");
  try {
    symlinkSync(realBin, link);
    const res = spawnSync(process.execPath, [link, "--bogus-arg"], {
      encoding: "utf-8",
    });
    assert.equal(
      res.status,
      2,
      `expected main() to run and reject the arg; got status ${res.status}`,
    );
    assert.match(res.stderr, /unrecognized argument/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
