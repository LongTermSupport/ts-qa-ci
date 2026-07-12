import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { bundledBin } from "./execTool.js";

/**
 * bundledBin must resolve ts-qa-ci's own spawned tool bins (oxlint / knip /
 * depcruise) under every install layout. The original implementation hard-coded
 * `<packageRoot>/node_modules/.bin/<name>`, which exists under NEITHER npm (deps
 * hoisted to the consumer root) NOR pnpm (deps are flat siblings in the `.pnpm`
 * store) — it broke every pnpm consumer at Phase 0 with a spawn ENOENT. These
 * tests pin the package-manager-agnostic resolution across real fixture trees.
 */
const tmp = mkdtempSync(join(tmpdir(), "ts-qa-bundledbin-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

let counter = 0;
function fixtureRoot(): string {
  const dir = join(tmp, `case-${counter++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Write a tool package with a `bin` map + the bin file, return its dir. */
function writeToolPackage(
  parent: string,
  pkg: string,
  bin: Record<string, string> | string,
): string {
  const dir = join(parent, pkg);
  mkdirSync(join(dir, "bin"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: pkg, bin }));
  const subpaths = typeof bin === "string" ? [bin] : Object.values(bin);
  for (const sub of subpaths) {
    writeFileSync(join(dir, sub), "#!/usr/bin/env node\n");
  }
  return dir;
}

describe("bundledBin", () => {
  it("honours a pre-existing nested .bin fast path (self-host / shim)", () => {
    const root = fixtureRoot();
    const binDir = join(root, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const link = join(binDir, "oxlint");
    writeFileSync(link, "#!/usr/bin/env node\n");
    expect(bundledBin(root, "oxlint")).toBe(link);
  });

  it("resolves a pnpm-store sibling dependency (two levels up)", () => {
    // <store>/<hash>/node_modules/{@scope/ts-qa-ci, oxlint}
    const root = fixtureRoot();
    const storeModules = join(root, ".pnpm", "hash", "node_modules");
    const packageRoot = join(storeModules, "@longtermsupport", "ts-qa-ci");
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "@longtermsupport/ts-qa-ci" }),
    );
    writeToolPackage(storeModules, "oxlint", { oxlint: "bin/oxlint" });
    expect(bundledBin(packageRoot, "oxlint")).toBe(
      join(storeModules, "oxlint", "bin", "oxlint"),
    );
  });

  it("maps the depcruise bin to its dependency-cruiser package", () => {
    const root = fixtureRoot();
    const storeModules = join(root, ".pnpm", "hash", "node_modules");
    const packageRoot = join(storeModules, "@longtermsupport", "ts-qa-ci");
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "@longtermsupport/ts-qa-ci" }),
    );
    writeToolPackage(storeModules, "dependency-cruiser", {
      depcruise: "bin/dependency-cruise.mjs",
    });
    expect(bundledBin(packageRoot, "depcruise")).toBe(
      join(storeModules, "dependency-cruiser", "bin", "dependency-cruise.mjs"),
    );
  });

  it("resolves a nested (npm/self-host) dependency directory", () => {
    const packageRoot = fixtureRoot();
    writeToolPackage(join(packageRoot, "node_modules"), "knip", {
      knip: "bin/knip.js",
    });
    expect(bundledBin(packageRoot, "knip")).toBe(
      join(packageRoot, "node_modules", "knip", "bin", "knip.js"),
    );
  });

  it("supports a package whose `bin` is a bare string", () => {
    const root = fixtureRoot();
    const storeModules = join(root, ".pnpm", "hash", "node_modules");
    const packageRoot = join(storeModules, "@longtermsupport", "ts-qa-ci");
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "@longtermsupport/ts-qa-ci" }),
    );
    writeToolPackage(storeModules, "oxlint", "bin/oxlint");
    expect(bundledBin(packageRoot, "oxlint")).toBe(
      join(storeModules, "oxlint", "bin", "oxlint"),
    );
  });

  it("throws a clear error when the tool package cannot be found", () => {
    const packageRoot = fixtureRoot();
    expect(() => bundledBin(packageRoot, "knip")).toThrow(
      /cannot locate bundled tool "knip"/,
    );
  });
});
