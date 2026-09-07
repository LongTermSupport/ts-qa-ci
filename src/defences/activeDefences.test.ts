import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { formatDefenceListing, listActiveDefences } from "./activeDefences.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * `ts-qa rules` lists the defences active in a project, derived from the
 * resolved ESLint configuration rather than from any hand-maintained page,
 * and the project record (Tier A exemptions) alongside them. ts-qa-ci is its
 * own consumer here, so the listing is checked against what this repo
 * actually enforces on itself.
 */
describe("listActiveDefences", () => {
  it("derives the active rules from the resolved configuration", async () => {
    const listing = await listActiveDefences(
      packageRoot,
      "generic",
      packageRoot,
    );
    const ids = listing.defences.map((d) => d.identifier);
    expect(ids).toContain("ts-qa/no-eslint-disable");
    expect(ids).toContain("ts-qa/no-placeholder");
    // Tier B/C rules are opt-in and this repo has not opted in.
    expect(ids).not.toContain("ts-qa/no-default-export");
    const noDisable = listing.defences.find(
      (d) => d.identifier === "ts-qa/no-eslint-disable",
    );
    expect(noDisable?.severity).toBe("error");
    expect(noDisable?.description).toMatch(/suppression/i);
    expect(noDisable?.docRoute).toContain("cdd-rules.md");
  });

  it("carries the project record next to the defences", async () => {
    const listing = await listActiveDefences(
      packageRoot,
      "generic",
      packageRoot,
    );
    const ruleIds = listing.exemptions.map((e) => e.ruleId);
    expect(ruleIds).toContain("ts-qa/no-placeholder");
    for (const exemption of listing.exemptions) {
      expect(exemption.justification.length).toBeGreaterThan(0);
    }
  });

  it("renders one line per defence with identifier, severity, summary and route", async () => {
    const listing = await listActiveDefences(
      packageRoot,
      "generic",
      packageRoot,
    );
    const text = formatDefenceListing(listing);
    expect(text).toMatch(/^ts-qa\/no-eslint-disable\s+error\s+/m);
    expect(text).toContain("Project record");
    expect(text).toContain("ts-qa/no-placeholder");
  });
});
