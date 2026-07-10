import type { RunContext, ToolModule, ToolResult } from '../orchestrator/types.js';
import { execTool } from './execTool.js';

/**
 * knip (phase2-design.md §1) - dead code / unused deps / unused exports.
 * §7 risk 3: ships with only a default single-entry-point config; the
 * consumer's real multi-entry graph (Vite client + SSR + free-standing
 * scripts) needs a project-specific tsQaConfig/knip.json override, or the
 * first dogfood run will surface false-positive noise.
 */
const tool: ToolModule = {
  name: 'knip',
  phase: 2,
  mutates: false,
  pathSupporting: false,

  async run(ctx: RunContext): Promise<ToolResult> {
    const result = await execTool('npx', ['knip'], ctx.cwd);
    return {
      exitClass: result.exitCode === 0 ? 'clean' : 'failure',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default tool;
