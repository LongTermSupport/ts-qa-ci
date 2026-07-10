import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runSingleTool } from './runSingleTool.js';
import { KNOWN_TOOLS } from './resolveDisabledTools.js';
import type { RunContext } from './types.js';

/**
 * `ts-qa -t <tool>` bypasses phase grouping entirely (docs/pipeline.md
 * "Running a single phase or tool") and must run EXACTLY the named tool -
 * this is the fix for GitHub issue #1, where `-t` was parsed but never
 * consulted by runPipeline, silently falling back to the full phase ladder.
 *
 * Each test drops a `tsQaConfig/tools/<name>.ts` project override
 * (resolveToolModule.ts's first cascade step) so the real oxlint/knip/etc.
 * binaries are never invoked - only this module's own dispatch logic is
 * under test.
 */
describe('runSingleTool', () => {
  const dirs: string[] = [];

  const proj = (toolName: string, toolSource: string): string => {
    const dir = mkdtempSync(join(tmpdir(), 'tsqa-single-tool-'));
    dirs.push(dir);
    mkdirSync(join(dir, 'tsQaConfig', 'tools'), { recursive: true });
    writeFileSync(join(dir, 'tsQaConfig', 'tools', `${toolName}.ts`), toolSource);
    return dir;
  };

  const baseCtx = (overrides: Partial<RunContext> = {}): RunContext => ({
    cwd: '/does-not-matter',
    platform: 'generic',
    ci: true,
    readOnly: false,
    aggregate: false,
    hasBeenRestarted: false,
    json: true,
    packageRoot: '/does-not-matter',
    ...overrides,
  });

  const cleanToolSource = (name: string, phase: number): string => `
    const tool = {
      name: ${JSON.stringify(name)},
      phase: ${phase},
      mutates: false,
      pathSupporting: false,
      async run() {
        return { exitClass: 'clean', stdout: '', stderr: '' };
      },
    };
    export default tool;
  `;

  afterEach(() => {
    while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('throws on an unknown tool name, listing the known tools', async () => {
    await expect(
      runSingleTool('not-a-real-tool', baseCtx(), '/does-not-matter', '/does-not-matter')
    ).rejects.toThrow(/unknown tool/i);
  });

  it('error message lists every known tool name', async () => {
    await expect(runSingleTool('bogus', baseCtx(), '/x', '/x')).rejects.toThrow(
      new RegExp(KNOWN_TOOLS.join('|'))
    );
  });

  it('resolves and runs exactly the named tool, returning it as the only result', async () => {
    const projectRoot = proj('knip', cleanToolSource('knip', 2));

    const result = await runSingleTool('knip', baseCtx(), '/package-root-unused', projectRoot);

    expect(Object.keys(result.toolResults)).toEqual(['knip']);
    expect(result.toolResults.knip?.exitClass).toBe('clean');
    expect(result.failed).toBe(false);
    // Single-tool runs report the tool module's own phase, not a phase from
    // the PHASES ladder (a bypassed/opt-in tool like stryker has no phase
    // slot at all).
    expect(result.phase).toBe(2);
  });

  it('marks the PhaseResult failed when the tool is not clean', async () => {
    const failingSource = `
      const tool = {
        name: 'tsc',
        phase: 3,
        mutates: false,
        pathSupporting: false,
        async run() {
          return { exitClass: 'failure', stdout: 'boom', stderr: '' };
        },
      };
      export default tool;
    `;
    const projectRoot = proj('tsc', failingSource);

    const result = await runSingleTool('tsc', baseCtx(), '/package-root-unused', projectRoot);

    expect(result.failed).toBe(true);
    expect(result.toolResults.tsc?.exitClass).toBe('failure');
  });
});
