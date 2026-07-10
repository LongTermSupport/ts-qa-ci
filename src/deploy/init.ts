import { join } from 'node:path';
import { writeIfChanged } from './fsUtils.js';

export interface InitOptions {
  cwd: string;
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

/** ts-qa init (phase2-design.md §2.1): scaffold tsQaConfig/ in the consumer project. */
export async function init(options: InitOptions): Promise<void> {
  const configDir = join(options.cwd, 'tsQaConfig');

  const files: Array<[string, string]> = [
    [join(configDir, 'hookPre.ts'), HOOK_PRE_STUB],
    [join(configDir, 'hookPost.ts'), HOOK_POST_STUB],
    [join(configDir, 'tier-a-exemptions.json'), EXEMPTIONS_STUB],
    [join(configDir, 'eslint.config.js'), ESLINT_CONFIG_STUB],
  ];

  for (const [path, content] of files) {
    const { written } = writeIfChanged(path, content);
    console.log(`ts-qa init: ${path} ${written ? 'written' : 'already present, unchanged'}.`);
  }

  console.log('ts-qa init: complete. Edit tsQaConfig/ to customize — see docs/configuration.md.');
}
