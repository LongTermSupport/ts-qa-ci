import { execTool } from "./execTool.js";
/**
 * tsc --noEmit (phase2-design.md §2.5): non-mutating, always runs
 * unconditionally outside the read-only branch — there's no writable mode
 * for a type-checker.
 */
const tool = {
    name: "tsc",
    phase: 3,
    mutates: false,
    pathSupporting: false, // tsc's scope is owned by tsconfig.json, not a CLI path arg
    async run(ctx) {
        const result = await execTool("npx", ["tsc", "--noEmit"], ctx.cwd);
        return {
            exitClass: result.exitCode === 0 ? "clean" : "failure",
            stdout: result.stdout,
            stderr: result.stderr,
        };
    },
};
export default tool;
//# sourceMappingURL=tsc.js.map