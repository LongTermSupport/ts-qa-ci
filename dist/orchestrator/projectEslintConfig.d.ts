import { type FlatConfigEntry } from "./resolveEslintConfig.js";
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
export declare function projectEslintConfig(
  metaUrl: string,
): Promise<FlatConfigEntry[]>;
//# sourceMappingURL=projectEslintConfig.d.ts.map
