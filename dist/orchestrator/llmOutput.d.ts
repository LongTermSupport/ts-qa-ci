import type { PipelineResult } from './runPipeline.js';
/** Absolute path of the full-result cache file for a given consumer cwd. */
export declare function llmCachePath(cwd: string): string;
/** Persists the FULL PipelineResult to the stable cache file; returns its path. */
export declare function writeLlmCache(result: PipelineResult, cwd: string): string;
/**
 * Renders a compact, deterministic (no timestamps, no randomness) summary of a
 * PipelineResult: a one-line verdict, a per-phase PASS/FAIL table with each
 * tool's exitClass, the failing tool(s), the cache file path, and jq examples
 * for pulling detail out of the cache.
 */
export declare function formatLlmSummary(result: PipelineResult, cachePath: string): string;
/**
 * `--llm` entry point (called from bin/ts-qa.js after the pipeline completes):
 * writes the full result to the cache file, then prints the compact summary to
 * stdout. Returns the cache path (handy for tests and callers).
 */
export declare function emitLlmOutput(result: PipelineResult, cwd: string): string;
//# sourceMappingURL=llmOutput.d.ts.map