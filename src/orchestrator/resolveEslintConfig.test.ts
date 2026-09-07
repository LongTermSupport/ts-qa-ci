import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  findTierARuleOverrides,
  loadExemptions,
} from "./resolveEslintConfig.js";

/**
 * Defends the override-gate against silent Tier A downgrades — including the
 * linterOptions path (Plan 00004 Task 1.4 audit finding F4): a project appending
 * `linterOptions.reportUnusedDisableDirectives: 'off'` must be caught, not
 * silently win last-entry-wins.
 */
describe("findTierARuleOverrides", () => {
  it("flags a project entry that touches a Tier A rule severity", () => {
    const overrides = findTierARuleOverrides([
      { files: ["**/*.ts"], rules: { "ts-qa/no-eslint-disable": "off" } },
    ]);
    expect(overrides).toEqual([
      { ruleId: "ts-qa/no-eslint-disable", files: ["**/*.ts"] },
    ]);
  });

  it("flags the always-on as/enum ban (no-restricted-syntax)", () => {
    const overrides = findTierARuleOverrides([
      { rules: { "no-restricted-syntax": "off" } },
    ]);
    expect(overrides.map((o) => o.ruleId)).toContain("no-restricted-syntax");
  });

  it("flags a linterOptions.reportUnusedDisableDirectives downgrade", () => {
    const overrides = findTierARuleOverrides([
      { linterOptions: { reportUnusedDisableDirectives: "off" } },
    ]);
    expect(overrides.map((o) => o.ruleId)).toContain(
      "reportUnusedDisableDirectives",
    );
  });

  it("does NOT flag reportUnusedDisableDirectives set to error (matches the base)", () => {
    const overrides = findTierARuleOverrides([
      { linterOptions: { reportUnusedDisableDirectives: "error" } },
    ]);
    expect(overrides).toEqual([]);
  });

  it("ignores non-Tier-A rules and empty entries", () => {
    const overrides = findTierARuleOverrides([
      { rules: { "no-console": "off" } },
      { ignores: ["dist/**"] },
    ]);
    expect(overrides).toEqual([]);
  });
});

/**
 * An exemption is the project record. A justification that could be pasted
 * onto any exemption unchanged records nothing, so the loader rejects it
 * mechanically; whether a specific sentence is TRUE stays a human judgement.
 */
describe("loadExemptions justification content floor", () => {
  const dir = (): string => {
    const d = mkdtempSync(join(tmpdir(), "tsqa-exemptions-"));
    mkdirSync(join(d, "tsQaConfig"), { recursive: true });
    return d;
  };
  const write = (d: string, justification: string): void => {
    writeFileSync(
      join(d, "tsQaConfig", "tier-a-exemptions.json"),
      JSON.stringify([
        { ruleId: "ts-qa/no-placeholder", files: ["src/x.ts"], justification },
      ]),
    );
  };

  it("accepts a justification that names the hazard and the scope", () => {
    const d = dir();
    write(
      d,
      "src/x.ts is the rule that detects the literal token it reports, so its own source must contain that token; scoped to that one file.",
    );
    expect(loadExemptions(d)).toHaveLength(1);
  });

  it.each([
    "needed for now",
    "Legacy code.",
    "TODO",
    "temporary",
    "will fix later",
    "too noisy",
  ])("rejects the paste-anywhere phrase %j", (phrase) => {
    const d = dir();
    write(d, phrase);
    expect(() => loadExemptions(d)).toThrow(/justification/);
  });

  it("rejects a justification too short to name a hazard and a scope", () => {
    const d = dir();
    write(d, "it is fine here");
    expect(() => loadExemptions(d)).toThrow(/justification/);
  });
});
