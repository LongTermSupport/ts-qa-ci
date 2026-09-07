import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { tsQaPlugin } from "../rules/index.js";
import { resolveRuleDoc } from "./ruleDoc.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * `ts-qa rule-doc <identifier>` resolves the one string an ESLint failure
 * prints, `ts-qa/<name>`, to the rule's documentation, offline from the
 * installed package. These tests pin that contract and audit it over every
 * rule the plugin ships, so a rule that blocks without explaining cannot be
 * released.
 */
describe("resolveRuleDoc", () => {
  it("resolves a bundled identifier to its section in docs/cdd-rules.md", () => {
    const doc = resolveRuleDoc("ts-qa/no-eslint-disable", packageRoot);
    expect(doc.identifier).toBe("ts-qa/no-eslint-disable");
    expect(doc.description).toMatch(/suppression comments/i);
    expect(doc.docPath.endsWith(join("docs", "cdd-rules.md"))).toBe(true);
    expect(doc.section).toContain("### `no-eslint-disable`");
    expect(doc.section).toContain("Escape hatch");
    expect(doc.section).not.toContain("### `no-duplicate-section-ids`");
  });

  it("every bundled rule has a resolvable section", () => {
    for (const name of Object.keys(tsQaPlugin.rules)) {
      const doc = resolveRuleDoc(`ts-qa/${name}`, packageRoot);
      expect(
        doc.section,
        `${name} has no section in docs/cdd-rules.md`,
      ).toContain(`### \`${name}\``);
      expect(
        doc.description.length,
        `${name} has no meta.docs.description`,
      ).toBeGreaterThan(0);
    }
  });

  it("rejects an unknown bundled identifier", () => {
    expect(() => resolveRuleDoc("ts-qa/no-such-rule", packageRoot)).toThrow(
      /ts-qa\/no-such-rule/,
    );
  });

  it("resolves an ESLint core identifier to its description and upstream URL", () => {
    const doc = resolveRuleDoc("no-unused-vars", packageRoot);
    expect(doc.description).toMatch(/unused/i);
    expect(doc.url).toMatch(/^https:\/\/eslint\.org\//);
    expect(doc.section).toBeUndefined();
  });

  it("rejects an identifier no configured plugin knows", () => {
    expect(() => resolveRuleDoc("nope/never", packageRoot)).toThrow(
      /nope\/never/,
    );
  });
});
