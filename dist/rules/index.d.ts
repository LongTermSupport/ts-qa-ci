/**
 * ESLint flat-config plugin delivery (phase2-design.md §3): a "plugin" is
 * just an exported object with a `rules` map — no eslint-plugin-ts-qa-ci
 * package or legacy plugin-name resolution needed.
 */
export declare const tsQaPlugin: {
    rules: {
        'no-eslint-disable': import("eslint").Rule.RuleModule;
        'no-duplicate-section-ids': import("eslint").Rule.RuleModule;
        'no-placeholder': import("eslint").Rule.RuleModule;
        'require-explicit-type-annotations': import("eslint").Rule.RuleModule;
        'require-exported-component-types': import("eslint").Rule.RuleModule;
        'ssr-safe-hooks': import("eslint").Rule.RuleModule;
        'validate-lazy-imports': import("eslint").Rule.RuleModule;
        'no-ad-hoc-html': import("eslint").Rule.RuleModule;
        'no-ad-hoc-classnames': import("eslint").Rule.RuleModule;
        'variant-api-enforcement': import("eslint").Rule.RuleModule;
        'require-error-cause': import("eslint").Rule.RuleModule;
        'no-typed-query-selector': import("eslint").Rule.RuleModule;
        'jsx-truthy-narrow': import("eslint").Rule.RuleModule;
        'no-inline-component-decl-in-render': import("eslint").Rule.RuleModule;
        'exhaustive-discriminated': import("eslint").Rule.RuleModule;
        'one-component-per-file': import("eslint").Rule.RuleModule;
        'explicit-component-displayname': import("eslint").Rule.RuleModule;
        'no-error-hiding-fallback': import("eslint").Rule.RuleModule;
        'no-dom-classname-mutation': import("eslint").Rule.RuleModule;
        'no-default-export': import("eslint").Rule.RuleModule;
        'no-cross-module-relative': import("eslint").Rule.RuleModule;
    };
};
/**
 * Tier A rule IDs, namespaced as they appear in a consumer's flat config
 * (ts-qa/<rule>). Tier A is ALWAYS-ON — spread into the generic base config and
 * applied to every consumer. Only universal correctness rules belong here;
 * opinionated / stylistic / project-specific rules go in Tier B or C so other
 * consumers (e.g. lts-commerce-site) are not force-broken on a version bump.
 */
export declare const TIER_A_ESLINT_RULES: {
    readonly 'ts-qa/no-eslint-disable': "error";
    readonly 'ts-qa/no-duplicate-section-ids': "error";
    readonly 'ts-qa/no-placeholder': "error";
    readonly 'ts-qa/require-explicit-type-annotations': "error";
    readonly 'ts-qa/require-exported-component-types': "error";
    readonly 'ts-qa/ssr-safe-hooks': "error";
    readonly 'ts-qa/validate-lazy-imports': "error";
    readonly 'ts-qa/no-ad-hoc-html': "error";
    readonly 'ts-qa/require-error-cause': "error";
    readonly 'ts-qa/no-typed-query-selector': "error";
    readonly 'ts-qa/jsx-truthy-narrow': "error";
    readonly 'ts-qa/no-inline-component-decl-in-render': "error";
    readonly 'ts-qa/exhaustive-discriminated': "error";
};
/** Tier B rule IDs — opt-in, NOT spread by default (consumer must enable explicitly). */
export declare const TIER_B_ESLINT_RULES: {
    readonly 'ts-qa/no-ad-hoc-classnames': "warn";
    readonly 'ts-qa/variant-api-enforcement': "off";
    readonly 'ts-qa/one-component-per-file': "warn";
    readonly 'ts-qa/explicit-component-displayname': "warn";
    readonly 'ts-qa/no-error-hiding-fallback': "warn";
    readonly 'ts-qa/no-dom-classname-mutation': "warn";
};
/**
 * Tier C rule IDs — opt-in, project/framework-specific, NOT spread by default.
 * Establishes the previously-unbuilt Tier C (docs/cdd-rules.md §Tier C) with the
 * first two architecture rules ported from admin-ts (Plan 00004). Recommended
 * severity when a project opts in is 'error'; they stay off for everyone else.
 */
export declare const TIER_C_ESLINT_RULES: {
    readonly 'ts-qa/no-default-export': "error";
    readonly 'ts-qa/no-cross-module-relative': "error";
};
//# sourceMappingURL=index.d.ts.map