import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { deploySkills } from './deploySkills.js';

/**
 * deploy-skills reads settings.local.json only for an advisory "hooks key
 * present" warning. A malformed or empty settings.local.json must never abort
 * the whole deploy - the read+parse is guarded and downgraded to a warning.
 */
describe('deploySkills', () => {
  const dirs: string[] = [];
  const project = (): { cwd: string; packageRoot: string } => {
    const cwd = mkdtempSync(join(tmpdir(), 'tsqa-deploy-cwd-'));
    const packageRoot = mkdtempSync(join(tmpdir(), 'tsqa-deploy-pkg-'));
    dirs.push(cwd, packageRoot);
    return { cwd, packageRoot };
  };
  afterEach(() => {
    while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('does not throw when settings.local.json contains invalid JSON', async () => {
    const { cwd, packageRoot } = project();
    const claudeDir = join(cwd, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.local.json'), '{ not valid json');

    await expect(deploySkills({ cwd, packageRoot })).resolves.toBeUndefined();
  });

  it('does not throw when settings.local.json is empty', async () => {
    const { cwd, packageRoot } = project();
    const claudeDir = join(cwd, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.local.json'), '');

    await expect(deploySkills({ cwd, packageRoot })).resolves.toBeUndefined();
  });
});
