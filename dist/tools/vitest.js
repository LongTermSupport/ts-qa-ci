import { execTool } from "./execTool.js";
/**
 * Vitest (phase2-design.md §3): peerDependency, orchestrates the consumer's
 * own configured test setup rather than shipping a default one - invokes
 * the consumer's own installed binary/config, the same relationship tsc
 * --noEmit has to the consumer's tsconfig.json.
 */
const tool = {
    name: "vitest",
    phase: 4,
    mutates: false,
    pathSupporting: true,
    async run(ctx) {
        const args = ctx.path ? ["run", ctx.path] : ["run"];
        const result = await execTool("npx", ["vitest", ...args], ctx.cwd);
        return {
            exitClass: result.exitCode === 0 ? "clean" : "failure",
            stdout: result.stdout,
            stderr: result.stderr,
        };
    },
};
export default tool;
//# sourceMappingURL=vitest.js.map