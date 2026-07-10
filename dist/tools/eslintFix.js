import { execTool } from './execTool.js';
/**
 * ESLint Phase 1 pass (phase2-design.md §2.2): --fix locally, --fix-dry-run
 * + diff-check in CI. Exit 0 = clean, exit 1 = problems found (retryable
 * failure), exit 2 = fatal config/crash (never retry).
 */
const tool = {
    name: 'eslintFix',
    phase: 1,
    mutates: true,
    pathSupporting: true,
    async run(ctx) {
        const target = ctx.path ?? '.';
        const args = ctx.readOnly ? ['--fix-dry-run', target] : ['--fix', target];
        const result = await execTool('npx', ['eslint', ...args], ctx.cwd);
        if (result.exitCode === 0)
            return { exitClass: 'clean', stdout: result.stdout, stderr: result.stderr };
        if (result.exitCode === 2)
            return { exitClass: 'crash', stdout: result.stdout, stderr: result.stderr };
        return { exitClass: 'failure', stdout: result.stdout, stderr: result.stderr, diffPending: ctx.readOnly };
    },
};
export default tool;
//# sourceMappingURL=eslintFix.js.map