import { existsSync } from "node:fs";
import { join } from "node:path";

import type { Platform } from "./types.js";

/**
 * Ordinary config-file cascade (phase2-design.md §2.4): first-match-wins,
 * wholesale replace. Every config file EXCEPT eslint.config.js goes through
 * this - see resolveEslintConfig.ts for why that one is a deliberate
 * exception with different (merge + rule-level guard) semantics.
 */
export function resolveConfigPath(
  projectRoot: string,
  platform: Platform,
  fileName: string,
  packageRoot: string,
): string {
  const projectOverride = join(projectRoot, "tsQaConfig", fileName);
  if (existsSync(projectOverride)) return projectOverride;

  const platformDefault = join(
    packageRoot,
    "configDefaults",
    platform,
    fileName,
  );
  if (existsSync(platformDefault)) return platformDefault;

  const genericDefault = join(
    packageRoot,
    "configDefaults",
    "generic",
    fileName,
  );
  return genericDefault;
}
