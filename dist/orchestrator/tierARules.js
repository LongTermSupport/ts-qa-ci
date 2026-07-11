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
export const TIER_A_RULE_IDS = [
    "ts-qa/no-eslint-disable",
    "ts-qa/no-duplicate-section-ids",
    "ts-qa/no-placeholder",
    "ts-qa/require-explicit-type-annotations",
    "ts-qa/require-exported-component-types",
    "ts-qa/ssr-safe-hooks",
    "ts-qa/validate-lazy-imports",
    "ts-qa/no-ad-hoc-html",
    // Tier A rules ported from admin-ts's eslint-plugin-dbf (Plan 00004). These
    // are wired into TIER_A_ESLINT_RULES + the generic base config, so they MUST
    // be listed here too or the override-guard would let a consumer silently
    // downgrade them.
    "ts-qa/require-error-cause",
    "ts-qa/no-typed-query-selector",
    "ts-qa/jsx-truthy-narrow",
    "ts-qa/no-inline-component-decl-in-render",
    "ts-qa/exhaustive-discriminated",
    // "Closed component styling" doctrine (Plan 00004): a component owns its CSS
    // internally (static or dynamic) and exposes ONLY semantic variant props — no
    // className/style passthrough. The boundary is universal encapsulation
    // (Open/Closed), so these two live in Tier A alongside no-ad-hoc-html (which
    // covers the raw-element half). NOT to be confused with require-variant-resolver
    // (opt-in Tier B), which is about adopting a cva/cn resolver for INTERNAL classes.
    "ts-qa/no-classname-prop",
    "ts-qa/no-classname-public-prop",
    // Always-on strict-TS baseline pieces wired into the generic base config
    // (Plan 00004 Task 1.4). These are core-ESLint, not ts-qa/* rules:
    //   - no-restricted-syntax carries the always-on as/enum ban.
    //   - reportUnusedDisableDirectives is a linterOption, not a rule; the override
    //     gate special-cases it (see resolveEslintConfig.findTierARuleOverrides).
    "no-restricted-syntax",
    "reportUnusedDisableDirectives",
];
//# sourceMappingURL=tierARules.js.map