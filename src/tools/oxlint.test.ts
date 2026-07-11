import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunContext } from "../orchestrator/types.js";

/**
 * oxlint exits 1 both for "lint problems found" (a genuine, retryable failure)
 * and for a fatal --config parse error (a structurally-broken config that must
 * never be retried). GitHub issue #2 BUG B: the fatal-config case was
 * misclassified as a retryable `failure` with `diffPending` set, so the
 * interactive retryGate would offer to re-run a broken config. These tests pin
 * the fix: the fatal-config signature is detected and classified as `crash`
 * (which retryGate never retries), with `diffPending` cleared.
 *
 * execTool and resolveConfigPath are mocked so the real oxlint binary is never
 * spawned - only this module's own classification logic is under test.
 */
const { execToolMock } = vi.hoisted(() => ({ execToolMock: vi.fn() }));
vi.mock("./execTool.js", () => ({ execTool: execToolMock }));
vi.mock("../orchestrator/resolveConfigPath.js", () => ({
  resolveConfigPath: () => "/fake/.oxlintrc.json",
}));

const { default: tool } = await import("./oxlint.js");

const ctx = (overrides: Partial<RunContext> = {}): RunContext => ({
  cwd: "/does-not-matter",
  platform: "generic",
  ci: true,
  readOnly: true,
  aggregate: false,
  hasBeenRestarted: false,
  json: true,
  packageRoot: "/does-not-matter",
  ...overrides,
});

describe("oxlint tool", () => {
  beforeEach(() => execToolMock.mockReset());

  it("maps exit 0 to clean", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 0,
      stdout: "Found 0 warnings and 0 errors.",
      stderr: "",
    });

    const result = await tool.run(ctx());

    expect(result.exitClass).toBe("clean");
  });

  it("maps exit 1 lint problems to a retryable failure with diffPending in read-only mode", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 1,
      stdout:
        "  x eslint(no-unused-vars): ...\n\nFound 0 warnings and 1 error.",
      stderr: "",
    });

    const result = await tool.run(ctx({ readOnly: true }));

    expect(result.exitClass).toBe("failure");
    expect(result.diffPending).toBe(true);
  });

  it("classifies a fatal --config parse error as crash and clears diffPending", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 1,
      stdout:
        "Failed to parse oxlint configuration file.\n\n  x Failed to parse oxlint config /fake/.oxlintrc.json.\n  | key must be a string at line 1 column 3\n",
      stderr: "",
    });

    const result = await tool.run(ctx({ readOnly: true }));

    expect(result.exitClass).toBe("crash");
    expect(result.diffPending).toBeUndefined();
  });
});
