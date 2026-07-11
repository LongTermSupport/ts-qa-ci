import type { ToolModule } from "../orchestrator/types.js";
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
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=oxlint.d.ts.map