/**
 * Tier A — core, always-on, pipeline-owned ESLint rules (phase2-design.md §4.1).
 * These rule IDs are what resolveEslintConfig.ts polices: a project's own
 * tsQaConfig/eslint.config.js may not touch any severity for these rule IDs
 * without a matching, justified entry in tsQaConfig/tier-a-exemptions.json.
 *
 * Populated as each rule is actually implemented (Task 3.3) - kept here as a
 * single source of truth rather than duplicated across the ESLint config and
 * the guard logic.
 */
export declare const TIER_A_RULE_IDS: readonly string[];
//# sourceMappingURL=tierARules.d.ts.map