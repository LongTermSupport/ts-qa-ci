import { resolveToolModule } from './resolveToolModule.js';
import { runTool } from './runTool.js';
/**
 * Runs one phase's tool list in order (phase2-design.md §2.2/§2.3).
 * Fail-fast by default: stops at the first non-clean tool unless
 * ctx.aggregate is set, in which case every tool in the phase runs and all
 * failures are collected together (read-only runs only, per §2.6).
 */
export async function runPhase(phaseDef, ctx, packageRoot, projectRoot) {
    const toolResults = {};
    let failed = false;
    for (const toolName of phaseDef.tools) {
        const tool = await resolveToolModule(projectRoot, ctx.platform, packageRoot, toolName);
        const result = await runTool(tool, ctx);
        toolResults[toolName] = result;
        if (result.exitClass !== 'clean') {
            failed = true;
            if (!ctx.aggregate)
                break;
        }
    }
    return { phase: phaseDef.number, toolResults, failed };
}
//# sourceMappingURL=runPhase.js.map