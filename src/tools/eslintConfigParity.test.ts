import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { RunContext } from "../orchestrator/types.js";
import tool from "./eslintConfigParity.js";

/**
 * The parity check dynamic-imports the consumer's real root config, so these tests
 * write REAL fixture projects to a temp dir (node:fs is NOT mocked here). Each
 * project gets a `package.json` with "type":"module" so an `eslint.config.js`
 * fixture is loaded as ESM — exactly as a real consumer (e.g. the frontend) is.
 * Temp dirs are left for the OS to reap (mkdtemp under tmpdir).
 */
function project(fixtures: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "tsqa-parity-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  for (const [name, content] of Object.entries(fixtures)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

function ctxFor(cwd: string, packageRoot = "/pkg/ts-qa-ci"): RunContext {
  return {
    cwd,
    platform: "generic",
    ci: true,
    readOnly: true,
    aggregate: false,
    hasBeenRestarted: false,
    json: false,
    llm: false,
    packageRoot,
  };
}

const MARKED_CONFIG = `export default Object.defineProperty([], Symbol.for("@longtermsupport/ts-qa-ci:resolved-eslint-config"), { value: true });
`;

describe("eslintConfigParity tool", () => {
  it("is a non-mutating, path-agnostic Phase 0 tool", () => {
    expect(tool.phase).toBe(0);
    expect(tool.mutates).toBe(false);
    expect(tool.pathSupporting).toBe(true);
  });

  it("is clean when self-hosting (cwd === packageRoot), even with a bad root config", async () => {
    const dir = project({ "eslint.config.js": "export default [];" });
    const result = await tool.run(ctxFor(dir, dir));
    expect(result.exitClass).toBe("clean");
  });

  it("is clean when there is NO root config (qaConfig-only is valid)", async () => {
    const dir = project({});
    const result = await tool.run(ctxFor(dir));
    expect(result.exitClass).toBe("clean");
    expect(result.stdout).toMatch(/linting via ts-qa only/i);
  });

  it("is clean when the root config delegates (carries the marker)", async () => {
    const dir = project({ "eslint.config.js": MARKED_CONFIG });
    const result = await tool.run(ctxFor(dir));
    expect(result.exitClass).toBe("clean");
    expect(result.stdout).toMatch(/in sync/i);
  });

  it("FAILS when the root config is present but unmarked (divergent rules)", async () => {
    const dir = project({ "eslint.config.js": "export default [];" });
    const result = await tool.run(ctxFor(dir));
    expect(result.exitClass).toBe("failure");
    expect(result.stdout).toMatch(/does NOT delegate/i);
    expect(result.stdout).toMatch(/projectEslintConfig/);
  });

  it("FAILS with the underlying error when the root config throws on import", async () => {
    const dir = project({ "eslint.config.js": "throw new Error('boom');" });
    const result = await tool.run(ctxFor(dir));
    expect(result.exitClass).toBe("failure");
    expect(result.stdout).toMatch(/failed to load/i);
    expect(result.stdout).toMatch(/boom/);
  });

  it("FAILS on an eslint.config.ts it cannot verify without a TS loader", async () => {
    const dir = project({ "eslint.config.ts": "export default [];" });
    const result = await tool.run(ctxFor(dir));
    expect(result.exitClass).toBe("failure");
    expect(result.stdout).toMatch(/eslint\.config\.ts cannot be verified/i);
  });

  it("suppresses the advisory stdout under --json for the no-config case", async () => {
    const dir = project({});
    const result = await tool.run({ ...ctxFor(dir), json: true });
    expect(result.exitClass).toBe("clean");
    expect(result.stdout).toBe("");
  });
});
