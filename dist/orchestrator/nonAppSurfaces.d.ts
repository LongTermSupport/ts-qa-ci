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
export declare const DEFAULT_NON_APP_SURFACE_DISABLED_RULES: readonly string[];
export interface NonAppSurfacesSettings {
  globs: string[];
  disabledRules: string[];
}
/**
 * Reads `nonAppSurfaces` (required globs) and optional `nonAppSurfaceRules`
 * (override the disabled-rule list) from tsQaConfig/ts-qa.json. Returns undefined
 * when the key is absent — the common case for a project with no non-app surfaces
 * to carve out. A present-but-malformed value throws rather than being ignored.
 */
export declare function loadNonAppSurfaces(
  projectRoot: string,
): NonAppSurfacesSettings | undefined;
/**
 * Builds the single flat-config off-block that turns the component-authoring CDD
 * rules off on the non-app-surface globs. Returns undefined when nothing is
 * configured, so callers can spread `...(block ? [block] : [])`.
 */
export declare function buildNonAppSurfacesBlock(
  settings: NonAppSurfacesSettings | undefined,
):
  | {
      files: string[];
      rules: Record<string, "off">;
    }
  | undefined;
//# sourceMappingURL=nonAppSurfaces.d.ts.map
