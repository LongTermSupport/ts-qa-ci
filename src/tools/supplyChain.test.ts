import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunContext } from "../orchestrator/types.js";

/**
 * The supply-chain audit reads config FILES (package.json, pnpm-workspace.yaml,
 * .npmrc, tsQaConfig/ts-qa.json), so node:fs is mocked with a virtual file map;
 * each test sets the files it needs. auditSupplyChain is exercised directly for
 * per-rule coverage, plus tool.run for the clean/failure ToolResult mapping.
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

const { auditSupplyChain, default: tool } = await import("./supplyChain.js");

const CWD = "/proj";
const COMPLIANT_WORKSPACE = `minimumReleaseAge: 10080
minimumReleaseAgeExclude: []
dangerouslyAllowAllBuilds: false
verifyDepsBeforeRun: error
`;

function setCompliant(): void {
  files.clear();
  files.set(
    `${CWD}/package.json`,
    JSON.stringify({ packageManager: "pnpm@11.1.2" }),
  );
  files.set(`${CWD}/pnpm-workspace.yaml`, COMPLIANT_WORKSPACE);
  files.set(`${CWD}/.npmrc`, "registry=https://registry.npmjs.org/\n");
}

const config = { minReleaseAgeMinutes: 4320 };

describe("auditSupplyChain", () => {
  beforeEach(() => files.clear());

  it("passes a fully-compliant pnpm project (no violations)", () => {
    setCompliant();
    expect(auditSupplyChain(CWD, config)).toEqual([]);
  });

  it("flags a missing packageManager", () => {
    setCompliant();
    files.set(`${CWD}/package.json`, JSON.stringify({}));
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /packageManager.*not set/i,
    );
  });

  it("flags a non-pnpm packageManager (pnpm required)", () => {
    setCompliant();
    files.set(
      `${CWD}/package.json`,
      JSON.stringify({ packageManager: "npm@10.9.0" }),
    );
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /pnpm is required/i,
    );
  });

  it("flags a missing minimumReleaseAge", () => {
    setCompliant();
    files.set(
      `${CWD}/pnpm-workspace.yaml`,
      "dangerouslyAllowAllBuilds: false\nverifyDepsBeforeRun: error\n",
    );
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /minimumReleaseAge is not configured/i,
    );
  });

  it("flags a minimumReleaseAge below the floor", () => {
    setCompliant();
    files.set(
      `${CWD}/pnpm-workspace.yaml`,
      "minimumReleaseAge: 60\ndangerouslyAllowAllBuilds: false\nverifyDepsBeforeRun: error\n",
    );
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /must be at least 4320/,
    );
  });

  it("respects a custom minReleaseAgeMinutes floor", () => {
    setCompliant(); // has 10080
    expect(
      auditSupplyChain(CWD, { minReleaseAgeMinutes: 20160 }).join("\n"),
    ).toMatch(/must be at least 20160/);
  });

  it("flags dangerouslyAllowAllBuilds: true", () => {
    setCompliant();
    files.set(
      `${CWD}/pnpm-workspace.yaml`,
      "minimumReleaseAge: 10080\ndangerouslyAllowAllBuilds: true\nverifyDepsBeforeRun: error\n",
    );
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /dangerouslyAllowAllBuilds is true/i,
    );
  });

  it("flags verifyDepsBeforeRun not set to error", () => {
    setCompliant();
    files.set(
      `${CWD}/pnpm-workspace.yaml`,
      "minimumReleaseAge: 10080\ndangerouslyAllowAllBuilds: false\nverifyDepsBeforeRun: warn\n",
    );
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /verifyDepsBeforeRun is warn/i,
    );
  });

  it("flags a rogue registry", () => {
    setCompliant();
    files.set(`${CWD}/.npmrc`, "registry=https://evil.example.com/\n");
    expect(auditSupplyChain(CWD, config).join("\n")).toMatch(
      /only the public npm registry/i,
    );
  });

  it("does NOT flag a public registry with a trailing-slash difference", () => {
    setCompliant();
    files.set(`${CWD}/.npmrc`, "registry=https://registry.npmjs.org\n"); // no trailing slash
    expect(auditSupplyChain(CWD, config)).toEqual([]);
  });

  it("does NOT flag when .npmrc is absent (public registry is the default)", () => {
    setCompliant();
    files.delete(`${CWD}/.npmrc`);
    expect(auditSupplyChain(CWD, config)).toEqual([]);
  });

  it("ignores commented-out and nested yaml keys", () => {
    setCompliant();
    files.set(
      `${CWD}/pnpm-workspace.yaml`,
      "# minimumReleaseAge: 1\nminimumReleaseAge: 10080\nallowBuilds:\n  minimumReleaseAge: 5\ndangerouslyAllowAllBuilds: false\nverifyDepsBeforeRun: error\n",
    );
    expect(auditSupplyChain(CWD, config)).toEqual([]);
  });
});

describe("supplyChain tool", () => {
  const ctx: RunContext = {
    cwd: CWD,
    platform: "generic",
    ci: true,
    readOnly: true,
    aggregate: false,
    hasBeenRestarted: false,
    json: true,
    llm: false,
    packageRoot: "/pkg",
  };

  beforeEach(() => files.clear());

  it("returns clean when compliant", async () => {
    setCompliant();
    const result = await tool.run(ctx);
    expect(result.exitClass).toBe("clean");
  });

  it("returns failure with a report when non-compliant", async () => {
    setCompliant();
    files.set(
      `${CWD}/package.json`,
      JSON.stringify({ packageManager: "npm@10.9.0" }),
    );
    const result = await tool.run(ctx);
    expect(result.exitClass).toBe("failure");
    expect(result.stdout).toMatch(/supply-chain protections missing/i);
  });

  it("reads a custom floor from tsQaConfig/ts-qa.json", async () => {
    setCompliant(); // minimumReleaseAge 10080
    files.set(
      `${CWD}/tsQaConfig/ts-qa.json`,
      JSON.stringify({ supplyChain: { minReleaseAgeMinutes: 20160 } }),
    );
    const result = await tool.run(ctx);
    expect(result.exitClass).toBe("failure");
    expect(result.stdout).toMatch(/at least 20160/);
  });

  it("is a non-mutating Phase 0 tool", () => {
    expect(tool.phase).toBe(0);
    expect(tool.mutates).toBe(false);
  });
});
