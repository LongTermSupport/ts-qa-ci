import { resolveToolModule } from './resolveToolModule.js';
import { runTool } from './runTool.js';
import type { PhaseDefinition, RunContext, ToolResult } from './types.js';

export interface PhaseResult {
  phase: number;
  toolResults: Record<string, ToolResult>;
  failed: boolean;
}

/**
 * Runs one phase's tool list in order (phase2-design.md §2.2/§2.3).
 * Fail-fast by default: stops at the first non-clean tool unless
 * ctx.aggregate is set, in which case every tool in the phase runs and all
 * failures are collected together (read-only runs only, per §2.6).
 */
/**
 * Tool output is captured (not inherited) by execTool so it can be
 * aggregated into --json output and the retry gate can reason about it -
 * but that means nothing prints it to the terminal by default. Without this,
 * a human running `ts-qa` sees only a bare exit code on failure with zero
 * indication of what broke (found while dogfooding on lts-commerce-site,
 * Plan 011 Task 4.2/4.3 - the very first real run was completely silent).
 * --json mode suppresses this: the caller gets the full structured result
 * instead and would see duplicated output otherwise.
 */
export function logToolResult(toolName: string, result: ToolResult, json: boolean): void {
  if (json) return;
  if (result.exitClass === 'clean') {
    console.log(`ts-qa: ${toolName}: clean`);
    return;
  }
  console.log(`ts-qa: ${toolName}: ${result.exitClass}`);
  if (result.stdout.trim()) process.stdout.write(result.stdout);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
}

export async function runPhase(phaseDef: PhaseDefinition, ctx: RunContext, packageRoot: string, projectRoot: string): Promise<PhaseResult> {
  const toolResults: Record<string, ToolResult> = {};
  let failed = false;

  for (const toolName of phaseDef.tools) {
    const tool = await resolveToolModule(projectRoot, ctx.platform, packageRoot, toolName);
    const result = await runTool(tool, ctx);
    toolResults[toolName] = result;
    logToolResult(toolName, result, ctx.json);

    if (result.exitClass !== 'clean') {
      failed = true;
      if (!ctx.aggregate) break;
    }
  }

  return { phase: phaseDef.number, toolResults, failed };
}
