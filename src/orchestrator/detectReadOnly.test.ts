import { describe, it, expect, vi } from 'vitest';
import { detectCi, detectReadOnly } from './detectReadOnly.js';

/**
 * detectCi must be a pure predicate (GitHub issue #6, BUG A): it used to
 * console.log under CLAUDECODE, prepending non-JSON text to stdout and
 * corrupting `ts-qa --json`. The diagnostic now lives in the json-aware caller.
 */
describe('detectCi', () => {
  it('does not print anything when CLAUDECODE enables CI mode', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const env = { CLAUDECODE: '1' } as unknown as NodeJS.ProcessEnv;
      expect(detectCi(env, true, true)).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('CI=true wins first', () => {
    const env = { CI: 'true' } as unknown as NodeJS.ProcessEnv;
    expect(detectCi(env, true, true)).toBe(true);
  });

  it('a non-TTY stream implies CI', () => {
    const env = {} as unknown as NodeJS.ProcessEnv;
    expect(detectCi(env, false, true)).toBe(true);
    expect(detectCi(env, true, false)).toBe(true);
  });

  it('an interactive terminal off-CI is not CI', () => {
    const env = {} as unknown as NodeJS.ProcessEnv;
    expect(detectCi(env, true, true)).toBe(false);
  });
});

describe('detectReadOnly', () => {
  it('TSQA_READONLY overrides in both directions', () => {
    expect(detectReadOnly({ TSQA_READONLY: '1' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(detectReadOnly({ TSQA_READONLY: '0' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('GITHUB_ACTIONS implies read-only', () => {
    expect(detectReadOnly({ GITHUB_ACTIONS: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('defaults to writable', () => {
    expect(detectReadOnly({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
