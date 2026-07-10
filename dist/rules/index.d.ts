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
    };
};
/** Tier A rule IDs, namespaced as they appear in a consumer's flat config (ts-qa/<rule>). */
export declare const TIER_A_ESLINT_RULES: {
    readonly 'ts-qa/no-eslint-disable': "error";
    readonly 'ts-qa/no-duplicate-section-ids': "error";
    readonly 'ts-qa/no-placeholder': "error";
    readonly 'ts-qa/require-explicit-type-annotations': "error";
    readonly 'ts-qa/require-exported-component-types': "error";
    readonly 'ts-qa/ssr-safe-hooks': "error";
    readonly 'ts-qa/validate-lazy-imports': "error";
    readonly 'ts-qa/no-ad-hoc-html': "error";
};
/** Tier B rule IDs — opt-in, NOT spread by default (consumer must enable explicitly). */
export declare const TIER_B_ESLINT_RULES: {
    readonly 'ts-qa/no-ad-hoc-classnames': "warn";
    readonly 'ts-qa/variant-api-enforcement': "off";
};
//# sourceMappingURL=index.d.ts.map