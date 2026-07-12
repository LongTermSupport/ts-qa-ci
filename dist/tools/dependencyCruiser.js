import { dirname } from "node:path";
import { resolveConfigPath } from "../orchestrator/resolveConfigPath.js";
import { resolveDependencyCruiserRoots } from "../orchestrator/resolveDependencyCruiserRoots.js";
import { bundledBin, execTool } from "./execTool.js";
/**
 * dependency-cruiser, run as its own standalone phase-3 step (phase2-design.md
 * §1) - NOT via eslint-plugin-dependency-cruiser, which re-cruises per file
 * inside ESLint's single-file AST pass and recreates the exact
 * structural-check-inside-behavioural-engine anti-pattern the SSoT
 * principle exists to prevent.
 */
const tool = {
    name: "dependencyCruiser",
    phase: 3,
    mutates: false,
    pathSupporting: false, // paths live in dependency-cruiser's own config, same as PHPArkitect
    async run(ctx) {
        // Was hardcoded to the wrong filename (`.dependency-cruiser.cjs`, which this
        // package never ships) and bypassed the config cascade entirely - depcruise
        // silently fell back to its own zero-config defaults on every real run (found
        // while dogfooding on lts-commerce-site, Plan 011 Task 4.2/4.3).
        const configPath = resolveConfigPath(ctx.cwd, ctx.platform, "dependency-cruiser.config.cjs", ctx.packageRoot);
        // depcruise needs at least one positional scan target. `src` was hardcoded,
        // which fails `Can't open 'src'` on any repo not rooted at a single ./src
        // (e.g. a pnpm monorepo with apps/<pkg>/src, packages/<pkg>/src). The targets
        // are configurable via tsQaConfig/ts-qa.json `dependencyCruiserScanRoots`,
        // defaulting to ["src"] so single-package repos are unaffected.
        const scanRoots = resolveDependencyCruiserRoots(ctx.cwd);
        // Bundled dependency (not a peer): spawn ts-qa-ci's own copy directly. See bundledBin.
        const bin = bundledBin(ctx.packageRoot, "depcruise");
        const result = await execTool(bin, ["--config", configPath, ...scanRoots], ctx.cwd, dirname(bin));
        // depcruise is the only count-based tool here: it sets its exit code to the
        // number of error-level violations, which the OS truncates to 8 bits. So
        // exactly 256 (or 512, 768, ...) error-level violations wrap to exit 0 and
        // would wrongly read as clean - a silent QA hole (GitHub issue #2, BUG A).
        // Never trust the raw integer: cross-check the summary line depcruise always
        // prints ("x N dependency violations (E errors, W warnings)."). If the
        // summary reports > 0 errors, it is a failure regardless of the numeric exit.
        const summaryMatch = result.stdout.match(/(\d+)\s+dependency violations\s*\((\d+)\s+errors/);
        const summaryErrors = summaryMatch ? Number(summaryMatch[2]) : 0;
        const clean = result.exitCode === 0 && summaryErrors === 0;
        return {
            exitClass: clean ? "clean" : "failure",
            stdout: result.stdout,
            stderr: result.stderr,
        };
    },
};
export default tool;
//# sourceMappingURL=dependencyCruiser.js.map