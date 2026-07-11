import { resolveToolModule } from './resolveToolModule.js';
import { runTool } from './runTool.js';
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
export function logToolResult(toolName, result, json) {
    if (json)
        return;
    if (result.exitClass === 'clean') {
        console.log(`ts-qa: ${toolName}: clean`);
        return;
    }
    console.log(`ts-qa: ${toolName}: ${result.exitClass}`);
    if (result.stdout.trim())
        process.stdout.write(result.stdout);
    if (result.stderr.trim())
        process.stderr.write(result.stderr);
}
export async function runPhase(phaseDef, ctx, packageRoot, projectRoot) {
    const toolResults = {};
    let failed = false;
    for (const toolName of phaseDef.tools) {
        const tool = await resolveToolModule(projectRoot, ctx.platform, packageRoot, toolName);
        const result = await runTool(tool, ctx);
        toolResults[toolName] = result;
        // `--llm` captures every tool's stdout/stderr into the persisted cache and
        // prints only a compact summary, so it suppresses this passthrough like `--json`.
        logToolResult(toolName, result, ctx.json || ctx.llm);
        if (result.exitClass !== 'clean') {
            failed = true;
            // BUG B: a crash (e.g. a missing binary) is never retried and must abort
            // the phase even under --aggregate — retryGate's contract is "caller
            // aborts on crash". Only a plain failure is allowed to aggregate.
            if (result.exitClass === 'crash')
                break;
            if (!ctx.aggregate)
                break;
        }
    }
    return { phase: phaseDef.number, toolResults, failed };
}
//# sourceMappingURL=runPhase.js.map