import { describe, it, expect } from 'vitest';
import { STRICT_TYPESCRIPT_RULES, STRICT_TYPESCRIPT_STYLISTIC_RULES } from './strictTypescript.js';

/**
 * These assertions PIN the preset contents. admin-ts previously pinned the same
 * severities in its own config with the note "pinned here so a preset change can
 * never silently drop them" — that guarantee moves upstream with the doctrine.
 * A drop of any load-bearing rule (or a severity downgrade) fails the build.
 */
describe('STRICT_TYPESCRIPT_RULES (load-bearing strict-TS baseline)', () => {
  it('bans every non-const `as`, angle-bracket assertions, and enums via no-restricted-syntax', () => {
    const entry = STRICT_TYPESCRIPT_RULES['no-restricted-syntax'];
    expect(Array.isArray(entry)).toBe(true);
    const [severity, ...selectors] = entry as [string, ...{ selector: string }[]];
    expect(severity).toBe('error');
    const selectorStrings = selectors.map((s) => s.selector);
    expect(selectorStrings).toContain("TSAsExpression:not([typeAnnotation.typeName.name='const'])");
    expect(selectorStrings).toContain('TSTypeAssertion');
    expect(selectorStrings).toContain('TSEnumDeclaration');
  });

  it('locks down every ts-comment directive (ban-ts-comment all false)', () => {
    const entry = STRICT_TYPESCRIPT_RULES['@typescript-eslint/ban-ts-comment'];
    const [severity, options] = entry as [string, Record<string, boolean>];
    expect(severity).toBe('error');
    expect(options['ts-expect-error']).toBe(false);
    expect(options['ts-ignore']).toBe(false);
    expect(options['ts-nocheck']).toBe(false);
    expect(options['ts-check']).toBe(false);
  });

  it('forbids object-literal type assertions', () => {
    const entry = STRICT_TYPESCRIPT_RULES['@typescript-eslint/consistent-type-assertions'];
    const [severity, options] = entry as [string, { objectLiteralTypeAssertions: string }];
    expect(severity).toBe('error');
    expect(options.objectLiteralTypeAssertions).toBe('never');
  });

  it('pins the load-bearing @typescript-eslint severities at error', () => {
    const required = [
      '@typescript-eslint/no-explicit-any',
      '@typescript-eslint/no-non-null-assertion',
      '@typescript-eslint/no-unnecessary-type-assertion',
      '@typescript-eslint/no-unsafe-type-assertion',
      '@typescript-eslint/no-unsafe-argument',
      '@typescript-eslint/no-unsafe-assignment',
      '@typescript-eslint/no-unsafe-call',
      '@typescript-eslint/no-unsafe-member-access',
      '@typescript-eslint/no-unsafe-return',
      '@typescript-eslint/strict-boolean-expressions',
      '@typescript-eslint/no-floating-promises',
      '@typescript-eslint/no-misused-promises',
      '@typescript-eslint/switch-exhaustiveness-check',
      '@typescript-eslint/restrict-template-expressions',
      '@typescript-eslint/no-unnecessary-condition',
      '@typescript-eslint/consistent-type-imports',
      '@typescript-eslint/promise-function-async',
      '@typescript-eslint/require-await',
    ];
    for (const ruleId of required) {
      expect(STRICT_TYPESCRIPT_RULES[ruleId], `${ruleId} must be present`).toBe('error');
    }
  });

  it('keeps opinionated/stylistic elevations OUT of the load-bearing set', () => {
    // These belong in STRICT_TYPESCRIPT_STYLISTIC_RULES so the correctness
    // ratchet does not drag consumers into stylistic churn (§3).
    const stylisticOnly = [
      '@typescript-eslint/explicit-module-boundary-types',
      '@typescript-eslint/method-signature-style',
      '@typescript-eslint/prefer-readonly',
    ];
    for (const ruleId of stylisticOnly) {
      expect(STRICT_TYPESCRIPT_RULES[ruleId], `${ruleId} must NOT be load-bearing`).toBeUndefined();
    }
  });
});

describe('STRICT_TYPESCRIPT_STYLISTIC_RULES (opt-in stylistic layer)', () => {
  it('carries the opinionated elevations at error', () => {
    expect(STRICT_TYPESCRIPT_STYLISTIC_RULES['@typescript-eslint/explicit-module-boundary-types']).toBe('error');
    expect(STRICT_TYPESCRIPT_STYLISTIC_RULES['@typescript-eslint/prefer-readonly']).toBe('error');
    expect(STRICT_TYPESCRIPT_STYLISTIC_RULES['@typescript-eslint/method-signature-style']).toEqual([
      'error',
      'property',
    ]);
  });

  it('does not overlap the load-bearing set (no rule declared in both)', () => {
    const loadBearing = new Set(Object.keys(STRICT_TYPESCRIPT_RULES));
    const overlap = Object.keys(STRICT_TYPESCRIPT_STYLISTIC_RULES).filter((k) => loadBearing.has(k));
    expect(overlap).toEqual([]);
  });
});
