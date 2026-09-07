import exhaustiveDiscriminated from "./exhaustiveDiscriminated.js";
import explicitComponentDisplayname from "./explicitComponentDisplayname.js";
import jsxTruthyNarrow from "./jsxTruthyNarrow.js";
import noAdHocHtml from "./noAdHocHtml.js";
import noClassnameProp from "./noClassnameProp.js";
import noClassnamePublicProp from "./noClassnamePublicProp.js";
import noCrossModuleRelative from "./noCrossModuleRelative.js";
import noDefaultExport from "./noDefaultExport.js";
import noDomClassnameMutation from "./noDomClassnameMutation.js";
import noDuplicateSectionIds from "./noDuplicateSectionIds.js";
import noErrorHidingFallback from "./noErrorHidingFallback.js";
import noHardcodedToolSourcePath from "./noHardcodedToolSourcePath.js";
import noEslintDisable from "./noEslintDisable.js";
import noHtmlInFrontControllers from "./noHtmlInFrontControllers.js";
import noInlineComponentDeclInRender from "./noInlineComponentDeclInRender.js";
import noNaiveDatetimeTemplate from "./noNaiveDatetimeTemplate.js";
import noPlaceholder from "./noPlaceholder.js";
import noTypedQuerySelector from "./noTypedQuerySelector.js";
import noUnresolvedEntrypointCheck from "./noUnresolvedEntrypointCheck.js";
import oneComponentPerFile from "./oneComponentPerFile.js";
// Ported from admin-ts's eslint-plugin-dbf during the adoption (Plan 00004).
import requireErrorCause from "./requireErrorCause.js";
import requireExplicitTypeAnnotations from "./requireExplicitTypeAnnotations.js";
import requireExportedComponentTypes from "./requireExportedComponentTypes.js";
import requireVariantResolver from "./requireVariantResolver.js";
import ssrSafeHooks from "./ssrSafeHooks.js";
import validateLazyImports from "./validateLazyImports.js";
import variantApiEnforcement from "./variantApiEnforcement.js";
/**
 * ESLint flat-config plugin delivery (phase2-design.md §3): a "plugin" is
 * just an exported object with a `rules` map — no eslint-plugin-ts-qa-ci
 * package or legacy plugin-name resolution needed.
 */
export const tsQaPlugin = {
  rules: {
    "no-eslint-disable": noEslintDisable,
    "no-duplicate-section-ids": noDuplicateSectionIds,
    "no-placeholder": noPlaceholder,
    "require-explicit-type-annotations": requireExplicitTypeAnnotations,
    "require-exported-component-types": requireExportedComponentTypes,
    "ssr-safe-hooks": ssrSafeHooks,
    "validate-lazy-imports": validateLazyImports,
    "no-ad-hoc-html": noAdHocHtml,
    "no-html-in-front-controllers": noHtmlInFrontControllers,
    "require-variant-resolver": requireVariantResolver,
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
    // Ported from CounselBook's eslint-rules/no-naive-datetime-template.js
    // (Plan 00107 BUG-A).
    "no-naive-datetime-template": noNaiveDatetimeTemplate,
    // Defence Before Fix execution test 6: a CLI that exits 0 having run
    // nothing because its entry-point check compared an unresolved argv[1].
    "no-unresolved-entrypoint-check": noUnresolvedEntrypointCheck,
    // Internal meta-rule over how a ToolModule (src/tools/*.ts) is authored,
    // not consumer code, so it is in no Tier; enforced on ts-qa-ci's own
    // source via tsQaConfig/eslint.config.js. See docs/cdd-rules.md#no-hardcoded-tool-source-path.
    "no-hardcoded-tool-source-path": noHardcodedToolSourcePath,
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
  // "Closed component styling" doctrine (Plan 00004): components own their CSS
  // internally and expose ONLY variant props — no className/style passthrough.
  // Universal encapsulation, so Tier A alongside no-ad-hoc-html. (Distinct from
  // the opt-in require-variant-resolver, which is about HOW internal classes are
  // built — a cva/cn resolver call — not about the passthrough boundary.)
  "ts-qa/no-classname-prop": "error",
  "ts-qa/no-classname-public-prop": "error",
  // Ported correctness rule (CounselBook Plan 00107 BUG-A): bans a naive/
  // hardcoded-offset datetime template literal — a universal RFC 3339
  // correctness hazard, not an opinionated/stylistic choice.
  "ts-qa/no-naive-datetime-template": "error",
  // A Node CLI whose "invoked directly" check compares an unresolved argv[1]
  // exits 0 in silence behind node_modules/.bin. Universal correctness hazard.
  "ts-qa/no-unresolved-entrypoint-check": "error",
};
/** Tier B rule IDs — opt-in, NOT spread by default (consumer must enable explicitly). */
export const TIER_B_ESLINT_RULES = {
  // require-variant-resolver (formerly no-ad-hoc-classnames): OPT-IN adoption of a
  // cva/cn/clsx/twMerge resolver for a component's OWN internal className strings.
  // This is a HOW-you-build-internal-classes opinion, NOT the closed-styling
  // boundary (that is Tier A no-classname-prop / no-classname-public-prop). Kept
  // opt-in so a project using plain static Tailwind strings internally is not
  // forced into meaningless cn('static') wrappers.
  "ts-qa/require-variant-resolver": "warn",
  // Pins composition ROOTS (screens/pages) to zero raw HTML — stricter than
  // no-ad-hoc-html, which self-exempts a screen whose export matches its
  // filename. OFF by default because "which dirs are front controllers" is a
  // per-project convention: enable as ["error", { frontControllerDirs: [...] }].
  "ts-qa/no-html-in-front-controllers": "off",
  "ts-qa/variant-api-enforcement": "off", // scaffold only, see variantApiEnforcement.ts
  // Ported CDD / hygiene rules (Plan 00004) — opinionated, opt-in.
  "ts-qa/one-component-per-file": "warn",
  "ts-qa/explicit-component-displayname": "warn",
  "ts-qa/no-error-hiding-fallback": "warn",
  "ts-qa/no-dom-classname-mutation": "warn",
};
/**
 * Tier C rule IDs — opt-in, project/framework-specific, NOT spread by default.
 * Establishes the previously-unbuilt Tier C (docs/cdd-rules.md §Tier C) with the
 * first two architecture rules ported from admin-ts (Plan 00004). Recommended
 * severity when a project opts in is 'error'; they stay off for everyone else.
 */
export const TIER_C_ESLINT_RULES = {
  "ts-qa/no-default-export": "error",
  "ts-qa/no-cross-module-relative": "error",
};
//# sourceMappingURL=index.js.map
