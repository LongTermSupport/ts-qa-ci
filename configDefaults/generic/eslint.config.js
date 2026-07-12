// Tier A — core, always-on CDD/QA rules (Plan 011 phase2-design.md §4.1).
// This is the base config resolveEslintConfig.ts always spreads first,
// unconditionally, before any project override.
//
// Imports from ../../dist/ (compiled output), not ../../src/ — this file
// ships as plain JS in configDefaults/ (see package.json "files"), and
// runs against a consumer's own Node, not through this package's own
// TypeScript build step.
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import { tsQaPlugin, TIER_A_ESLINT_RULES } from '../../dist/rules/index.js'
import { AS_ENUM_BAN_SELECTORS } from '../../dist/configs/strictTypescript.js'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'var/**'],
  },
  {
    // Tier A: parse every TS/TSX file with typescript-eslint's parser. Without
    // this the base config falls back to espree (plain JS) and fails on `import
    // type`, type annotations, `interface`, `as`, generics, etc. — so ts-qa could
    // not lint ANY TypeScript project that doesn't already supply its own parser
    // (a plain TS library, or ts-qa-ci itself). typescript-eslint is a declared
    // peer dependency. Syntax-only (no `parserOptions.project`): the Tier A rules
    // are non-type-aware by design, so this stays fast and needs no tsconfig wiring.
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    // Tier A always-on (Plan 00004 Task 1.4): flag any eslint-disable/ts-* directive
    // that suppresses nothing — the native complement to `no-eslint-disable`.
    // Zero-dependency, zero-type-info. NOTE this applies to ALL files (no `files`
    // filter — linterOptions is global), including .js/.mjs; and a directive that is
    // UNUSED inside a `no-eslint-disable` tier-a-exemption still errors here (the
    // exemption covers the comment scan, not this option). Guarded by the override
    // gate (resolveEslintConfig.ts) so a consumer cannot silently downgrade it.
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    // Tier A always-on (Plan 00004 Task 1.4; see docs/cdd-rules.md
    // "no-restricted-syntax as/enum ban"): the total `as`/enum ban. Purely SYNTACTIC (core no-restricted-syntax over the
    // TS AST the consumer's parser already emits) — no type info, no plugin, never
    // crashes — so unlike the type-aware strict severities it is safe to force on.
    // Consumers needing extra patterns compose AS_ENUM_BAN_SELECTORS rather than
    // re-declaring no-restricted-syntax (which would clobber the ban); overriding it
    // requires a tier-a-exemptions.json entry.
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-syntax': ['error', ...AS_ENUM_BAN_SELECTORS],
    },
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
      'ts-qa/no-inline-component-decl-in-render': TIER_A_ESLINT_RULES['ts-qa/no-inline-component-decl-in-render'],
      // "Closed component styling" doctrine (call-site half): no className passed
      // INTO a component. Internal className strings are unaffected.
      'ts-qa/no-classname-prop': TIER_A_ESLINT_RULES['ts-qa/no-classname-prop'],
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
      // "Closed component styling" doctrine (declaration-site half): a component
      // must not DECLARE className as a public prop. Repo-wide because a prop type
      // may live in a .ts module.
      'ts-qa/no-classname-public-prop': TIER_A_ESLINT_RULES['ts-qa/no-classname-public-prop'],
    },
  },
]
