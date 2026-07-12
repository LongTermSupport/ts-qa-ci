import { describe, expect, it } from "vitest";

import {
  RESOLVED_ESLINT_CONFIG_MARK,
  isResolvedEslintConfig,
  markResolvedEslintConfig,
} from "./resolvedConfigMarker.js";

describe("resolvedConfigMarker", () => {
  it("stamps the marker and detects it round-trip", () => {
    const config = markResolvedEslintConfig([{ rules: {} }]);
    expect(isResolvedEslintConfig(config)).toBe(true);
  });

  it("stamps a NON-enumerable marker (never leaks into ESLint's config iteration)", () => {
    const config = markResolvedEslintConfig([{ rules: {} }]);
    // A flat config array is spread/iterated by ESLint; the mark must not appear.
    expect(Object.keys(config)).toEqual(["0"]);
    expect(Object.getOwnPropertySymbols(config)).toContain(
      RESOLVED_ESLINT_CONFIG_MARK,
    );
  });

  it("returns the SAME array reference it marked", () => {
    const original = [{ rules: {} }];
    expect(markResolvedEslintConfig(original)).toBe(original);
  });

  it("detects a mark applied via a fresh Symbol.for call (survives the import() boundary)", () => {
    // Simulates the checker side: a different module instance re-derives the same
    // global-registry symbol by string and stamps it. isResolvedEslintConfig must
    // still see it — this is the whole reason Symbol.for is used over Symbol().
    const foreign = Object.defineProperty(
      [],
      Symbol.for("@longtermsupport/ts-qa-ci:resolved-eslint-config"),
      { value: true },
    );
    expect(isResolvedEslintConfig(foreign)).toBe(true);
  });

  it("rejects an unmarked array, object, and non-objects", () => {
    expect(isResolvedEslintConfig([])).toBe(false);
    expect(isResolvedEslintConfig({})).toBe(false);
    expect(isResolvedEslintConfig(null)).toBe(false);
    expect(isResolvedEslintConfig(undefined)).toBe(false);
    expect(isResolvedEslintConfig(42)).toBe(false);
    expect(isResolvedEslintConfig("marked")).toBe(false);
  });

  it("rejects an array carrying a truthy-but-non-true marker value", () => {
    const spoof = Object.defineProperty([], RESOLVED_ESLINT_CONFIG_MARK, {
      value: "yes",
    });
    expect(isResolvedEslintConfig(spoof)).toBe(false);
  });
});
