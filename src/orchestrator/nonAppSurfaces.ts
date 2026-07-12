import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * "Non-app surfaces" — files that are NOT the shipped application UI (Storybook
 * stories, unit/e2e tests, dev scripts). They legitimately break the component-
 * authoring CDD doctrine: a story renders raw HTML on purpose, a test passes a
 * `className` to probe a primitive, a script has no exported component types.
 *
 * BEFORE this mechanism the only lever was ESLint `ignores`, which drops the
 * files from linting ENTIRELY — so every OTHER rule (safety, correctness,
 * type-annotation) stopped covering them too. That blunt ignore is the exact
 * blind-spot generator Fable audit 3 identified when a project collapses onto a
 * single SSoT config. `nonAppSurfaces` instead turns off ONLY the component-
 * authoring CDD rules on those globs, keeping every safety/correctness rule live.
 *
 * The off-block is appended by resolveEslintConfig AFTER the Tier A override
 * guard runs, so it needs no tier-a-exemptions.json entry — it is ts-qa's own
 * sanctioned carve-out, not a consumer override of Tier A.
 */

/**
 * The component-authoring CDD rules switched off on non-app surfaces. These are
 * the closed-styling doctrine + component-structure rules — the ones whose whole
 * premise ("this is a shipped app component") does not hold for a story/test/script.
 * Safety/correctness Tier A rules (no-eslint-disable, no-placeholder, the as/enum
 * ban, require-error-cause, ssr-safe-hooks, …) are deliberately NOT listed: they
 * still apply to non-app surfaces.
 */
export const DEFAULT_NON_APP_SURFACE_DISABLED_RULES: readonly string[] = [
  "ts-qa/no-ad-hoc-html",
  "ts-qa/no-html-in-front-controllers",
  "ts-qa/no-classname-prop",
  "ts-qa/no-classname-public-prop",
  "ts-qa/require-exported-component-types",
  "ts-qa/no-inline-component-decl-in-render",
  "ts-qa/no-duplicate-section-ids",
  "ts-qa/jsx-truthy-narrow",
];

interface NonAppSurfacesConfig {
  nonAppSurfaces?: unknown;
  nonAppSurfaceRules?: unknown;
}

export interface NonAppSurfacesSettings {
  globs: string[];
  disabledRules: string[];
}

function asStringArray(
  value: unknown,
  key: string,
  configPath: string,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `ts-qa: "${key}" in ${configPath} must be an array of strings`,
    );
  }
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error(
        `ts-qa: "${key}" entries must be strings (got ${JSON.stringify(entry)} in ${configPath})`,
      );
    }
  }
  return value as string[];
}

/**
 * Reads `nonAppSurfaces` (required globs) and optional `nonAppSurfaceRules`
 * (override the disabled-rule list) from tsQaConfig/ts-qa.json. Returns undefined
 * when the key is absent — the common case for a project with no non-app surfaces
 * to carve out. A present-but-malformed value throws rather than being ignored.
 */
export function loadNonAppSurfaces(
  projectRoot: string,
): NonAppSurfacesSettings | undefined {
  const configPath = join(projectRoot, "tsQaConfig", "ts-qa.json");
  if (!existsSync(configPath)) return undefined;

  let parsed: NonAppSurfacesConfig;
  try {
    parsed = JSON.parse(
      readFileSync(configPath, "utf-8"),
    ) as NonAppSurfacesConfig;
  } catch (cause) {
    throw new Error(`ts-qa: could not parse ${configPath} as JSON`, { cause });
  }

  if (parsed.nonAppSurfaces === undefined) return undefined;
  const globs = asStringArray(
    parsed.nonAppSurfaces,
    "nonAppSurfaces",
    configPath,
  );
  if (globs.length === 0) return undefined;

  const disabledRules =
    parsed.nonAppSurfaceRules === undefined
      ? [...DEFAULT_NON_APP_SURFACE_DISABLED_RULES]
      : asStringArray(
          parsed.nonAppSurfaceRules,
          "nonAppSurfaceRules",
          configPath,
        );

  return { globs, disabledRules };
}

/**
 * Builds the single flat-config off-block that turns the component-authoring CDD
 * rules off on the non-app-surface globs. Returns undefined when nothing is
 * configured, so callers can spread `...(block ? [block] : [])`.
 */
export function buildNonAppSurfacesBlock(
  settings: NonAppSurfacesSettings | undefined,
): { files: string[]; rules: Record<string, "off"> } | undefined {
  if (!settings) return undefined;
  const rules: Record<string, "off"> = {};
  for (const ruleId of settings.disabledRules) rules[ruleId] = "off";
  return { files: settings.globs, rules };
}
