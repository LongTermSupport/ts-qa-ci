import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RunContext } from "../orchestrator/types.js";

/**
 * The tsc tool orchestrates the consumer's own tsconfig. A bare `tsc --noEmit` at
 * the root only works when a root tsconfig exists; in a pnpm/npm workspace (no root
 * tsconfig) TypeScript 6 prints its help banner and exits non-zero for "no inputs",
 * failing the phase for a non-code reason (gh #409). These tests pin the workspace
 * behaviour: discover each member's tsconfig and type-check it via `-p`, aggregate.
 *
 * execTool is mocked so the real tsc binary is never spawned — only this module's
 * discovery + classification logic is under test.
 */
const { execToolMock } = vi.hoisted(() => ({ execToolMock: vi.fn() }));
vi.mock("./execTool.js", () => ({ execTool: execToolMock }));

const {
  default: tool,
  pnpmPackageGlobs,
  memberTsconfigs,
} = await import("./tsc.js");

const ctx = (cwd: string): RunContext => ({
  cwd,
  platform: "generic",
  ci: true,
  readOnly: false,
  aggregate: false,
  hasBeenRestarted: false,
  json: false,
  llm: false,
  packageRoot: cwd,
});

describe("pnpmPackageGlobs", () => {
  it("extracts only the contiguous packages list, never a sibling key's own list", () => {
    const yaml = [
      "packages:",
      "  - apps/web",
      "  - packages/ts/*",
      "",
      "onlyBuiltDependencies:",
      "  - esbuild", // MUST NOT be captured as a package glob
    ].join("\n");

    expect(pnpmPackageGlobs(yaml)).toEqual(["apps/web", "packages/ts/*"]);
  });

  it("strips surrounding quotes and trailing inline comments", () => {
    const yaml = ["packages:", "  - 'apps/web'", "  - packages/* # libs"].join(
      "\n",
    );

    expect(pnpmPackageGlobs(yaml)).toEqual(["apps/web", "packages/*"]);
  });

  it("returns an empty list when there is no packages key", () => {
    expect(pnpmPackageGlobs("onlyBuiltDependencies:\n  - esbuild\n")).toEqual(
      [],
    );
  });
});

describe("memberTsconfigs", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "tsqa-tsc-members-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("resolves plain dirs and globs, keeping only members that have a tsconfig", () => {
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - apps/web\n  - packages/ts/*\n",
    );
    mkdirSync(join(root, "apps/web"), { recursive: true });
    writeFileSync(join(root, "apps/web/tsconfig.json"), "{}");
    mkdirSync(join(root, "packages/ts/ui"), { recursive: true });
    writeFileSync(join(root, "packages/ts/ui/tsconfig.json"), "{}");
    // A globbed dir with NO tsconfig must be dropped (e.g. a docs-only dir).
    mkdirSync(join(root, "packages/ts/docs"), { recursive: true });

    expect(memberTsconfigs(root)).toEqual([
      join("apps/web", "tsconfig.json"),
      join("packages/ts/ui", "tsconfig.json"),
    ]);
  });

  it("reads package.json workspaces in preference to pnpm", () => {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ workspaces: ["pkg-a"] }),
    );
    mkdirSync(join(root, "pkg-a"), { recursive: true });
    writeFileSync(join(root, "pkg-a/tsconfig.json"), "{}");

    expect(memberTsconfigs(root)).toEqual([join("pkg-a", "tsconfig.json")]);
  });
});

describe("tsc tool run()", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "tsqa-tsc-run-"));
    execToolMock.mockReset();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("runs a single `tsc --noEmit` when a root tsconfig exists", async () => {
    writeFileSync(join(root, "tsconfig.json"), "{}");
    execToolMock.mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });

    const result = await tool.run(ctx(root));

    expect(execToolMock).toHaveBeenCalledExactlyOnceWith(
      "npx",
      ["tsc", "--noEmit"],
      root,
    );
    expect(result.exitClass).toBe("clean");
  });

  it("type-checks each workspace member via -p and is clean when all pass", async () => {
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - pkg-a\n  - pkg-b\n",
    );
    for (const pkg of ["pkg-a", "pkg-b"]) {
      mkdirSync(join(root, pkg), { recursive: true });
      writeFileSync(join(root, pkg, "tsconfig.json"), "{}");
    }
    execToolMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

    const result = await tool.run(ctx(root));

    expect(execToolMock).toHaveBeenCalledTimes(2);
    expect(execToolMock).toHaveBeenCalledWith(
      "npx",
      ["tsc", "--noEmit", "-p", join("pkg-a", "tsconfig.json")],
      root,
    );
    expect(result.exitClass).toBe("clean");
  });

  it("is a failure when any single member fails to type-check", async () => {
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - pkg-a\n  - pkg-b\n",
    );
    for (const pkg of ["pkg-a", "pkg-b"]) {
      mkdirSync(join(root, pkg), { recursive: true });
      writeFileSync(join(root, pkg, "tsconfig.json"), "{}");
    }
    execToolMock.mockImplementation(async (_cmd: string, args: string[]) =>
      args.includes(join("pkg-b", "tsconfig.json"))
        ? { exitCode: 2, stdout: "TS error", stderr: "" }
        : { exitCode: 0, stdout: "", stderr: "" },
    );

    const result = await tool.run(ctx(root));

    expect(result.exitClass).toBe("failure");
    expect(result.stdout).toContain(join("pkg-b", "tsconfig.json"));
  });

  it("fails with a clear message when there is neither a root nor any member tsconfig", async () => {
    const result = await tool.run(ctx(root));

    expect(execToolMock).not.toHaveBeenCalled();
    expect(result.exitClass).toBe("failure");
    expect(result.stderr).toContain("no tsconfig.json");
  });
});
