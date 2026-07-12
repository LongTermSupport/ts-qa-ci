import { describe, expect, it, vi } from "vitest";

/** loadSurfaces reads tsQaConfig/ts-qa.json — node:fs is mocked with a virtual map. */
const { files } = vi.hoisted(() => ({ files: new Map<string, string>() }));
vi.mock("node:fs", () => ({
  existsSync: (p: string) => files.has(p),
  readFileSync: (p: string) => {
    const v = files.get(p);
    if (v === undefined) throw new Error(`ENOENT: ${p}`);
    return v;
  },
}));

const {
  ALL_TSQA_DISABLEABLE_RULE_IDS,
  DEFAULT_SURFACES,
  loadSurfaces,
  surfaceIgnores,
  surfaceOffBlocks,
} = await import("./surfaces.js");

const CWD = "/proj";
const CONFIG = `${CWD}/tsQaConfig/ts-qa.json`;
function setConfig(obj: unknown): void {
  files.clear();
  files.set(CONFIG, JSON.stringify(obj));
}
function surface(name: string) {
  return (loadSurfaces(CWD) ?? []).find((s) => s.name === name);
}

describe("ALL_TSQA_DISABLEABLE_RULE_IDS", () => {
  it("covers every tier plus the core as/enum ban", () => {
    expect(ALL_TSQA_DISABLEABLE_RULE_IDS).toContain("ts-qa/no-ad-hoc-html");
    expect(ALL_TSQA_DISABLEABLE_RULE_IDS).toContain(
      "ts-qa/no-html-in-front-controllers",
    );
    expect(ALL_TSQA_DISABLEABLE_RULE_IDS).toContain("no-restricted-syntax");
  });
});

describe("loadSurfaces", () => {
  it("returns undefined when ts-qa.json is absent", () => {
    files.clear();
    expect(loadSurfaces(CWD)).toBeUndefined();
  });

  it("returns undefined when the surfaces key is absent", () => {
    setConfig({ disabledTools: ["playwright"] });
    expect(loadSurfaces(CWD)).toBeUndefined();
  });

  it("`surfaces: true` yields all built-in defaults", () => {
    setConfig({ surfaces: true });
    const names = (loadSurfaces(CWD) ?? []).map((s) => s.name).sort();
    expect(names).toEqual(Object.keys(DEFAULT_SURFACES).sort());
  });

  it("`surfaces: {}` also yields all defaults", () => {
    setConfig({ surfaces: {} });
    expect(surface("source")?.globs).toEqual(["src/**"]);
    expect(surface("generated")?.kind).toBe("ignore");
  });

  it("normalises a bare dir override to `<dir>/**`", () => {
    setConfig({ surfaces: { e2e: "tests/e2e" } });
    expect(surface("e2e")?.globs).toEqual(["tests/e2e/**"]);
  });

  it("keeps explicit globs and extension paths verbatim", () => {
    setConfig({ surfaces: { scripts: ["scripts/**", "*.config.ts"] } });
    expect(surface("scripts")?.globs).toEqual(["scripts/**", "*.config.ts"]);
  });

  it("disables a surface with `false`", () => {
    setConfig({ surfaces: { stories: false } });
    expect(surface("stories")).toBeUndefined();
    expect(surface("tests")).toBeDefined(); // others keep defaults
  });

  it("treats a custom surface name as non-app", () => {
    setConfig({ surfaces: { fixtures: "src/fixtures" } });
    const s = surface("fixtures");
    expect(s?.kind).toBe("nonApp");
    expect(s?.globs).toEqual(["src/fixtures/**"]);
  });

  it("non-app surfaces disable ALL ts-qa rules by default", () => {
    setConfig({ surfaces: true });
    expect(surface("tests")?.disabledRules).toEqual([
      ...ALL_TSQA_DISABLEABLE_RULE_IDS,
    ]);
  });

  it("honours a per-surface custom disabled-rule set", () => {
    setConfig({
      surfaces: { e2e: { globs: "e2e", rules: ["no-restricted-syntax"] } },
    });
    expect(surface("e2e")?.disabledRules).toEqual(["no-restricted-syntax"]);
    expect(surface("e2e")?.globs).toEqual(["e2e/**"]);
  });

  it("throws on a malformed surfaces value", () => {
    setConfig({ surfaces: "src" });
    expect(() => loadSurfaces(CWD)).toThrow(/must be `true` or an object/);
  });
});

describe("surfaceIgnores / surfaceOffBlocks", () => {
  it("surfaceIgnores returns the generated/ignore-kind globs", () => {
    setConfig({ surfaces: true });
    const s = loadSurfaces(CWD);
    expect(surfaceIgnores(s)).toContain("src/generated/**");
  });

  it("surfaceOffBlocks emits one off-block per non-app surface", () => {
    setConfig({
      surfaces: {
        tests: "src/test",
        stories: false,
        e2e: false,
        scripts: false,
      },
    });
    const blocks = surfaceOffBlocks(loadSurfaces(CWD));
    // tests + source(no)+generated(no) → only the tests non-app block
    expect(blocks).toHaveLength(1);
    expect(blocks[0].files).toEqual(["src/test/**"]);
    expect(blocks[0].rules["ts-qa/no-ad-hoc-html"]).toBe("off");
    expect(blocks[0].rules["no-restricted-syntax"]).toBe("off");
  });

  it("both return empty for undefined surfaces", () => {
    expect(surfaceIgnores(undefined)).toEqual([]);
    expect(surfaceOffBlocks(undefined)).toEqual([]);
  });
});
