import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TIER_A_RULE_IDS } from './tierARules.js';
import { globIntersects } from './glob.js';
import type { Platform } from './types.js';

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

interface FlatConfigEntry {
  files?: string[];
  rules?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TierAExemption {
  ruleId: string;
  files: string[];
  justification: string;
}

function loadExemptions(projectRoot: string): TierAExemption[] {
  const exemptionsPath = join(projectRoot, 'tsQaConfig', 'tier-a-exemptions.json');
  if (!existsSync(exemptionsPath)) return [];
  const raw = JSON.parse(readFileSync(exemptionsPath, 'utf-8')) as TierAExemption[];
  for (const entry of raw) {
    if (!entry.ruleId || !entry.justification || !entry.files?.length) {
      throw new Error(
        `ts-qa: tsQaConfig/tier-a-exemptions.json has an entry missing ruleId, files, or justification: ${JSON.stringify(entry)}`,
      );
    }
  }
  return raw;
}

interface TierAOverride {
  ruleId: string;
  files: string[];
}

interface LinterOptions {
  reportUnusedDisableDirectives?: unknown;
}

export function findTierARuleOverrides(configEntries: FlatConfigEntry[]): TierAOverride[] {
  const overrides: TierAOverride[] = [];
  for (const entry of configEntries) {
    const files = entry.files ?? ['**/*'];
    if (entry.rules) {
      for (const ruleId of Object.keys(entry.rules)) {
        if (TIER_A_RULE_IDS.includes(ruleId)) {
          overrides.push({ ruleId, files });
        }
      }
    }
    // reportUnusedDisableDirectives is a linterOption (not a rule) that the base
    // config ships always-on as Tier A. It is last-entry-wins like everything in
    // flat config, so a project appending it would silently downgrade the always-on
    // protection unless the same override gate applies. Treat any value other than
    // 'error' as a Tier A override of the pseudo-rule 'reportUnusedDisableDirectives'.
    const linterOptions = entry.linterOptions as LinterOptions | undefined;
    if (
      linterOptions?.reportUnusedDisableDirectives !== undefined &&
      linterOptions.reportUnusedDisableDirectives !== 'error' &&
      TIER_A_RULE_IDS.includes('reportUnusedDisableDirectives')
    ) {
      overrides.push({ ruleId: 'reportUnusedDisableDirectives', files });
    }
  }
  return overrides;
}

async function importConfig(path: string): Promise<FlatConfigEntry[]> {
  const mod = (await import(pathToFileURL(path).href)) as { default: FlatConfigEntry[] };
  return mod.default;
}

/**
 * `quiet` (BUG A) suppresses the Tier A exemption diagnostics under `--json`,
 * so the machine-readable output on stdout is never prepended with human text.
 * It defaults to the env flag runPipeline sets, because this function is also
 * re-entered inside a spawned eslint subprocess that only inherits the env.
 */
export async function resolveEslintConfig(
  projectRoot: string,
  platform: Platform,
  packageRoot: string,
  quiet: boolean = process.env.TSQA_JSON === '1',
): Promise<FlatConfigEntry[]> {
  const platformBasePath = join(packageRoot, 'configDefaults', platform, 'eslint.config.js');
  const genericBasePath = join(packageRoot, 'configDefaults', 'generic', 'eslint.config.js');
  const basePath = existsSync(platformBasePath) ? platformBasePath : genericBasePath;
  const base = await importConfig(basePath);

  const projectConfigPath = join(projectRoot, 'tsQaConfig', 'eslint.config.js');
  if (!existsSync(projectConfigPath)) return base;

  const projectAdditions = await importConfig(projectConfigPath);
  const exemptions = loadExemptions(projectRoot);
  const touchedTierARules = findTierARuleOverrides(projectAdditions);

  const unsanctioned = touchedTierARules.filter(
    (touched) => !exemptions.some((exemption) => exemption.ruleId === touched.ruleId && globIntersects(exemption.files, touched.files)),
  );

  if (unsanctioned.length > 0) {
    const ruleList = unsanctioned.map((t) => t.ruleId).join(', ');
    throw new Error(
      `ts-qa: tsQaConfig/eslint.config.js attempts to override Tier A rule(s) ${ruleList} ` +
        `with no matching tsQaConfig/tier-a-exemptions.json entry. Add a justified exemption or remove the override.`,
    );
  }

  if (exemptions.length > 0 && !quiet) {
    for (const exemption of exemptions) {
      console.log(`ts-qa: Tier A exemption active — ${exemption.ruleId} on ${exemption.files.join(',')} — "${exemption.justification}"`);
    }
  }

  return [...base, ...projectAdditions];
}
