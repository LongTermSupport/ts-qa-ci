import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const DEFAULT_ROOTS = ["src"];
/**
 * Resolves the positional scan targets handed to dependency-cruiser, from
 * `tsQaConfig/ts-qa.json` (`"dependencyCruiserScanRoots": [...]`).
 *
 * depcruise requires at least one positional path. ts-qa historically
 * hardcoded `src`, which fails `Can't open 'src'` on any repo that does not
 * keep all sources under a single top-level ./src — notably a pnpm monorepo
 * whose packages live under `apps/<pkg>/src`, `packages/<pkg>/src`. Making the
 * targets configurable lets such a layout cruise its real source dirs while
 * single-package repos keep the historical default with no config at all.
 *
 * A missing config file (or a config without the key) yields the default
 * `["src"]`. A present-but-malformed value throws rather than being silently
 * ignored (mirrors resolveDisabledTools): a typo must fail loudly, never
 * quietly cruise the wrong tree or nothing.
 */
export function resolveDependencyCruiserRoots(projectRoot) {
  const configPath = join(projectRoot, "tsQaConfig", "ts-qa.json");
  if (!existsSync(configPath)) return [...DEFAULT_ROOTS];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (cause) {
    throw new Error(`ts-qa: could not parse ${configPath} as JSON`, { cause });
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("dependencyCruiserScanRoots" in parsed)
  ) {
    return [...DEFAULT_ROOTS];
  }
  const roots = parsed.dependencyCruiserScanRoots;
  if (!Array.isArray(roots)) {
    throw new Error(
      `ts-qa: "dependencyCruiserScanRoots" in ${configPath} must be an array of path strings`,
    );
  }
  if (roots.length === 0) {
    throw new Error(
      `ts-qa: "dependencyCruiserScanRoots" in ${configPath} must not be empty (depcruise needs at least one scan target)`,
    );
  }
  for (const root of roots) {
    if (typeof root !== "string") {
      throw new Error(
        `ts-qa: "dependencyCruiserScanRoots" entries must be strings (got ${JSON.stringify(root)} in ${configPath})`,
      );
    }
  }
  return roots;
}
//# sourceMappingURL=resolveDependencyCruiserRoots.js.map
