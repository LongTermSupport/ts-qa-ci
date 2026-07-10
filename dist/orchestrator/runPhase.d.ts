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
export declare function runPhase(phaseDef: PhaseDefinition, ctx: RunContext, packageRoot: string, projectRoot: string): Promise<PhaseResult>;
//# sourceMappingURL=runPhase.d.ts.map