import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TIER_A_RULE_IDS } from './tierARules.js';
import { globIntersects } from './glob.js';
function loadExemptions(projectRoot) {
    const exemptionsPath = join(projectRoot, 'tsQaConfig', 'tier-a-exemptions.json');
    if (!existsSync(exemptionsPath))
        return [];
    const raw = JSON.parse(readFileSync(exemptionsPath, 'utf-8'));
    for (const entry of raw) {
        if (!entry.ruleId || !entry.justification || !entry.files?.length) {
            throw new Error(`ts-qa: tsQaConfig/tier-a-exemptions.json has an entry missing ruleId, files, or justification: ${JSON.stringify(entry)}`);
        }
    }
    return raw;
}
function findTierARuleOverrides(configEntries) {
    const overrides = [];
    for (const entry of configEntries) {
        if (!entry.rules)
            continue;
        const files = entry.files ?? ['**/*'];
        for (const ruleId of Object.keys(entry.rules)) {
            if (TIER_A_RULE_IDS.includes(ruleId)) {
                overrides.push({ ruleId, files });
            }
        }
    }
    return overrides;
}
async function importConfig(path) {
    const mod = (await import(pathToFileURL(path).href));
    return mod.default;
}
export async function resolveEslintConfig(projectRoot, platform, packageRoot) {
    const platformBasePath = join(packageRoot, 'configDefaults', platform, 'eslint.config.js');
    const genericBasePath = join(packageRoot, 'configDefaults', 'generic', 'eslint.config.js');
    const basePath = existsSync(platformBasePath) ? platformBasePath : genericBasePath;
    const base = await importConfig(basePath);
    const projectConfigPath = join(projectRoot, 'tsQaConfig', 'eslint.config.js');
    if (!existsSync(projectConfigPath))
        return base;
    const projectAdditions = await importConfig(projectConfigPath);
    const exemptions = loadExemptions(projectRoot);
    const touchedTierARules = findTierARuleOverrides(projectAdditions);
    const unsanctioned = touchedTierARules.filter((touched) => !exemptions.some((exemption) => exemption.ruleId === touched.ruleId && globIntersects(exemption.files, touched.files)));
    if (unsanctioned.length > 0) {
        const ruleList = unsanctioned.map((t) => t.ruleId).join(', ');
        throw new Error(`ts-qa: tsQaConfig/eslint.config.js attempts to override Tier A rule(s) ${ruleList} ` +
            `with no matching tsQaConfig/tier-a-exemptions.json entry. Add a justified exemption or remove the override.`);
    }
    if (exemptions.length > 0) {
        for (const exemption of exemptions) {
            console.log(`ts-qa: Tier A exemption active — ${exemption.ruleId} on ${exemption.files.join(',')} — "${exemption.justification}"`);
        }
    }
    return [...base, ...projectAdditions];
}
//# sourceMappingURL=resolveEslintConfig.js.map