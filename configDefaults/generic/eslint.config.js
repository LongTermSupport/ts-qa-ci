// Tier A — core, always-on CDD/QA rules (Plan 011 phase2-design.md §4.1).
// This is the base config resolveEslintConfig.ts always spreads first,
// unconditionally, before any project override.
//
// Imports from ../../dist/ (compiled output), not ../../src/ — this file
// ships as plain JS in configDefaults/ (see package.json "files"), and
// runs against a consumer's own Node, not through this package's own
// TypeScript build step.
import eslintConfigPrettier from 'eslint-config-prettier';
import { tsQaPlugin, TIER_A_ESLINT_RULES } from '../../dist/rules/index.js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'var/**'],
  },
  // Disables every ESLint stylistic rule that conflicts with Prettier - must run
  // before project additions so a project can still re-enable a specific stylistic
  // rule deliberately (last-entry-wins), not to defeat this baseline silently.
  eslintConfigPrettier,
  {
    // Meta-rule scope note: meta-rules (no-async-handlers, require-documentation,
    // validate-message-ids) are NOT included here — they lint ts-qa-ci's own
    // eslint-rules/*.js authoring surface, not consumer code, and ship as part
    // of this package's own internal lint config instead (see phase2-design.md §4.1).
    files: ['**/*.tsx'],
    plugins: { 'ts-qa': tsQaPlugin },
    rules: {
      'ts-qa/no-ad-hoc-html': TIER_A_ESLINT_RULES['ts-qa/no-ad-hoc-html'],
      'ts-qa/no-duplicate-section-ids': TIER_A_ESLINT_RULES['ts-qa/no-duplicate-section-ids'],
      'ts-qa/ssr-safe-hooks': TIER_A_ESLINT_RULES['ts-qa/ssr-safe-hooks'],
      'ts-qa/validate-lazy-imports': TIER_A_ESLINT_RULES['ts-qa/validate-lazy-imports'],
      'ts-qa/require-exported-component-types': TIER_A_ESLINT_RULES['ts-qa/require-exported-component-types'],
      // JSX-scoped Tier A rules ported from admin-ts (Plan 00004).
      'ts-qa/jsx-truthy-narrow': TIER_A_ESLINT_RULES['ts-qa/jsx-truthy-narrow'],
      'ts-qa/no-inline-component-decl-in-render':
        TIER_A_ESLINT_RULES['ts-qa/no-inline-component-decl-in-render'],
    },
  },
  {
    // Repo-wide Tier A rules — not JSX-scoped.
    files: ['**/*.{ts,tsx}'],
    plugins: { 'ts-qa': tsQaPlugin },
    rules: {
      'ts-qa/no-eslint-disable': TIER_A_ESLINT_RULES['ts-qa/no-eslint-disable'],
      'ts-qa/no-placeholder': TIER_A_ESLINT_RULES['ts-qa/no-placeholder'],
      'ts-qa/require-explicit-type-annotations': TIER_A_ESLINT_RULES['ts-qa/require-explicit-type-annotations'],
      // Repo-wide Tier A rules ported from admin-ts (Plan 00004).
      'ts-qa/require-error-cause': TIER_A_ESLINT_RULES['ts-qa/require-error-cause'],
      'ts-qa/no-typed-query-selector': TIER_A_ESLINT_RULES['ts-qa/no-typed-query-selector'],
      'ts-qa/exhaustive-discriminated': TIER_A_ESLINT_RULES['ts-qa/exhaustive-discriminated'],
    },
  },
];
