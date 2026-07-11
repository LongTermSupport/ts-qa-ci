import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { init } from './init.js';

/**
 * `ts-qa init` is a scaffold command: it must create the four tsQaConfig/ stubs
 * when they are missing, but it must NEVER clobber a file the user has already
 * customised. Re-running init after an upgrade is expected, so overwriting an
 * existing file with the empty stub would silently destroy the user's config.
 */
describe('init', () => {
  const dirs: string[] = [];
  const freshProject = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'tsqa-init-'));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    while (dirs.length > 0) rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('writes all four stubs into a fresh directory', async () => {
    const cwd = freshProject();
    await init({ cwd });

    const configDir = join(cwd, 'tsQaConfig');
    expect(existsSync(join(configDir, 'hookPre.ts'))).toBe(true);
    expect(existsSync(join(configDir, 'hookPost.ts'))).toBe(true);
    expect(existsSync(join(configDir, 'tier-a-exemptions.json'))).toBe(true);
    expect(existsSync(join(configDir, 'eslint.config.js'))).toBe(true);
  });

  it('leaves a pre-existing customised file byte-for-byte untouched', async () => {
    const cwd = freshProject();
    const configDir = join(cwd, 'tsQaConfig');
    mkdirSync(configDir, { recursive: true });
    const eslintPath = join(configDir, 'eslint.config.js');
    const custom = '// my carefully hand-crafted config\nexport default [{ rules: { foo: "error" } }];\n';
    writeFileSync(eslintPath, custom);

    await init({ cwd });

    expect(readFileSync(eslintPath, 'utf-8')).toBe(custom);
  });

  it('still creates the missing stubs alongside a customised file', async () => {
    const cwd = freshProject();
    const configDir = join(cwd, 'tsQaConfig');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'eslint.config.js'), '// custom\n');

    await init({ cwd });

    expect(existsSync(join(configDir, 'hookPre.ts'))).toBe(true);
    expect(existsSync(join(configDir, 'hookPost.ts'))).toBe(true);
    expect(existsSync(join(configDir, 'tier-a-exemptions.json'))).toBe(true);
  });
});
