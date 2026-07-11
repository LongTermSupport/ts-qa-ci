import { resolveConfigPath } from "../orchestrator/resolveConfigPath.js";
import { execTool } from "./execTool.js";
/**
 * Phase 0 — Fast Fail (added 2026-07-10 per maintainer direction, see
 * PLAN.md Decision 7). oxlint is a Rust-based linter (the Oxc project)
 * that reimplements a large subset of ESLint's core + popular-plugin
 * rules natively — 50-100x faster than ESLint, but it does NOT support
 * arbitrary custom JS-authored ESLint rule plugins. That makes it a
 * pre-filter, not a replacement: it cannot run ts-qa-ci's own CDD/Tier A
 * rules (src/rules/*.ts), so full ESLint (eslintFix/eslintReport) still
 * runs in Phase 1/2 regardless.
 *
 * This directly carries over php-qa-ci's verified cheap-before-expensive
 * ordering (bin/qa: allCodingStandardsTools -> allLintingTools, with the
 * trivial phpLint syntax check ordered ahead of the pricier
 * composerRequireChecker/markdownLinks within that phase, -> the much
 * more expensive allStaticAnalysisTools -> allTestingTools). oxlint is
 * the TS-side equivalent of that "run the near-instant check first" step:
 * if it fails, the pipeline aborts before spending time on Prettier, the
 * full type-aware ESLint pass, tsc, or tests.
 */
const tool = {
  name: "oxlint",
  phase: 0,
  mutates: true,
  pathSupporting: true,
  async run(ctx) {
    const target = ctx.path ?? ".";
    // Config cascade (project tsQaConfig/.oxlintrc.json -> platform default -> generic
    // default): without this, oxlint has no ignorePatterns and lints everything,
    // including deliberately-non-source content like article code-snippet directories
    // (found while dogfooding on lts-commerce-site, Plan 011 Task 4.2/4.3).
    const configPath = resolveConfigPath(
      ctx.cwd,
      ctx.platform,
      ".oxlintrc.json",
      ctx.packageRoot,
    );
    // --deny-warnings is NOT optional: oxlint's default behaviour is exit 0 even when
    // warning-severity violations are found (empirically verified — most of its rules,
    // including no-unused-vars, are warning-severity by default). Without this flag,
    // Phase 0 would silently pass on real problems, defeating the entire fail-fast
    // premise (see PLAN.md Decision 7 — "fail fast and cheap" is the point).
    const baseArgs = ["--deny-warnings", "--config", configPath];
    const args = ctx.readOnly
      ? [...baseArgs, target]
      : [...baseArgs, "--fix", target];
    const result = await execTool("npx", ["oxlint", ...args], ctx.cwd);
    // oxlint: exit 0 = clean, exit 1 = lint problems found (with --deny-warnings, this
    // includes warnings), anything else = crash/config error.
    if (result.exitCode === 0)
      return {
        exitClass: "clean",
        stdout: result.stdout,
        stderr: result.stderr,
      };
    if (result.exitCode === 1) {
      // A fatal --config parse error ALSO exits 1, indistinguishable by exit code
      // from "lint problems found" (GitHub issue #2, BUG B). Left as a `failure`
      // it is misleadingly retryable - retryGate would offer to re-run a
      // structurally-broken config, and diffPending would be a lie. Detect the
      // fatal-config signature (emitted on stdout, occasionally stderr depending
      // on version) and classify as `crash`, which retryGate never retries, with
      // diffPending left unset.
      const combined = `${result.stdout}\n${result.stderr}`;
      if (/Failed to parse oxlint config/i.test(combined)) {
        return {
          exitClass: "crash",
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }
      return {
        exitClass: "failure",
        stdout: result.stdout,
        stderr: result.stderr,
        diffPending: ctx.readOnly,
      };
    }
    return { exitClass: "crash", stdout: result.stdout, stderr: result.stderr };
  },
};
export default tool;
//# sourceMappingURL=oxlint.js.map
