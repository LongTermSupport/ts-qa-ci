import { resolveConfigPath } from '../orchestrator/resolveConfigPath.js';
import { execTool } from './execTool.js';
/**
 * dependency-cruiser, run as its own standalone phase-3 step (phase2-design.md
 * §1) - NOT via eslint-plugin-dependency-cruiser, which re-cruises per file
 * inside ESLint's single-file AST pass and recreates the exact
 * structural-check-inside-behavioural-engine anti-pattern the SSoT
 * principle exists to prevent.
 */
const tool = {
    name: 'dependencyCruiser',
    phase: 3,
    mutates: false,
    pathSupporting: false, // paths live in dependency-cruiser's own config, same as PHPArkitect
    async run(ctx) {
        // Was hardcoded to the wrong filename (`.dependency-cruiser.cjs`, which this
        // package never ships) and bypassed the config cascade entirely - depcruise
        // silently fell back to its own zero-config defaults on every real run (found
        // while dogfooding on lts-commerce-site, Plan 011 Task 4.2/4.3).
        const configPath = resolveConfigPath(ctx.cwd, ctx.platform, 'dependency-cruiser.config.cjs', ctx.packageRoot);
        const result = await execTool('npx', ['depcruise', '--config', configPath, 'src'], ctx.cwd);
        return {
            exitClass: result.exitCode === 0 ? 'clean' : 'failure',
            stdout: result.stdout,
            stderr: result.stderr,
        };
    },
};
export default tool;
//# sourceMappingURL=dependencyCruiser.js.map