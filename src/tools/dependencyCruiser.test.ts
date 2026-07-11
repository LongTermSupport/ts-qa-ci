import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunContext } from "../orchestrator/types.js";

/**
 * dependency-cruiser is the only count-based tool in the set: it sets its exit
 * code to the number of error-level violations, which the OS truncates to 8
 * bits. 256 (or 512, 768, ...) error-level violations therefore wrap to exit 0
 * and were wrongly classified as `clean` (GitHub issue #2, BUG A - a silent QA
 * hole / false green). These tests pin the fix: the summary line on stdout is
 * cross-checked so a >0 error count always maps to `failure`, whatever the
 * wrapped numeric exit code says.
 *
 * execTool and resolveConfigPath are mocked so the real depcruise binary is
 * never spawned - only this module's own classification logic is under test.
 */
const { execToolMock } = vi.hoisted(() => ({ execToolMock: vi.fn() }));
vi.mock("./execTool.js", () => ({
  execTool: execToolMock,
  bundledBin: (root: string, name: string) =>
    `${root}/node_modules/.bin/${name}`,
}));
vi.mock("../orchestrator/resolveConfigPath.js", () => ({
  resolveConfigPath: () => "/fake/dependency-cruiser.config.cjs",
}));

const { default: tool } = await import("./dependencyCruiser.js");

const ctx: RunContext = {
  cwd: "/does-not-matter",
  platform: "generic",
  ci: true,
  readOnly: true,
  aggregate: false,
  hasBeenRestarted: false,
  json: true,
  packageRoot: "/does-not-matter",
};

describe("dependencyCruiser tool", () => {
  beforeEach(() => execToolMock.mockReset());

  it("maps a genuinely clean run (exit 0, no violations) to clean", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 0,
      stdout:
        "\n✔ no dependency violations found (120 modules, 340 dependencies cruised)\n",
      stderr: "",
    });

    const result = await tool.run(ctx);

    expect(result.exitClass).toBe("clean");
  });

  it("spawns ts-qa-ci's OWN bundled depcruise bin (not `npx depcruise`) so pnpm consumers resolve it", async () => {
    // Regression (Defence Before Fix): dependency-cruiser is a ts-qa-ci
    // `dependency`, unreachable via `npx depcruise` from a pnpm consumer root.
    // The tool must spawn <packageRoot>/node_modules/.bin/depcruise directly.
    execToolMock.mockResolvedValue({
      exitCode: 0,
      stdout:
        "✔ no dependency violations found (1 modules, 0 dependencies cruised)",
      stderr: "",
    });

    await tool.run({ ...ctx, packageRoot: "/pkg" });

    const [command, , , extraPath] = execToolMock.mock.calls[0] as [
      string,
      string[],
      string,
      string,
    ];
    expect(command).toBe("/pkg/node_modules/.bin/depcruise");
    expect(command).not.toBe("npx");
    expect(extraPath).toBe("/pkg/node_modules/.bin");
  });

  it("maps an unwrapped non-zero exit (small violation count) to failure", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 3,
      stdout:
        "x 3 dependency violations (3 errors, 0 warnings). 120 modules, 340 dependencies cruised.",
      stderr: "",
    });

    const result = await tool.run(ctx);

    expect(result.exitClass).toBe("failure");
  });

  it("classifies 256 error-level violations as failure even though the OS wraps the exit code to 0", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 0,
      stdout:
        "x 256 dependency violations (256 errors, 0 warnings). 120 modules, 340 dependencies cruised.",
      stderr: "",
    });

    const result = await tool.run(ctx);

    expect(result.exitClass).toBe("failure");
  });

  it("keeps a warnings-only run (exit 0, 0 errors) clean", async () => {
    execToolMock.mockResolvedValue({
      exitCode: 0,
      stdout:
        "x 4 dependency violations (0 errors, 4 warnings). 120 modules, 340 dependencies cruised.",
      stderr: "",
    });

    const result = await tool.run(ctx);

    expect(result.exitClass).toBe("clean");
  });
});
