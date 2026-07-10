import noEslintDisable from './noEslintDisable.js';
import noDuplicateSectionIds from './noDuplicateSectionIds.js';
import noPlaceholder from './noPlaceholder.js';
import requireExplicitTypeAnnotations from './requireExplicitTypeAnnotations.js';
import requireExportedComponentTypes from './requireExportedComponentTypes.js';
import ssrSafeHooks from './ssrSafeHooks.js';
import validateLazyImports from './validateLazyImports.js';
import noAdHocHtml from './noAdHocHtml.js';
import noAdHocClassnames from './noAdHocClassnames.js';
import variantApiEnforcement from './variantApiEnforcement.js';
/**
 * ESLint flat-config plugin delivery (phase2-design.md §3): a "plugin" is
 * just an exported object with a `rules` map — no eslint-plugin-ts-qa-ci
 * package or legacy plugin-name resolution needed.
 */
export const tsQaPlugin = {
    rules: {
        'no-eslint-disable': noEslintDisable,
        'no-duplicate-section-ids': noDuplicateSectionIds,
        'no-placeholder': noPlaceholder,
        'require-explicit-type-annotations': requireExplicitTypeAnnotations,
        'require-exported-component-types': requireExportedComponentTypes,
        'ssr-safe-hooks': ssrSafeHooks,
        'validate-lazy-imports': validateLazyImports,
        'no-ad-hoc-html': noAdHocHtml,
        'no-ad-hoc-classnames': noAdHocClassnames,
        'variant-api-enforcement': variantApiEnforcement,
    },
};
/** Tier A rule IDs, namespaced as they appear in a consumer's flat config (ts-qa/<rule>). */
export const TIER_A_ESLINT_RULES = {
    'ts-qa/no-eslint-disable': 'error',
    'ts-qa/no-duplicate-section-ids': 'error',
    'ts-qa/no-placeholder': 'error',
    'ts-qa/require-explicit-type-annotations': 'error',
    'ts-qa/require-exported-component-types': 'error',
    'ts-qa/ssr-safe-hooks': 'error',
    'ts-qa/validate-lazy-imports': 'error',
    'ts-qa/no-ad-hoc-html': 'error',
};
/** Tier B rule IDs — opt-in, NOT spread by default (consumer must enable explicitly). */
export const TIER_B_ESLINT_RULES = {
    'ts-qa/no-ad-hoc-classnames': 'warn',
    'ts-qa/variant-api-enforcement': 'off', // scaffold only, see variantApiEnforcement.ts
};
//# sourceMappingURL=index.js.map