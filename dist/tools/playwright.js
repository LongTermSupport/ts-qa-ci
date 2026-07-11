import { execTool } from "./execTool.js";
/** Playwright (phase2-design.md §3): peerDependency, same orchestrate-don't-ship-config relationship as vitest.ts. */
const tool = {
  name: "playwright",
  phase: 4,
  mutates: false,
  pathSupporting: true,
  async run(ctx) {
    const args = ctx.path ? ["test", ctx.path] : ["test"];
    const result = await execTool("npx", ["playwright", ...args], ctx.cwd);
    return {
      exitClass: result.exitCode === 0 ? "clean" : "failure",
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};
export default tool;
//# sourceMappingURL=playwright.js.map
