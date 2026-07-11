import type { Rule } from "eslint";

import exhaustiveDiscriminated from "./exhaustiveDiscriminated.js";
import explicitComponentDisplayname from "./explicitComponentDisplayname.js";
import jsxTruthyNarrow from "./jsxTruthyNarrow.js";
import noAdHocClassnames from "./noAdHocClassnames.js";
import noAdHocHtml from "./noAdHocHtml.js";
import noClassnameProp from "./noClassnameProp.js";
import noClassnamePublicProp from "./noClassnamePublicProp.js";
import noCrossModuleRelative from "./noCrossModuleRelative.js";
import noDefaultExport from "./noDefaultExport.js";
import noDomClassnameMutation from "./noDomClassnameMutation.js";
import noDuplicateSectionIds from "./noDuplicateSectionIds.js";
import noErrorHidingFallback from "./noErrorHidingFallback.js";
import noEslintDisable from "./noEslintDisable.js";
import noInlineComponentDeclInRender from "./noInlineComponentDeclInRender.js";
import noPlaceholder from "./noPlaceholder.js";
import noTypedQuerySelector from "./noTypedQuerySelector.js";
import oneComponentPerFile from "./oneComponentPerFile.js";
// Ported from admin-ts's eslint-plugin-dbf during the adoption (Plan 00004).
import requireErrorCause from "./requireErrorCause.js";
import requireExplicitTypeAnnotations from "./requireExplicitTypeAnnotations.js";
import requireExportedComponentTypes from "./requireExportedComponentTypes.js";
import ssrSafeHooks from "./ssrSafeHooks.js";
import validateLazyImports from "./validateLazyImports.js";
import variantApiEnforcement from "./variantApiEnforcement.js";

/**
 * ESLint flat-config plugin delivery (phase2-design.md §3): a "plugin" is
 * just an exported object with a `rules` map — no eslint-plugin-ts-qa-ci
 * package or legacy plugin-name resolution needed.
 */
export const tsQaPlugin: { rules: Record<string, Rule.RuleModule> } = {
  rules: {
    "no-eslint-disable": noEslintDisable,
    "no-duplicate-section-ids": noDuplicateSectionIds,
    "no-placeholder": noPlaceholder,
    "require-explicit-type-annotations": requireExplicitTypeAnnotations,
    "require-exported-component-types": requireExportedComponentTypes,
    "ssr-safe-hooks": ssrSafeHooks,
    "validate-lazy-imports": validateLazyImports,
    "no-ad-hoc-html": noAdHocHtml,
    "no-ad-hoc-classnames": noAdHocClassnames,
    "variant-api-enforcement": variantApiEnforcement,
    // Ported from admin-ts's eslint-plugin-dbf (Plan 00004).
    "require-error-cause": requireErrorCause,
    "no-typed-query-selector": noTypedQuerySelector,
    "jsx-truthy-narrow": jsxTruthyNarrow,
    "no-inline-component-decl-in-render": noInlineComponentDeclInRender,
    "exhaustive-discriminated": exhaustiveDiscriminated,
    "one-component-per-file": oneComponentPerFile,
    "explicit-component-displayname": explicitComponentDisplayname,
    "no-error-hiding-fallback": noErrorHidingFallback,
    "no-dom-classname-mutation": noDomClassnameMutation,
    "no-default-export": noDefaultExport,
    "no-cross-module-relative": noCrossModuleRelative,
    "no-classname-prop": noClassnameProp,
    "no-classname-public-prop": noClassnamePublicProp,
  },
};

/**
 * Tier A rule IDs, namespaced as they appear in a consumer's flat config
 * (ts-qa/<rule>). Tier A is ALWAYS-ON — spread into the generic base config and
 * applied to every consumer. Only universal correctness rules belong here;
 * opinionated / stylistic / project-specific rules go in Tier B or C so other
 * consumers (e.g. lts-commerce-site) are not force-broken on a version bump.
 */
export const TIER_A_ESLINT_RULES = {
  "ts-qa/no-eslint-disable": "error",
  "ts-qa/no-duplicate-section-ids": "error",
  "ts-qa/no-placeholder": "error",
  "ts-qa/require-explicit-type-annotations": "error",
  "ts-qa/require-exported-component-types": "error",
  "ts-qa/ssr-safe-hooks": "error",
  "ts-qa/validate-lazy-imports": "error",
  "ts-qa/no-ad-hoc-html": "error",
  // Ported correctness rules (Plan 00004).
  "ts-qa/require-error-cause": "error",
  "ts-qa/no-typed-query-selector": "error",
  "ts-qa/jsx-truthy-narrow": "error",
  "ts-qa/no-inline-component-decl-in-render": "error",
  "ts-qa/exhaustive-discriminated": "error", // scaffolded stub — reports nothing until type-aware support lands
} as const;

/** Tier B rule IDs — opt-in, NOT spread by default (consumer must enable explicitly). */
export const TIER_B_ESLINT_RULES = {
  "ts-qa/no-ad-hoc-classnames": "warn",
  "ts-qa/variant-api-enforcement": "off", // scaffold only, see variantApiEnforcement.ts
  // Ported CDD / hygiene rules (Plan 00004) — opinionated, opt-in.
  "ts-qa/one-component-per-file": "warn",
  "ts-qa/explicit-component-displayname": "warn",
  "ts-qa/no-error-hiding-fallback": "warn",
  "ts-qa/no-dom-classname-mutation": "warn",
  // className doctrine axes 2 + 3 (Plan 00004 Task 1.3), ported from admin-ts as
  // dedicated companion rules rather than fleshing out the variant-api-enforcement
  // scaffold (which its author reserves for the future variant-prop catalogue).
  // Opinionated CDD — opt-in Tier B; recommended severity 'error' when a project
  // adopts the className doctrine (admin-ts enables at error).
  "ts-qa/no-classname-prop": "warn",
  "ts-qa/no-classname-public-prop": "warn",
} as const;

/**
 * Tier C rule IDs — opt-in, project/framework-specific, NOT spread by default.
 * Establishes the previously-unbuilt Tier C (docs/cdd-rules.md §Tier C) with the
 * first two architecture rules ported from admin-ts (Plan 00004). Recommended
 * severity when a project opts in is 'error'; they stay off for everyone else.
 */
export const TIER_C_ESLINT_RULES = {
  "ts-qa/no-default-export": "error",
  "ts-qa/no-cross-module-relative": "error",
} as const;
