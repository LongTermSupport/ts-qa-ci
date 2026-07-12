import type { Platform } from "./types.js";
/**
 * ESLint config resolution (phase2-design.md §2.4/§4). This is the ONE
 * deliberate exception to resolveConfigPath.ts's wholesale first-match-wins
 * cascade: eslint.config.js is the delivery mechanism for Tier A's
 * always-on guarantee, so a project override may only ADD to the base
 * config, and any attempt to override a Tier A rule's severity is rejected
 * unless a matching, justified entry exists in tsQaConfig/tier-a-exemptions.json.
 *
 * IMPORTANT (pass-2 Fable audit finding B1): array-level append alone does
 * NOT stop per-rule overrides - ESLint flat config resolves rule severity
 * last-entry-wins, per rule, across every config object whose `files` glob
 * matches. This function explicitly scans for and gates that case; do not
 * "simplify" this back down to a plain array spread.
 */
export interface FlatConfigEntry {
  files?: string[];
  rules?: Record<string, unknown>;
  [key: string]: unknown;
}
interface TierAOverride {
  ruleId: string;
  files: string[];
}
export declare function findTierARuleOverrides(
  configEntries: FlatConfigEntry[],
): TierAOverride[];
/**
 * `quiet` (BUG A) suppresses the Tier A exemption diagnostics under `--json`,
 * so the machine-readable output on stdout is never prepended with human text.
 * It defaults to the env flag runPipeline sets, because this function is also
 * re-entered inside a spawned eslint subprocess that only inherits the env.
 */
export declare function resolveEslintConfig(
  projectRoot: string,
  platform: Platform,
  packageRoot: string,
  quiet?: boolean,
): Promise<FlatConfigEntry[]>;
export {};
//# sourceMappingURL=resolveEslintConfig.d.ts.map
