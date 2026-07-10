import type { RunContext, ToolModule, ToolResult } from '../orchestrator/types.js';
import { execTool } from './execTool.js';

/**
 * dependency-cruiser, run as its own standalone phase-3 step (phase2-design.md
 * §1) - NOT via eslint-plugin-dependency-cruiser, which re-cruises per file
 * inside ESLint's single-file AST pass and recreates the exact
 * structural-check-inside-behavioural-engine anti-pattern the SSoT
 * principle exists to prevent.
 */
const tool: ToolModule = {
  name: 'dependencyCruiser',
  phase: 3,
  mutates: false,
  pathSupporting: false, // paths live in dependency-cruiser's own config, same as PHPArkitect

  async run(ctx: RunContext): Promise<ToolResult> {
    const result = await execTool('npx', ['depcruise', '--config', '.dependency-cruiser.cjs', 'src'], ctx.cwd);
    return {
      exitClass: result.exitCode === 0 ? 'clean' : 'failure',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

export default tool;
