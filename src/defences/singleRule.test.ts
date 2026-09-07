import { describe, expect, it } from "vitest";

import { firingsOf, formatFirings } from "./singleRule.js";

/**
 * `ts-qa rule <identifier> <path>` is the single-rule harness: given ESLint's
 * JSON output for a path, say whether ONE rule fired there and where.
 * Everything else ESLint found is noise for that question.
 */
describe("firingsOf", () => {
  const json = JSON.stringify([
    {
      filePath: "/repo/src/a.ts",
      messages: [
        {
          ruleId: "ts-qa/no-eslint-disable",
          line: 3,
          column: 1,
          message: "Suppression comments are banned.",
        },
        {
          ruleId: "no-unused-vars",
          line: 5,
          column: 7,
          message: "'x' is assigned a value but never used.",
        },
      ],
    },
    {
      filePath: "/repo/src/b.ts",
      messages: [
        {
          ruleId: "ts-qa/no-eslint-disable",
          line: 1,
          column: 1,
          message: "Suppression comments are banned.",
        },
      ],
    },
    { filePath: "/repo/src/c.ts", messages: [] },
  ]);

  it("lists only the firings of the requested identifier", () => {
    expect(firingsOf(json, "ts-qa/no-eslint-disable")).toEqual([
      {
        file: "/repo/src/a.ts",
        line: 3,
        column: 1,
        message: "Suppression comments are banned.",
      },
      {
        file: "/repo/src/b.ts",
        line: 1,
        column: 1,
        message: "Suppression comments are banned.",
      },
    ]);
  });

  it("yields nothing for a rule that did not fire", () => {
    expect(firingsOf(json, "ts-qa/no-placeholder")).toEqual([]);
  });

  it("rejects output that is not ESLint JSON", () => {
    expect(() => firingsOf("not json", "ts-qa/no-placeholder")).toThrow(
      /ESLint --format json/,
    );
    expect(() => firingsOf("{}", "ts-qa/no-placeholder")).toThrow(
      /ESLint --format json/,
    );
  });

  it("renders FIRED with locations, or did not fire", () => {
    const fired = formatFirings(
      "ts-qa/no-eslint-disable",
      firingsOf(json, "ts-qa/no-eslint-disable"),
    );
    expect(fired.startsWith("ts-qa/no-eslint-disable FIRED (2)")).toBe(true);
    expect(fired).toContain("/repo/src/b.ts:1:1");
    expect(formatFirings("ts-qa/no-placeholder", [])).toBe(
      "ts-qa/no-placeholder did not fire\n",
    );
  });
});
