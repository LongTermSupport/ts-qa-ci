import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFENCE_BEFORE_FIX_LINE } from "./methodLine.js";
import { logToolResult, runPhase } from "./runPhase.js";
import type { PhaseDefinition, RunContext } from "./types.js";

/**
 * Human output on a failing tool names the method and links its canonical
 * specification, once per failing tool, directly after the `ts-qa: <tool>:
 * <exitClass>` line and before the tool's own output. Never on a clean
 * result, never in --json mode.
 */
describe("logToolResult", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const spyStdout = (): { log: string[]; raw: string[] } => {
    const log: string[] = [];
    const raw: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      log.push(args.map(String).join(" "));
    });
    vi.spyOn(process.stdout, "write").mockImplementation(
      (chunk: string | Uint8Array) => {
        raw.push(String(chunk));
        return true;
      },
    );
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    return { log, raw };
  };

  it("prints the Defence Before Fix line directly after the failure header, before tool output", () => {
    const { log, raw } = spyStdout();

    logToolResult(
      "eslintReport",
      { exitClass: "failure", stdout: "lint out\n", stderr: "" },
      false,
    );

    expect(log).toStrictEqual([
      "ts-qa: eslintReport: failure",
      "Defence Before Fix: https://longtermsupport.github.io/defence-before-fix/",
    ]);
    expect(log[1]).toBe(DEFENCE_BEFORE_FIX_LINE);
    // The tool's own output follows the two header lines.
    expect(raw).toStrictEqual(["lint out\n"]);
  });

  it("prints the line for a crash too", () => {
    const { log } = spyStdout();

    logToolResult(
      "tsc",
      { exitClass: "crash", stdout: "", stderr: "boom" },
      false,
    );

    expect(log).toStrictEqual([
      "ts-qa: tsc: crash",
      "Defence Before Fix: https://longtermsupport.github.io/defence-before-fix/",
    ]);
  });

  it("does not print the line on a clean result", () => {
    const { log, raw } = spyStdout();

    logToolResult(
      "knip",
      { exitClass: "clean", stdout: "", stderr: "" },
      false,
    );

    expect(log).toStrictEqual(["ts-qa: knip: clean"]);
    expect(raw).toStrictEqual([]);
  });

  it("prints nothing at all in --json mode", () => {
    const { log, raw } = spyStdout();

    logToolResult(
      "eslintReport",
      { exitClass: "failure", stdout: "lint out\n", stderr: "" },
      true,
    );

    expect(log).toStrictEqual([]);
    expect(raw).toStrictEqual([]);
  });
});

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
