import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TIER_A_ESLINT_RULES,
  TIER_B_ESLINT_RULES,
  TIER_C_ESLINT_RULES,
} from "../rules/index.js";
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
export const ALL_TSQA_DISABLEABLE_RULE_IDS = [
  ...Object.keys(TIER_A_ESLINT_RULES),
  ...Object.keys(TIER_B_ESLINT_RULES),
  ...Object.keys(TIER_C_ESLINT_RULES),
  "no-restricted-syntax",
];
/** Built-in defaults. A consumer overrides only what differs from these. */
export const DEFAULT_SURFACES = {
  source: { kind: "source", globs: ["src/**"] },
  tests: {
    kind: "nonApp",
    globs: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "src/test/**",
      "**/__tests__/**",
    ],
  },
  stories: { kind: "nonApp", globs: ["**/*.stories.{ts,tsx}", "**/*.mdx"] },
  e2e: {
    kind: "nonApp",
    globs: ["e2e/**", "tests/e2e/**", "**/*.e2e.{ts,tsx}"],
  },
  scripts: {
    kind: "nonApp",
    globs: ["scripts/**", "*.config.{ts,js,mjs,cts,mts}", "capture-*.ts"],
  },
  generated: { kind: "ignore", globs: ["src/generated/**", "**/*.gen.ts"] },
};
/** A bare directory (`"e2e"`, `"src/test"`) becomes `"e2e/**"`; anything already
 * containing a glob metachar or a path with an extension is used verbatim. */
function normaliseGlob(value) {
  if (/[*?[\]{}]/.test(value) || /\.[a-z]+$/i.test(value)) return value;
  return `${value.replace(/\/+$/, "")}/**`;
}
function toGlobs(value) {
  return (Array.isArray(value) ? value : [value]).map(normaliseGlob);
}
/**
 * Reads `surfaces` from tsQaConfig/ts-qa.json and resolves it against the
 * defaults. Returns undefined when the key is absent (no surface handling — the
 * consumer's own config is fully in charge). A malformed value throws.
 */
export function loadSurfaces(projectRoot) {
  const configPath = join(projectRoot, "tsQaConfig", "ts-qa.json");
  if (!existsSync(configPath)) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (cause) {
    throw new Error(`ts-qa: could not parse ${configPath} as JSON`, { cause });
  }
  const raw = parsed.surfaces;
  if (raw === undefined) return undefined;
  if (raw !== true && (typeof raw !== "object" || raw === null)) {
    throw new Error(
      `ts-qa: "surfaces" in ${configPath} must be \`true\` or an object of surface overrides`,
    );
  }
  const overrides = raw === true ? {} : raw;
  // Union of the built-in surface names and any custom names the consumer added.
  const names = new Set([
    ...Object.keys(DEFAULT_SURFACES),
    ...Object.keys(overrides),
  ]);
  const resolved = [];
  for (const name of names) {
    const override = overrides[name];
    if (override === false) continue; // surface disabled
    const def = DEFAULT_SURFACES[name];
    const kind = def?.kind ?? "nonApp"; // custom names default to nonApp
    let globs;
    let rules;
    if (override === undefined) {
      if (!def) continue; // unreachable: name came from defaults or overrides
      globs = def.globs;
    } else if (typeof override === "string" || Array.isArray(override)) {
      globs = toGlobs(override);
    } else {
      globs =
        override.globs !== undefined
          ? toGlobs(override.globs)
          : (def?.globs ?? []);
      rules = override.rules;
    }
    if (globs.length === 0) continue;
    resolved.push({
      name,
      kind,
      globs,
      disabledRules:
        kind === "nonApp" ? (rules ?? [...ALL_TSQA_DISABLEABLE_RULE_IDS]) : [],
    });
  }
  return resolved;
}
/** Ignore globs contributed by `generated`/`ignore`-kind surfaces. */
export function surfaceIgnores(surfaces) {
  if (!surfaces) return [];
  return surfaces.filter((s) => s.kind === "ignore").flatMap((s) => s.globs);
}
/** One flat-config off-block per non-app surface (ts-qa rules → off on its globs). */
export function surfaceOffBlocks(surfaces) {
  if (!surfaces) return [];
  return surfaces
    .filter((s) => s.kind === "nonApp")
    .map((s) => {
      const rules = {};
      for (const id of s.disabledRules) rules[id] = "off";
      return { files: s.globs, rules };
    });
}
//# sourceMappingURL=surfaces.js.map
