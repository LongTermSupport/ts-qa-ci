import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

/**
 * Shared flat-config RuleTester for ts-qa-ci's own rules.
 *
 * Uses @typescript-eslint/parser (a devDependency, test-only) so fixtures may
 * contain TypeScript AND JSX — the rules themselves stay parser-agnostic plain
 * ESLint rules over ESTree/estree-jsx types. Not shipped: this module lives
 * under src/testSupport/ which tsconfig excludes from the dist build.
 */
export function makeRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  });
}
