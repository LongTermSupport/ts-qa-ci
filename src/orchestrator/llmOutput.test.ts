import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  emitLlmOutput,
  formatLlmSummary,
  llmCachePath,
  writeLlmCache,
} from "./llmOutput.js";
import { DEFENCE_BEFORE_FIX_LINE } from "./methodLine.js";
import type { PipelineResult } from "./runPipeline.js";

/**
 * `--llm` output mode (migration assessment "primary upstream contribution"):
 * a compact deterministic summary on stdout, the FULL PipelineResult persisted
 * to a stable cache file for jq querying. These tests pin the summary shape and
 * the cache write against a known PipelineResult.
 */
describe("llmOutput", () => {
  const dirs: string[] = [];
  const tmp = (): string => {
    const dir = mkdtempSync(join(tmpdir(), "tsqa-llm-"));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    while (dirs.length > 0)
      rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  const failingResult: PipelineResult = {
    success: false,
    hasBeenRestarted: false,
    phases: [
      {
        phase: 0,
        failed: false,
        toolResults: {
          supplyChain: { exitClass: "clean", stdout: "", stderr: "" },
          oxlint: { exitClass: "clean", stdout: "", stderr: "" },
        },
      },
      {
        phase: 2,
        failed: true,
        toolResults: {
          eslintReport: {
            exitClass: "failure",
            stdout: "lint out",
            stderr: "lint err",
          },
          knip: { exitClass: "clean", stdout: "", stderr: "" },
        },
      },
    ],
  };

  const cleanResult: PipelineResult = {
    success: true,
    hasBeenRestarted: false,
    phases: [
      {
        phase: 0,
        failed: false,
        toolResults: { oxlint: { exitClass: "clean", stdout: "", stderr: "" } },
      },
    ],
  };

  describe("formatLlmSummary", () => {
    it("renders a failing result with verdict, phase table, and failing tool", () => {
      const summary = formatLlmSummary(
        failingResult,
        "/tmp/cache/last-run.json",
      );

      expect(summary).toContain("Verdict: FAIL at phase 2");
      // The method line follows the verdict directly and links the
      // canonical specification.
      const lines = summary.split("\n");
      expect(lines[2]).toBe("Verdict: FAIL at phase 2");
      expect(lines[3]).toBe(
        "Defence Before Fix: https://longtermsupport.github.io/defence-before-fix/",
      );
      expect(lines[3]).toBe(DEFENCE_BEFORE_FIX_LINE);
      expect(lines.filter((l) => l === DEFENCE_BEFORE_FIX_LINE)).toHaveLength(
        1,
      );
      // Per-phase PASS/FAIL table with each tool's exitClass.
      expect(summary).toContain(
        "0      PASS    supplyChain:clean oxlint:clean",
      );
      expect(summary).toContain(
        "2      FAIL    eslintReport:failure knip:clean",
      );
      // Failing tool name + exitClass + its phase.
      expect(summary).toContain("eslintReport (failure) — phase 2");
      // Cache path + jq hints referencing it verbatim.
      expect(summary).toContain("Full result: /tmp/cache/last-run.json");
      expect(summary).toContain("jq '.success' /tmp/cache/last-run.json");
      expect(summary).toContain(".value.stderr");
    });

    it("renders a clean result with a PASS verdict and no failing-tools block", () => {
      const summary = formatLlmSummary(cleanResult, "/tmp/cache/last-run.json");

      expect(summary).toContain("Verdict: PASS — all phases clean");
      expect(summary).not.toContain("Failing tools:");
      expect(summary).not.toContain(DEFENCE_BEFORE_FIX_LINE);
      expect(summary).not.toContain("Defence Before Fix");
    });

    it("is deterministic — identical input yields identical output", () => {
      expect(formatLlmSummary(failingResult, "/p/last-run.json")).toBe(
        formatLlmSummary(failingResult, "/p/last-run.json"),
      );
    });

    it("surfaces a retry note when the pipeline was restarted", () => {
      const restarted: PipelineResult = {
        ...cleanResult,
        hasBeenRestarted: true,
      };
      expect(formatLlmSummary(restarted, "/p/last-run.json")).toContain(
        "a tool was retried",
      );
    });
  });

  describe("writeLlmCache", () => {
    it("persists the full PipelineResult to node_modules/.cache/ts-qa/llm/last-run.json", () => {
      const cwd = tmp();
      const path = writeLlmCache(failingResult, cwd);

      expect(path).toBe(llmCachePath(cwd));
      expect(
        path.endsWith(
          join("node_modules", ".cache", "ts-qa", "llm", "last-run.json"),
        ),
      ).toBe(true);
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as PipelineResult;
      // The FULL structured result round-trips — including per-tool stdout/stderr.
      expect(parsed).toStrictEqual(failingResult);
      expect(parsed.phases[1]?.toolResults.eslintReport?.stderr).toBe(
        "lint err",
      );
    });
  });

  describe("emitLlmOutput", () => {
    it("writes the cache and returns its path", () => {
      const cwd = tmp();
      const path = emitLlmOutput(cleanResult, cwd);

      expect(path).toBe(llmCachePath(cwd));
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as PipelineResult;
      expect(parsed).toStrictEqual(cleanResult);
    });
  });
});
