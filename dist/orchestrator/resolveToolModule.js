import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
/**
 * Tool-resolution cascade (phase2-design.md §2.4): project override (full
 * replacement) -> platform-specific implementation -> generic implementation.
 * Unlike resolveEslintConfig.ts, this IS a plain first-match-wins cascade -
 * a consumer replacing an entire tool module is a legitimate, no-guarantee-
 * bypassing choice (they own the consequences of a bad replacement).
 */
export async function resolveToolModule(
  projectRoot,
  platform,
  packageRoot,
  toolName,
) {
  const projectOverride = join(
    projectRoot,
    "tsQaConfig",
    "tools",
    `${toolName}.ts`,
  );
  if (existsSync(projectOverride)) {
    const mod = await import(pathToFileURL(projectOverride).href);
    return mod.default;
  }
  const platformImpl = join(
    packageRoot,
    "dist",
    "tools",
    platform,
    `${toolName}.js`,
  );
  if (existsSync(platformImpl)) {
    const mod = await import(pathToFileURL(platformImpl).href);
    return mod.default;
  }
  const genericImplPath = join(packageRoot, "dist", "tools", `${toolName}.js`);
  const mod = await import(pathToFileURL(genericImplPath).href);
  return mod.default;
}
//# sourceMappingURL=resolveToolModule.js.map
