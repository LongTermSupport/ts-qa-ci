import { execTool } from "./execTool.js";
/**
 * Prettier exit-code contract (phase2-design.md §2.5, flagged as needing
 * empirical re-verification against pinned versions before shipping — see
 * §7 risk 5): --check exit 0 = clean, exit 1 = pending diff OR a parse
 * error (no separate crash code). Disambiguate via the
 * "Files that were not fixed due to errors" stdout marker, mirroring the
 * PHP CS Fixer fallback A.2 documented.
 */
const tool = {
  name: "prettier",
  phase: 1,
  mutates: true,
  pathSupporting: true,
  async run(ctx) {
    const target = ctx.path ?? ".";
    const args = ctx.readOnly ? ["--check", target] : ["--write", target];
    const result = await execTool("npx", ["prettier", ...args], ctx.cwd);
    if (result.exitCode === 0) {
      return {
        exitClass: "clean",
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }
    const isParseError =
      result.stderr.includes("SyntaxError") ||
      result.stdout.includes("due to errors");
    return {
      exitClass: isParseError ? "crash" : "failure",
      stdout: result.stdout,
      stderr: result.stderr,
      diffPending: !isParseError && ctx.readOnly,
    };
  },
};
export default tool;
//# sourceMappingURL=prettier.js.map
