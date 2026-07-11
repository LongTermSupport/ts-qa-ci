import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runPhase } from "./runPhase.js";
import type { PhaseDefinition, RunContext } from "./types.js";

/**
 * runPhase aggregation semantics (GitHub issue #6, BUG B): a plain `failure`
 * under --aggregate keeps the phase running to collect every failure, but a
 * `crash` (missing binary etc.) must abort the phase immediately — retryGate's
 * contract is "caller aborts on crash, never retries", regardless of aggregate.
 *
 * Each tool is dropped as a `tsQaConfig/tools/<name>.ts` project override
 * (resolveToolModule.ts's first cascade step) so no real binary is invoked.
 */
describe("runPhase", () => {
  const dirs: string[] = [];

  const proj = (tools: Record<string, string>): string => {
    const dir = mkdtempSync(join(tmpdir(), "tsqa-run-phase-"));
    dirs.push(dir);
    mkdirSync(join(dir, "tsQaConfig", "tools"), { recursive: true });
    for (const [name, source] of Object.entries(tools)) {
      writeFileSync(join(dir, "tsQaConfig", "tools", `${name}.ts`), source);
    }
    return dir;
  };

  const toolSource = (
    name: string,
    phase: number,
    exitClass: string,
  ): string => `
    const tool = {
      name: ${JSON.stringify(name)},
      phase: ${phase},
      mutates: false,
      pathSupporting: false,
      async run() {
        return { exitClass: ${JSON.stringify(exitClass)}, stdout: '', stderr: '' };
      },
    };
    export default tool;
  `;

  const baseCtx = (overrides: Partial<RunContext> = {}): RunContext => ({
    cwd: "/does-not-matter",
    platform: "generic",
    ci: true,
    readOnly: true,
    aggregate: false,
    hasBeenRestarted: false,
    json: true,
    llm: false,
    packageRoot: "/does-not-matter",
    ...overrides,
  });

  afterEach(() => {
    while (dirs.length > 0)
      rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it("aborts the phase on a crash even under --aggregate (does not run later tools)", async () => {
    const projectRoot = proj({
      tsc: toolSource("tsc", 3, "crash"),
      dependencyCruiser: toolSource("dependencyCruiser", 3, "clean"),
    });
    const phaseDef: PhaseDefinition = {
      number: 3,
      name: "Static Analysis",
      tools: ["tsc", "dependencyCruiser"],
      mutates: false,
    };

    const result = await runPhase(
      phaseDef,
      baseCtx({ aggregate: true }),
      "/package-root-unused",
      projectRoot,
    );

    expect(result.failed).toBe(true);
    expect(result.toolResults.tsc?.exitClass).toBe("crash");
    // dependencyCruiser must NOT have run — the crash aborted the phase.
    expect(result.toolResults.dependencyCruiser).toBeUndefined();
  });

  it("keeps running later tools after a plain failure under --aggregate", async () => {
    const projectRoot = proj({
      eslintReport: toolSource("eslintReport", 2, "failure"),
      knip: toolSource("knip", 2, "clean"),
    });
    const phaseDef: PhaseDefinition = {
      number: 2,
      name: "Lint & Validation",
      tools: ["eslintReport", "knip"],
      mutates: false,
    };

    const result = await runPhase(
      phaseDef,
      baseCtx({ aggregate: true }),
      "/package-root-unused",
      projectRoot,
    );

    expect(result.failed).toBe(true);
    expect(result.toolResults.eslintReport?.exitClass).toBe("failure");
    // Both tools ran — a plain failure aggregates.
    expect(result.toolResults.knip?.exitClass).toBe("clean");
  });

  it("stops at the first non-clean tool when not aggregating", async () => {
    const projectRoot = proj({
      eslintReport: toolSource("eslintReport", 2, "failure"),
      knip: toolSource("knip", 2, "clean"),
    });
    const phaseDef: PhaseDefinition = {
      number: 2,
      name: "Lint & Validation",
      tools: ["eslintReport", "knip"],
      mutates: false,
    };

    const result = await runPhase(
      phaseDef,
      baseCtx({ aggregate: false }),
      "/package-root-unused",
      projectRoot,
    );

    expect(result.failed).toBe(true);
    expect(result.toolResults.knip).toBeUndefined();
  });
});
