import type { RunContext, ToolModule, ToolResult } from '../orchestrator/types.js';
import { execTool } from './execTool.js';
import { generateEslintConfigFile } from './generateEslintConfigFile.js';

/**
 * ESLint Phase 2 pass (phase2-design.md §2.2): pure report pass over
 * whatever the Phase 1 --fix pass could not resolve, including the CDD
 * tier. Never mutates - runs the same rules with no --fix flag at all.
 */
const tool: ToolModule = {
  name: 'eslintReport',
  phase: 2,
  mutates: false,
  pathSupporting: true,

  async run(ctx: RunContext): Promise<ToolResult> {
    const target = ctx.path ?? '.';
    const configPath = generateEslintConfigFile(ctx);
    const result = await execTool('npx', ['eslint', '--config', configPath, target], ctx.cwd);

    if (result.exitCode === 0) return { exitClass: 'clean', stdout: result.stdout, stderr: result.stderr };
    if (result.exitCode === 2) return { exitClass: 'crash', stdout: result.stdout, stderr: result.stderr };
    return { exitClass: 'failure', stdout: result.stdout, stderr: result.stderr };
  },
};

export default tool;
