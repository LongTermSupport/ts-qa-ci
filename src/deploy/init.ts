import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface InitOptions {
  cwd: string;
  /**
   * ts-qa-ci's own package root. When provided, init also scaffolds the shipped
   * GitHub Actions archetype (configDefaults/github-workflows/ci.yml) into the
   * consumer's .github/workflows/ts-qa.yml. bin/ts-qa.js always passes it; a bare
   * programmatic call may omit it, in which case only tsQaConfig/ is scaffolded.
   */
  packageRoot?: string;
}

const HOOK_PRE_STUB = `import type { HookContext } from '@longtermsupport/ts-qa-ci';

export default async function hookPre(_ctx: HookContext): Promise<void> {
  // Runs after config resolution, before any tool executes.
}
`;

const HOOK_POST_STUB = `import type { HookContext } from '@longtermsupport/ts-qa-ci';

export default async function hookPost(_ctx: HookContext): Promise<void> {
  // Runs only after every phase succeeds - unreached on any upstream failure.
}
`;

const EXEMPTIONS_STUB = `[]
`;

const ESLINT_CONFIG_STUB = `// Project-specific ESLint additions. This file is merged AFTER ts-qa-ci's
// Tier A core config, never replaces it - any attempt to override a Tier A
// rule's severity here is rejected unless a matching entry exists in
// tier-a-exemptions.json (see resolveEslintConfig.ts).
export default [];
`;

/** Relative location of the shipped consumer CI archetype within the package. */
const CI_ARCHETYPE_REL = join('configDefaults', 'github-workflows', 'ci.yml');
/** Where the archetype is scaffolded in the consumer project. */
const CI_DEST_REL = join('.github', 'workflows', 'ts-qa.yml');

/**
 * Scaffold a single file if it is missing; never overwrite. init is a scaffold
 * command, so re-running it after an upgrade must not clobber a file the user
 * has already customised.
 */
function scaffoldFile(path: string, content: string): void {
  if (existsSync(path)) {
    console.log(`ts-qa init: ${path} already present, left untouched.`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`ts-qa init: ${path} written.`);
}

/** ts-qa init (phase2-design.md §2.1): scaffold tsQaConfig/ + the CI archetype in the consumer project. */
export async function init(options: InitOptions): Promise<void> {
  const configDir = join(options.cwd, 'tsQaConfig');

  const files: Array<[string, string]> = [
    [join(configDir, 'hookPre.ts'), HOOK_PRE_STUB],
    [join(configDir, 'hookPost.ts'), HOOK_POST_STUB],
    [join(configDir, 'tier-a-exemptions.json'), EXEMPTIONS_STUB],
    [join(configDir, 'eslint.config.js'), ESLINT_CONFIG_STUB],
  ];

  for (const [path, content] of files) {
    scaffoldFile(path, content);
  }

  // Scaffold the shipped GitHub Actions archetype (the auto-fix-and-commit
  // workflow). Needs packageRoot to locate the shipped file; skipped when it is
  // absent or the archetype file is missing - never silently, always logged.
  if (options.packageRoot === undefined) {
    console.log('ts-qa init: no packageRoot given — skipping CI workflow scaffold.');
  } else {
    const archetype = join(options.packageRoot, CI_ARCHETYPE_REL);
    if (existsSync(archetype)) {
      scaffoldFile(join(options.cwd, CI_DEST_REL), readFileSync(archetype, 'utf-8'));
    } else {
      console.log(
        `ts-qa init: CI archetype not found at ${archetype} — skipping CI workflow scaffold.`
      );
    }
  }

  console.log('ts-qa init: complete. See docs/configuration.md and docs/github-actions.md.');
}
