import { type PhaseResult } from "./runPhase.js";
import type { RunContext } from "./types.js";
/**
 * Runs exactly one named tool, bypassing phase grouping entirely
 * (`ts-qa -t <tool>` — docs/pipeline.md "Running a single phase or tool").
 * Fixes GitHub issue #1: `-t` was parsed by bin/ts-qa.js into
 * `options.tool`, but runPipeline.ts never read it, so `-t` silently ran the
 * whole phase ladder instead of the one requested tool.
 *
 * `disabledTools`/`--skip` (resolveDisabledTools.ts) is deliberately NEVER
 * consulted here. An explicit `-t <tool>` is a targeted, deliberate request
 * - overriding a project-wide opt-out is the whole point of naming a tool
 * directly (e.g. `-t stryker`, which isn't in any phase and can only ever be
 * invoked this way). Silently no-op'ing it because of an unrelated
 * `disabledTools` entry would be far more surprising than honouring it.
 */
export declare function runSingleTool(toolName: string, ctx: RunContext, packageRoot: string, projectRoot: string): Promise<PhaseResult>;
//# sourceMappingURL=runSingleTool.d.ts.map