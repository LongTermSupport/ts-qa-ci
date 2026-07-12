import { describe, expect, it, vi } from "vitest";

/**
 * loadNonAppSurfaces reads tsQaConfig/ts-qa.json, so node:fs is mocked with a
 * virtual file map. buildNonAppSurfacesBlock is pure and exercised directly.
 */
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
  DEFAULT_NON_APP_SURFACE_DISABLED_RULES,
  buildNonAppSurfacesBlock,
  loadNonAppSurfaces,
} = await import("./nonAppSurfaces.js");

const CWD = "/proj";
const CONFIG = `${CWD}/tsQaConfig/ts-qa.json`;

describe("loadNonAppSurfaces", () => {
  it("returns undefined when ts-qa.json is absent", () => {
    files.clear();
    expect(loadNonAppSurfaces(CWD)).toBeUndefined();
  });

  it("returns undefined when the key is absent", () => {
    files.clear();
    files.set(CONFIG, JSON.stringify({ disabledTools: ["playwright"] }));
    expect(loadNonAppSurfaces(CWD)).toBeUndefined();
  });

  it("returns undefined for an empty globs array", () => {
    files.clear();
    files.set(CONFIG, JSON.stringify({ nonAppSurfaces: [] }));
    expect(loadNonAppSurfaces(CWD)).toBeUndefined();
  });

  it("returns globs with the default disabled-rule set", () => {
    files.clear();
    files.set(
      CONFIG,
      JSON.stringify({ nonAppSurfaces: ["**/*.stories.tsx", "e2e/**"] }),
    );
    expect(loadNonAppSurfaces(CWD)).toEqual({
      globs: ["**/*.stories.tsx", "e2e/**"],
      disabledRules: [...DEFAULT_NON_APP_SURFACE_DISABLED_RULES],
    });
  });

  it("honours a custom nonAppSurfaceRules override", () => {
    files.clear();
    files.set(
      CONFIG,
      JSON.stringify({
        nonAppSurfaces: ["scripts/**"],
        nonAppSurfaceRules: ["ts-qa/no-ad-hoc-html"],
      }),
    );
    expect(loadNonAppSurfaces(CWD)?.disabledRules).toEqual([
      "ts-qa/no-ad-hoc-html",
    ]);
  });

  it("throws on a non-array nonAppSurfaces", () => {
    files.clear();
    files.set(CONFIG, JSON.stringify({ nonAppSurfaces: "stories" }));
    expect(() => loadNonAppSurfaces(CWD)).toThrow(/must be an array/i);
  });

  it("throws on a non-string glob entry", () => {
    files.clear();
    files.set(CONFIG, JSON.stringify({ nonAppSurfaces: [1, 2] }));
    expect(() => loadNonAppSurfaces(CWD)).toThrow(/must be strings/i);
  });
});

describe("buildNonAppSurfacesBlock", () => {
  it("returns undefined for undefined settings", () => {
    expect(buildNonAppSurfacesBlock(undefined)).toBeUndefined();
  });

  it("maps every disabled rule to 'off' on the given globs", () => {
    const block = buildNonAppSurfacesBlock({
      globs: ["e2e/**"],
      disabledRules: ["ts-qa/no-ad-hoc-html", "ts-qa/no-classname-prop"],
    });
    expect(block).toEqual({
      files: ["e2e/**"],
      rules: {
        "ts-qa/no-ad-hoc-html": "off",
        "ts-qa/no-classname-prop": "off",
      },
    });
  });
});
