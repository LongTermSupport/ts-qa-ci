import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

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
    const custom =
      '// my carefully hand-crafted config\nexport default [{ rules: { foo: "error" } }];\n';
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

  // packageRoot points at ts-qa-ci itself, where the shipped archetype lives.
  const packageRoot = process.cwd();
  const archetypeSource = readFileSync(
    join(packageRoot, 'configDefaults', 'github-workflows', 'ci.yml'),
    'utf-8'
  );

  it('scaffolds the CI archetype into .github/workflows/ts-qa.yml when packageRoot is given', async () => {
    const cwd = freshProject();
    await init({ cwd, packageRoot });

    const workflow = join(cwd, '.github', 'workflows', 'ts-qa.yml');
    expect(existsSync(workflow)).toBe(true);
    expect(readFileSync(workflow, 'utf-8')).toBe(archetypeSource);
  });

  it('leaves a pre-existing .github/workflows/ts-qa.yml untouched', async () => {
    const cwd = freshProject();
    const workflow = join(cwd, '.github', 'workflows', 'ts-qa.yml');
    mkdirSync(join(cwd, '.github', 'workflows'), { recursive: true });
    const custom = 'name: my custom pipeline\n';
    writeFileSync(workflow, custom);

    await init({ cwd, packageRoot });

    expect(readFileSync(workflow, 'utf-8')).toBe(custom);
  });

  it('does not scaffold the CI workflow when packageRoot is omitted', async () => {
    const cwd = freshProject();
    await init({ cwd });

    expect(existsSync(join(cwd, '.github', 'workflows', 'ts-qa.yml'))).toBe(false);
  });
});
