import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { globIntersects } from "./glob.js";
import {
  buildNonAppSurfacesBlock,
  loadNonAppSurfaces,
} from "./nonAppSurfaces.js";
import { markResolvedEslintConfig } from "./resolvedConfigMarker.js";
import { loadSurfaces, surfaceIgnores, surfaceOffBlocks } from "./surfaces.js";
import { TIER_A_RULE_IDS } from "./tierARules.js";
export function loadExemptions(projectRoot) {
  const exemptionsPath = join(
    projectRoot,
    "tsQaConfig",
    "tier-a-exemptions.json",
  );
  if (!existsSync(exemptionsPath)) return [];
  const raw = JSON.parse(readFileSync(exemptionsPath, "utf-8"));
  for (const entry of raw) {
    if (!entry.ruleId || !entry.justification || !entry.files?.length) {
      throw new Error(
        `ts-qa: tsQaConfig/tier-a-exemptions.json has an entry missing ruleId, files, or justification: ${JSON.stringify(entry)}`,
      );
    }
  }
  return raw;
}
export function findTierARuleOverrides(configEntries) {
  const overrides = [];
  for (const entry of configEntries) {
    const files = entry.files ?? ["**/*"];
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
    const linterOptions = entry.linterOptions;
    if (
      linterOptions?.reportUnusedDisableDirectives !== undefined &&
      linterOptions.reportUnusedDisableDirectives !== "error" &&
      TIER_A_RULE_IDS.includes("reportUnusedDisableDirectives")
    ) {
      overrides.push({ ruleId: "reportUnusedDisableDirectives", files });
    }
  }
  return overrides;
}
async function importConfig(path) {
  const mod = await import(pathToFileURL(path).href);
  return mod.default;
}
/**
 * `quiet` (BUG A) suppresses the Tier A exemption diagnostics under `--json`,
 * so the machine-readable output on stdout is never prepended with human text.
 * It defaults to the env flag runPipeline sets, because this function is also
 * re-entered inside a spawned eslint subprocess that only inherits the env.
 */
export async function resolveEslintConfig(
  projectRoot,
  platform,
  packageRoot,
  quiet = process.env.TSQA_JSON === "1",
) {
  const platformBasePath = join(
    packageRoot,
    "configDefaults",
    platform,
    "eslint.config.js",
  );
  const genericBasePath = join(
    packageRoot,
    "configDefaults",
    "generic",
    "eslint.config.js",
  );
  const basePath = existsSync(platformBasePath)
    ? platformBasePath
    : genericBasePath;
  const base = await importConfig(basePath);
  // Non-app-surface carve-out (nonAppSurfaces.ts): appended LAST so its CDD
  // rule-offs win last-entry-wins over anything the base or project additions
  // declared for stories/tests/scripts. Read from tsQaConfig/ts-qa.json, so it
  // applies even to a base-only project (no tsQaConfig/eslint.config.js).
  const nonAppBlock = buildNonAppSurfacesBlock(loadNonAppSurfaces(projectRoot));
  const nonAppTail = nonAppBlock ? [nonAppBlock] : [];
  // Surface model (surfaces.ts): the named-surface taxonomy. `generated`/ignore
  // surfaces contribute a global-ignores block (prepended); non-app surfaces
  // (tests/stories/e2e/scripts) contribute off-blocks (appended after the guard,
  // like nonAppTail). A project opts in with `surfaces` in ts-qa.json.
  const surfaces = loadSurfaces(projectRoot);
  const ignoreGlobs = surfaceIgnores(surfaces);
  const ignoreHead = ignoreGlobs.length > 0 ? [{ ignores: ignoreGlobs }] : [];
  const surfaceTail = surfaceOffBlocks(surfaces);
  const projectConfigPath = join(projectRoot, "tsQaConfig", "eslint.config.js");
  if (!existsSync(projectConfigPath)) {
    return markResolvedEslintConfig([
      ...ignoreHead,
      ...base,
      ...nonAppTail,
      ...surfaceTail,
    ]);
  }
  const projectAdditions = await importConfig(projectConfigPath);
  const exemptions = loadExemptions(projectRoot);
  const touchedTierARules = findTierARuleOverrides(projectAdditions);
  const unsanctioned = touchedTierARules.filter(
    (touched) =>
      !exemptions.some(
        (exemption) =>
          exemption.ruleId === touched.ruleId &&
          globIntersects(exemption.files, touched.files),
      ),
  );
  if (unsanctioned.length > 0) {
    const ruleList = unsanctioned.map((t) => t.ruleId).join(", ");
    throw new Error(
      `ts-qa: tsQaConfig/eslint.config.js attempts to override Tier A rule(s) ${ruleList} ` +
        `with no matching tsQaConfig/tier-a-exemptions.json entry. Add a justified exemption or remove the override.`,
    );
  }
  if (exemptions.length > 0 && !quiet) {
    for (const exemption of exemptions) {
      console.log(
        `ts-qa: Tier A exemption active — ${exemption.ruleId} on ${exemption.files.join(",")} — "${exemption.justification}"`,
      );
    }
  }
  return markResolvedEslintConfig([
    ...ignoreHead,
    ...base,
    ...projectAdditions,
    ...nonAppTail,
    ...surfaceTail,
  ]);
}
//# sourceMappingURL=resolveEslintConfig.js.map
