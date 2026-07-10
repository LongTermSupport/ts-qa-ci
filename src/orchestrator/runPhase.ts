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
export async function runPhase(phaseDef: PhaseDefinition, ctx: RunContext, packageRoot: string, projectRoot: string): Promise<PhaseResult> {
  const toolResults: Record<string, ToolResult> = {};
  let failed = false;

  for (const toolName of phaseDef.tools) {
    const tool = await resolveToolModule(projectRoot, ctx.platform, packageRoot, toolName);
    const result = await runTool(tool, ctx);
    toolResults[toolName] = result;

    if (result.exitClass !== 'clean') {
      failed = true;
      if (!ctx.aggregate) break;
    }
  }

  return { phase: phaseDef.number, toolResults, failed };
}
