import type { RunContext, ToolModule, ToolResult } from '../orchestrator/types.js';
import { execTool } from './execTool.js';

/**
 * Stryker Mutator (phase2-design.md §1): optional mutation tier, mirrors
 * Infection's optional-tier treatment - opt-in, not part of the core
 * always-on phases (only invoked via -t stryker, never part of PHASES).
 */
const tool: ToolModule = {
  name: 'stryker',
  phase: 4,
  mutates: false,
  pathSupporting: false,

  async run(ctx: RunContext): Promise<ToolResult> {
    const result = await execTool('npx', ['stryker', 'run'], ctx.cwd);
    return {
      exitClass: result.exitCode === 0 ? 'clean' : 'failure',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default tool;
