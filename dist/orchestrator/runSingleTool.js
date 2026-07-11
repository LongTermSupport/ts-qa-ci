import { KNOWN_TOOLS } from "./resolveDisabledTools.js";
import { resolveToolModule } from "./resolveToolModule.js";
import { logToolResult } from "./runPhase.js";
import { runTool } from "./runTool.js";
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
export async function runSingleTool(toolName, ctx, packageRoot, projectRoot) {
  if (!KNOWN_TOOLS.includes(toolName)) {
    throw new Error(
      `ts-qa: unknown tool "${toolName}" (-t). Known tools: ${KNOWN_TOOLS.join(", ")}`,
    );
  }
  const tool = await resolveToolModule(
    projectRoot,
    ctx.platform,
    packageRoot,
    toolName,
  );
  const result = await runTool(tool, ctx);
  logToolResult(toolName, result, ctx.json);
  // Report the tool module's own `phase`, not a phase from the PHASES
  // ladder — an opt-in tool like stryker has no ladder slot at all, and for
  // ladder tools this is equivalent to the phase runPhase.ts would report.
  return {
    phase: tool.phase,
    toolResults: { [toolName]: result },
    failed: result.exitClass !== "clean",
  };
}
//# sourceMappingURL=runSingleTool.js.map
