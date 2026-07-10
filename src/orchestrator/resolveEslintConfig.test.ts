import { describe, it, expect } from 'vitest';
import { findTierARuleOverrides } from './resolveEslintConfig.js';

/**
 * Defends the override-gate against silent Tier A downgrades — including the
 * linterOptions path (Plan 00004 Task 1.4 audit finding F4): a project appending
 * `linterOptions.reportUnusedDisableDirectives: 'off'` must be caught, not
 * silently win last-entry-wins.
 */
describe('findTierARuleOverrides', () => {
  it('flags a project entry that touches a Tier A rule severity', () => {
    const overrides = findTierARuleOverrides([
      { files: ['**/*.ts'], rules: { 'ts-qa/no-eslint-disable': 'off' } },
    ]);
    expect(overrides).toEqual([{ ruleId: 'ts-qa/no-eslint-disable', files: ['**/*.ts'] }]);
  });

  it('flags the always-on as/enum ban (no-restricted-syntax)', () => {
    const overrides = findTierARuleOverrides([{ rules: { 'no-restricted-syntax': 'off' } }]);
    expect(overrides.map((o) => o.ruleId)).toContain('no-restricted-syntax');
  });

  it('flags a linterOptions.reportUnusedDisableDirectives downgrade', () => {
    const overrides = findTierARuleOverrides([
      { linterOptions: { reportUnusedDisableDirectives: 'off' } },
    ]);
    expect(overrides.map((o) => o.ruleId)).toContain('reportUnusedDisableDirectives');
  });

  it('does NOT flag reportUnusedDisableDirectives set to error (matches the base)', () => {
    const overrides = findTierARuleOverrides([
      { linterOptions: { reportUnusedDisableDirectives: 'error' } },
    ]);
    expect(overrides).toEqual([]);
  });

  it('ignores non-Tier-A rules and empty entries', () => {
    const overrides = findTierARuleOverrides([
      { rules: { 'no-console': 'off' } },
      { ignores: ['dist/**'] },
    ]);
    expect(overrides).toEqual([]);
  });
});
