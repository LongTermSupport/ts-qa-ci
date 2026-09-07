import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_ROOTS = ["."] as const;

/**
 * Resolves the positional scan targets handed to dependency-cruiser, from
 * `tsQaConfig/ts-qa.json` (`"dependencyCruiserScanRoots": [...]`).
 *
 * depcruise requires at least one positional path. With no configuration the
 * target is `.`, the project root the tool already runs in, so scope is
 * derived from where the run happens rather than from a guessed directory
 * name; depcruise's own config bounds the graph (node_modules excluded). A
 * project that wants narrower roots (a pnpm monorepo cruising only
 * `apps/<pkg>/src`) configures them.
 *
 * A missing config file (or a config without the key) yields `["."]`. A
 * present-but-malformed value throws rather than being silently ignored
 * (mirrors resolveDisabledTools): a typo must fail loudly, never quietly
 * cruise the wrong tree or nothing.
 */
export function resolveDependencyCruiserRoots(projectRoot: string): string[] {
  const configPath = join(projectRoot, "tsQaConfig", "ts-qa.json");
  if (!existsSync(configPath)) return [...DEFAULT_ROOTS];

  let parsed: unknown;
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

  const roots = (parsed as { dependencyCruiserScanRoots: unknown })
    .dependencyCruiserScanRoots;
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
  return roots as string[];
}
