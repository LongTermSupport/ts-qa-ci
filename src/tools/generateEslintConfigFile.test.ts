import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunContext } from "../orchestrator/types.js";

/**
 * generateEslintConfigFile writes a temp flat-config to disk, so node:fs is
 * mocked: mkdirSync is a noop, writeFileSync captures the emitted contents, and
 * readFileSync serves the package.json used to resolve the self-hosting entry.
 */
const { written, files } = vi.hoisted(() => ({
  written: new Map<string, string>(),
  files: new Map<string, string>(),
}));
vi.mock("node:fs", () => ({
  mkdirSync: () => undefined,
  writeFileSync: (p: string, c: string) => {
    written.set(p, c);
  },
  readFileSync: (p: string) => {
    const v = files.get(p);
    if (v === undefined) throw new Error(`ENOENT: ${p}`);
    return v;
  },
}));

const { generateEslintConfigFile } =
  await import("./generateEslintConfigFile.js");

const PACKAGE_ROOT = "/pkg/ts-qa-ci";

function makeCtx(overrides: Partial<RunContext>): RunContext {
  return {
    cwd: "/proj",
    platform: "generic",
    ci: false,
    readOnly: false,
    aggregate: false,
    hasBeenRestarted: false,
    json: false,
    llm: false,
    packageRoot: PACKAGE_ROOT,
    ...overrides,
  };
}

function generatedContents(ctx: RunContext): string {
  const path = generateEslintConfigFile(ctx);
  const contents = written.get(path);
  if (contents === undefined) throw new Error("nothing written");
  return contents;
}

describe("generateEslintConfigFile", () => {
  beforeEach(() => {
    written.clear();
    files.clear();
    files.set(
      `${PACKAGE_ROOT}/package.json`,
      JSON.stringify({ main: "dist/index.js" }),
    );
  });

  it("writes the generated config under the consumer's node_modules/.cache", () => {
    const path = generateEslintConfigFile(makeCtx({ cwd: "/proj" }));
    expect(path).toBe(
      "/proj/node_modules/.cache/ts-qa/eslint.config.generated.mjs",
    );
  });

  it("imports the bare package specifier for an ordinary consumer", () => {
    const contents = generatedContents(makeCtx({ cwd: "/proj" }));
    expect(contents).toContain(
      `import { resolveEslintConfig } from "@longtermsupport/ts-qa-ci"`,
    );
    expect(contents).not.toContain("file://");
  });

  it("imports the local built entry by file URL when self-hosting (cwd === packageRoot)", () => {
    const contents = generatedContents(
      makeCtx({ cwd: PACKAGE_ROOT, packageRoot: PACKAGE_ROOT }),
    );
    // The bare specifier is unresolvable when the package lints itself; a
    // file URL to its own dist/index.js is used instead.
    expect(contents).toContain(
      `import { resolveEslintConfig } from "file://${PACKAGE_ROOT}/dist/index.js"`,
    );
    expect(contents).not.toContain(`from "@longtermsupport/ts-qa-ci"`);
  });

  it("honours a non-default main field when resolving the self-hosting entry", () => {
    files.set(
      `${PACKAGE_ROOT}/package.json`,
      JSON.stringify({ main: "build/entry.js" }),
    );
    const contents = generatedContents(
      makeCtx({ cwd: PACKAGE_ROOT, packageRoot: PACKAGE_ROOT }),
    );
    expect(contents).toContain(`file://${PACKAGE_ROOT}/build/entry.js`);
  });
});
