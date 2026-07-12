/**
 * The standard SURFACE taxonomy. Every project has the same handful of code
 * surfaces — app source, unit tests, stories, e2e specs, dev scripts, generated
 * code — each of which wants a different QA posture. Rather than every consumer
 * hand-rolling `ignores` + per-glob rule-off blocks (the blind-spot generator
 * Fable audit 3 found), a consumer just NAMES their dirs and ts-qa-ci owns the
 * defaults + the per-surface rule policy:
 *
 *   { "surfaces": { "e2e": "tests/e2e" } }   // override one dir; rest are defaults
 *   { "surfaces": true }                      // all defaults
 *
 * Posture per surface:
 *   - source     : ALL ts-qa rules ON (the shipped app — the whole point).
 *   - tests/stories/e2e/scripts (non-app): ts-qa's OWN rules OFF (its CDD doctrine
 *     does not apply to demo/test/tooling code) — but the files are STILL linted by
 *     the consumer's own rules (strict-TS, local, storybook). No blind spot.
 *   - generated  : IGNORED (machine-generated, not authored).
 *
 * Non-app off-blocks are appended by resolveEslintConfig AFTER the Tier A override
 * guard, so they need no tier-a-exemptions entry — ts-qa's own sanctioned carve-out.
 */
/** The ts-qa rule ids turned off on non-app surfaces: every rule the plugin ships
 * (all tiers) plus the core as/enum ban. Computed from the tier maps so a new rule
 * is covered automatically. */
export declare const ALL_TSQA_DISABLEABLE_RULE_IDS: readonly string[];
type SurfaceKind = "source" | "nonApp" | "ignore";
interface SurfaceDefault {
  kind: SurfaceKind;
  globs: string[];
}
/** Built-in defaults. A consumer overrides only what differs from these. */
export declare const DEFAULT_SURFACES: Record<string, SurfaceDefault>;
export interface ResolvedSurface {
  name: string;
  kind: SurfaceKind;
  globs: string[];
  /** For non-app surfaces: the rule ids to switch off (defaults to all ts-qa rules). */
  disabledRules: string[];
}
/**
 * Reads `surfaces` from tsQaConfig/ts-qa.json and resolves it against the
 * defaults. Returns undefined when the key is absent (no surface handling — the
 * consumer's own config is fully in charge). A malformed value throws.
 */
export declare function loadSurfaces(
  projectRoot: string,
): ResolvedSurface[] | undefined;
/** Ignore globs contributed by `generated`/`ignore`-kind surfaces. */
export declare function surfaceIgnores(
  surfaces: ResolvedSurface[] | undefined,
): string[];
/** One flat-config off-block per non-app surface (ts-qa rules → off on its globs). */
export declare function surfaceOffBlocks(
  surfaces: ResolvedSurface[] | undefined,
): Array<{
  files: string[];
  rules: Record<string, "off">;
}>;
export {};
//# sourceMappingURL=surfaces.d.ts.map
