import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
// tier-a-exemptions.json (see resolveEslintConfig.ts). This is the SINGLE home
// for ALL project lint opinion (local plugins, strict-TS preset, per-dir
// overrides) - it is composed for BOTH \`npx eslint\` and \`npx ts-qa\`.
export default [];
`;
const ROOT_ESLINT_DELEGATOR_STUB = `// Project-root ESLint config — the SSoT delegator.
//
// It exists ONLY so \`npx eslint\` and your editor run the EXACT same rule set as
// \`npx ts-qa\`. Keep it a thin delegator: ALL project-specific lint opinion (local
// plugins, strict-TS, per-dir overrides) belongs in tsQaConfig/eslint.config.js,
// which ts-qa composes for BOTH entrypoints. The eslintConfigParity phase-0 check
// fails the pipeline if this file ever stops delegating.
//
// A root config is optional — delete this file to lint solely through ts-qa — but
// if it exists it MUST delegate.
import { projectEslintConfig } from "@longtermsupport/ts-qa-ci";

export default await projectEslintConfig(import.meta.url);
`;
/** Relative location of the shipped consumer CI archetype within the package. */
const CI_ARCHETYPE_REL = join("configDefaults", "github-workflows", "ci.yml");
/** Where the archetype is scaffolded in the consumer project. */
const CI_DEST_REL = join(".github", "workflows", "ts-qa.yml");
/**
 * Supply-chain hardening archetypes scaffolded into the consumer root and
 * enforced by the `supplyChain` Phase 0 check. The .npmrc archetype ships as
 * `npmrc` (no leading dot) because npm strips a literal `.npmrc` from published
 * packages; it is written to the consumer as `.npmrc`.
 */
const SUPPLY_CHAIN_ARCHETYPES = [
  [
    join("configDefaults", "generic", "pnpm-workspace.yaml"),
    "pnpm-workspace.yaml",
  ],
  [join("configDefaults", "generic", "npmrc"), ".npmrc"],
];
/**
 * Scaffold a single file if it is missing; never overwrite. init is a scaffold
 * command, so re-running it after an upgrade must not clobber a file the user
 * has already customised.
 */
function scaffoldFile(path, content) {
  if (existsSync(path)) {
    console.log(`ts-qa init: ${path} already present, left untouched.`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`ts-qa init: ${path} written.`);
}
/** ts-qa init (phase2-design.md §2.1): scaffold tsQaConfig/ + the CI archetype in the consumer project. */
export async function init(options) {
  const configDir = join(options.cwd, "tsQaConfig");
  const files = [
    [join(configDir, "hookPre.ts"), HOOK_PRE_STUB],
    [join(configDir, "hookPost.ts"), HOOK_POST_STUB],
    [join(configDir, "tier-a-exemptions.json"), EXEMPTIONS_STUB],
    [join(configDir, "eslint.config.js"), ESLINT_CONFIG_STUB],
    // The optional root-level SSoT delegator. scaffoldFile never overwrites, so an
    // existing hand-rolled root config is left in place for the eslintConfigParity
    // check to flag with migration guidance rather than being clobbered here.
    [join(options.cwd, "eslint.config.js"), ROOT_ESLINT_DELEGATOR_STUB],
  ];
  for (const [path, content] of files) {
    scaffoldFile(path, content);
  }
  // Scaffold the shipped GitHub Actions archetype (the auto-fix-and-commit
  // workflow). Needs packageRoot to locate the shipped file; skipped when it is
  // absent or the archetype file is missing - never silently, always logged.
  if (options.packageRoot === undefined) {
    console.log(
      "ts-qa init: no packageRoot given — skipping CI + supply-chain scaffold.",
    );
  } else {
    const archetype = join(options.packageRoot, CI_ARCHETYPE_REL);
    if (existsSync(archetype)) {
      scaffoldFile(
        join(options.cwd, CI_DEST_REL),
        readFileSync(archetype, "utf-8"),
      );
    } else {
      console.log(
        `ts-qa init: CI archetype not found at ${archetype} — skipping CI workflow scaffold.`,
      );
    }
    // Supply-chain hardening files (pnpm-workspace.yaml + .npmrc) — enforced by
    // the supplyChain Phase 0 check, so scaffold compliant starters here.
    for (const [archetypeRel, destRel] of SUPPLY_CHAIN_ARCHETYPES) {
      const src = join(options.packageRoot, archetypeRel);
      if (existsSync(src)) {
        scaffoldFile(join(options.cwd, destRel), readFileSync(src, "utf-8"));
      } else {
        console.log(
          `ts-qa init: supply-chain archetype not found at ${src} — skipping.`,
        );
      }
    }
  }
  console.log(
    "ts-qa init: complete. See docs/configuration.md and docs/github-actions.md.",
  );
}
//# sourceMappingURL=init.js.map
