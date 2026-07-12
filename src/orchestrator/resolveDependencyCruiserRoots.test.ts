import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { resolveDependencyCruiserRoots } from "./resolveDependencyCruiserRoots.js";

/**
 * dependency-cruiser needs at least one positional scan target. ts-qa
 * historically hardcoded `src`, which fails `Can't open 'src'` on any repo that
 * does not keep all sources under a single top-level ./src — notably a pnpm
 * monorepo whose packages live under `apps/<pkg>/src`, `packages/<pkg>/src`.
 * `dependencyCruiserScanRoots` in tsQaConfig/ts-qa.json makes the targets
 * configurable; absent, it defaults to the historical `["src"]` so
 * single-package repos are completely unaffected. A present-but-malformed value
 * throws (mirrors resolveDisabledTools): a typo must fail loudly, never quietly
 * cruise the wrong tree or nothing.
 */
describe("resolveDependencyCruiserRoots", () => {
  const dirs: string[] = [];
  const proj = (config?: unknown): string => {
    const dir = mkdtempSync(join(tmpdir(), "tsqa-depcruise-roots-"));
    dirs.push(dir);
    if (config !== undefined) {
      mkdirSync(join(dir, "tsQaConfig"), { recursive: true });
      writeFileSync(
        join(dir, "tsQaConfig", "ts-qa.json"),
        typeof config === "string" ? config : JSON.stringify(config),
      );
    }
    return dir;
  };
  afterEach(() => {
    while (dirs.length > 0)
      rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it("defaults to ['src'] when there is no config file", () => {
    expect(resolveDependencyCruiserRoots(proj())).toEqual(["src"]);
  });

  it("defaults to ['src'] when the config omits dependencyCruiserScanRoots", () => {
    expect(resolveDependencyCruiserRoots(proj({ disabledTools: [] }))).toEqual([
      "src",
    ]);
  });

  it("reads configured scan roots from tsQaConfig/ts-qa.json", () => {
    expect(
      resolveDependencyCruiserRoots(
        proj({
          dependencyCruiserScanRoots: [
            "apps/web/src",
            "packages/ts/api-client/src",
          ],
        }),
      ),
    ).toEqual(["apps/web/src", "packages/ts/api-client/src"]);
  });

  it("throws when dependencyCruiserScanRoots is not an array", () => {
    expect(() =>
      resolveDependencyCruiserRoots(
        proj({ dependencyCruiserScanRoots: "src" }),
      ),
    ).toThrow(/must be an array/i);
  });

  it("throws when an entry is not a string", () => {
    expect(() =>
      resolveDependencyCruiserRoots(
        proj({ dependencyCruiserScanRoots: ["src", 3] }),
      ),
    ).toThrow(/must be strings/i);
  });

  it("throws when dependencyCruiserScanRoots is an empty array", () => {
    expect(() =>
      resolveDependencyCruiserRoots(proj({ dependencyCruiserScanRoots: [] })),
    ).toThrow(/must not be empty/i);
  });

  it("throws on malformed JSON rather than silently defaulting", () => {
    expect(() =>
      resolveDependencyCruiserRoots(proj("{ not valid json")),
    ).toThrow(/parse/i);
  });
});
