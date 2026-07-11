import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
async function loadHook(projectRoot, fileName) {
  const hookPath = join(projectRoot, "tsQaConfig", fileName);
  if (!existsSync(hookPath)) return undefined;
  const mod = await import(pathToFileURL(hookPath).href);
  return mod.default;
}
export async function runPreHook(projectRoot, ctx) {
  const hook = await loadHook(projectRoot, "hookPre.ts");
  if (hook) await hook(ctx);
}
export async function runPostHook(projectRoot, ctx) {
  const hook = await loadHook(projectRoot, "hookPost.ts");
  if (hook) await hook(ctx);
}
//# sourceMappingURL=hooks.js.map
