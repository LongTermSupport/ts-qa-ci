import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RunContext, ToolModule, ToolResult } from './types.js';

/**
 * retryGate must never stack readline interfaces (GitHub issue #6, BUG E): the
 * previous recursive form opened a new interface before the old one's
 * finally{rl.close()} ran, so deep interactive retries piled up live stdin
 * listeners. We mock node:readline/promises to track concurrent interfaces and
 * assert at most one is ever open at a time.
 */
const h = vi.hoisted(() => ({
  answers: [] as string[],
  live: 0,
  maxLive: 0,
  createCount: 0,
  closeCount: 0,
}));

vi.mock('node:readline/promises', () => ({
  createInterface: () => {
    h.createCount++;
    h.live++;
    h.maxLive = Math.max(h.maxLive, h.live);
    return {
      question: async () => h.answers.shift() ?? 'n',
      close: () => {
        h.live--;
        h.closeCount++;
      },
    };
  },
}));

const { retryGate } = await import('./retryGate.js');

describe('retryGate', () => {
  beforeEach(() => {
    h.answers = [];
    h.live = 0;
    h.maxLive = 0;
    h.createCount = 0;
    h.closeCount = 0;
  });

  const baseCtx = (overrides: Partial<RunContext> = {}): RunContext => ({
    cwd: '/x',
    platform: 'generic',
    ci: false,
    readOnly: true,
    aggregate: false,
    hasBeenRestarted: false,
    json: true,
    packageRoot: '/x',
    ...overrides,
  });

  const makeTool = (results: ToolResult[]): ToolModule => {
    const queue = [...results];
    return {
      name: 'tsc',
      phase: 3,
      mutates: false,
      pathSupporting: false,
      run: async () => queue.shift() ?? { exitClass: 'clean', stdout: '', stderr: '' },
    };
  };

  it('opens at most one readline interface across interactive retries', async () => {
    // Fails twice, then the user declines ("n"): one prompt to retry, one to stop.
    h.answers = ['y', 'n'];
    const tool = makeTool([
      { exitClass: 'failure', stdout: '', stderr: '' },
      { exitClass: 'failure', stdout: '', stderr: '' },
    ]);

    const result = await retryGate(tool, baseCtx());

    expect(result.exitClass).toBe('failure');
    expect(h.maxLive).toBe(1); // never stacked — the BUG E regression guard
    expect(h.createCount).toBe(2);
    expect(h.closeCount).toBe(2);
  });

  it('retries until clean, closing each interface before reopening', async () => {
    h.answers = ['y'];
    const tool = makeTool([
      { exitClass: 'failure', stdout: '', stderr: '' },
      { exitClass: 'clean', stdout: '', stderr: '' },
    ]);
    const ctx = baseCtx();

    const result = await retryGate(tool, ctx);

    expect(result.exitClass).toBe('clean');
    expect(ctx.hasBeenRestarted).toBe(true);
    expect(h.maxLive).toBe(1);
    expect(h.closeCount).toBe(h.createCount);
  });

  it('never prompts on a crash (no readline interface created)', async () => {
    const tool = makeTool([{ exitClass: 'crash', stdout: '', stderr: '' }]);

    const result = await retryGate(tool, baseCtx());

    expect(result.exitClass).toBe('crash');
    expect(h.createCount).toBe(0);
  });

  it('never prompts in CI (fail-fast)', async () => {
    const tool = makeTool([{ exitClass: 'failure', stdout: '', stderr: '' }]);

    const result = await retryGate(tool, baseCtx({ ci: true }));

    expect(result.exitClass).toBe('failure');
    expect(h.createCount).toBe(0);
  });
});
