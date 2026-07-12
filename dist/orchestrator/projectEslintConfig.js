import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectPlatform } from "./detectPlatform.js";
import { resolveEslintConfig, } from "./resolveEslintConfig.js";
/**
 * The ONE thing a consumer's (optional) project-root `eslint.config.js` needs.
 *
 * A root config is not required — a project may run lint solely through
 * `npx ts-qa` (which uses its own generated `--config`). But if a project DOES
 * keep a root `eslint.config.js` (for `npx eslint`, editors, IDE inline lint),
 * it MUST resolve to the exact same rule set ts-qa runs, or the two entrypoints
 * silently diverge (Fable audit 3). This wrapper makes that a two-line file:
 *
 * ```js
 * // eslint.config.js
 * import { projectEslintConfig } from "@longtermsupport/ts-qa-ci";
 * export default await projectEslintConfig(import.meta.url);
 * ```
 *
 * The returned array carries the resolved-config marker
 * (resolvedConfigMarker.ts), which the `eslintConfigParity` phase-0 check asserts
 * — so a root config that stops delegating (hand-rolls its own rules) fails the
 * pipeline instead of drifting.
 *
 * @param metaUrl the delegator's own `import.meta.url`. Its directory is the
 *   project root (where `tsQaConfig/` and the target source live).
 */
export async function projectEslintConfig(metaUrl) {
    const projectRoot = dirname(fileURLToPath(metaUrl));
    // packageRoot is derived from THIS compiled module's own location, not from the
    // consumer's tree: dist/orchestrator/projectEslintConfig.js → dist → packageRoot.
    // That is exactly the install ts-qa itself resolves configDefaults/ from, so the
    // root delegator and ts-qa's generated config compose the identical base.
    const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const platform = detectPlatform(projectRoot);
    return resolveEslintConfig(projectRoot, platform, packageRoot);
}
//# sourceMappingURL=projectEslintConfig.js.map