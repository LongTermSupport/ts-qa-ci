import type { PhaseDefinition, RunContext, ToolResult } from './types.js';
export interface PhaseResult {
    phase: number;
    toolResults: Record<string, ToolResult>;
    failed: boolean;
}
export declare function runPhase(phaseDef: PhaseDefinition, ctx: RunContext, packageRoot: string, projectRoot: string): Promise<PhaseResult>;
//# sourceMappingURL=runPhase.d.ts.map