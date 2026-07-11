import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { KNOWN_TOOLS, resolveDisabledTools } from "./resolveDisabledTools.js";

/**
 * `disabledTools` lets a project opt a pipeline tool out of the run
 * (tsQaConfig/ts-qa.json `"disabledTools"` or CLI `--skip`). The canonical use
 * case is Playwright: it needs a served instance, so some projects run browser
 * tests as a separate served-instance job and want `ts-qa` to cover only the
 * static + unit surface. Unknown names must fail loudly (a typo that silently
 * disabled nothing — or worse, matched nothing while the author thought a heavy
 * tool was off — is exactly the bug this guards).
 */
describe("resolveDisabledTools", () => {
  const dirs: string[] = [];
  const proj = (config?: unknown): string => {
    const dir = mkdtempSync(join(tmpdir(), "tsqa-disabled-"));
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

  it("returns empty when there is no config and no CLI skips", () => {
    expect([...resolveDisabledTools(proj()).disabled]).toEqual([]);
  });

  it("reads disabledTools from tsQaConfig/ts-qa.json", () => {
    const { disabled, sources } = resolveDisabledTools(
      proj({ disabledTools: ["playwright"] }),
    );
    expect([...disabled]).toEqual(["playwright"]);
    expect(sources.get("playwright")).toBe("config");
  });

  it("merges CLI --skip values with config and records their source", () => {
    const { disabled, sources } = resolveDisabledTools(
      proj({ disabledTools: ["playwright"] }),
      ["vitest"],
    );
    expect([...disabled].sort()).toEqual(["playwright", "vitest"]);
    expect(sources.get("vitest")).toBe("cli");
  });

  it("ignores a missing config file and still honours CLI skips", () => {
    expect([...resolveDisabledTools(proj(), ["knip"]).disabled]).toEqual([
      "knip",
    ]);
  });

  it("throws on an unknown tool name (typo guard)", () => {
    expect(() =>
      resolveDisabledTools(proj({ disabledTools: ["playwrigt"] })),
    ).toThrow(/unknown tool/i);
  });

  it("throws when disabledTools is not an array", () => {
    expect(() =>
      resolveDisabledTools(proj({ disabledTools: "playwright" })),
    ).toThrow(/must be an array/i);
  });

  it("throws on malformed JSON rather than silently ignoring it", () => {
    expect(() => resolveDisabledTools(proj("{ not valid json"))).toThrow(
      /parse/i,
    );
  });

  it("treats an object without a disabledTools key as no-op", () => {
    expect([
      ...resolveDisabledTools(proj({ somethingElse: true })).disabled,
    ]).toEqual([]);
  });

  it("KNOWN_TOOLS covers every pipeline tool name", () => {
    for (const t of [
      "oxlint",
      "prettier",
      "eslintFix",
      "eslintReport",
      "remarkValidateLinks",
      "knip",
      "tsc",
      "dependencyCruiser",
      "vitest",
      "playwright",
    ]) {
      expect(KNOWN_TOOLS).toContain(t);
    }
  });
});
