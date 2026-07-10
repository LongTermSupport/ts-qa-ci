import type { Linter } from 'eslint';
/**
 * Strict-TypeScript baseline doctrine (Plan 00004 Task 1.4), upstreamed from
 * admin-ts's hand-rolled `eslint.config.mjs`. This is the load-bearing quality
 * ratchet that ts-qa-ci exists to provide: the elevated `@typescript-eslint`
 * severities + the total `as`/enum ban + the comment-suppression lockdown.
 *
 * WHY this is an OPT-IN preset (a severity map you spread), NOT an always-on
 * Tier A block in the generic base config:
 *
 *   - Most of these are TYPE-AWARE rules (no-floating-promises,
 *     strict-boolean-expressions, no-unsafe-*, …) — they call
 *     `parserServices.getTypeChecker()` and REQUIRE the consumer to have wired
 *     `parserOptions.projectService` (or `.project`). ESLint hard-crashes
 *     ("you have used a rule which requires type information, but you haven't
 *     provided a project") on any consumer that has not. The generic base
 *     config deliberately wires no parser at all (the consumer's own
 *     `tsQaConfig/eslint.config.js` supplies parser + project), so these cannot
 *     be safely forced on every consumer.
 *   - They also need the `@typescript-eslint` plugin registered, which the
 *     consumer already does when it sets up the type-aware parser. Shipping the
 *     preset as a plain severity MAP (string rule-id → severity) — rather than
 *     a flat-config array that registers the plugin — keeps ts-qa-ci free of a
 *     heavyweight `typescript-eslint` dependency: the consumer's own plugin
 *     provides the rule definitions; this module only supplies the opinion.
 *
 * A consumer adopts it inside a type-aware, TS-file-scoped block, e.g.:
 *
 *   import tseslint from 'typescript-eslint';
 *   import { STRICT_TYPESCRIPT_RULES } from '@longtermsupport/ts-qa-ci';
 *   export default [
 *     ...tseslint.configs.strictTypeChecked,
 *     { files: ['**\/*.{ts,tsx}'],
 *       languageOptions: { parserOptions: { projectService: true } },
 *       rules: { ...STRICT_TYPESCRIPT_RULES } },
 *   ];
 *
 * Split per rule-classification.md §3: the LOAD-BEARING severities live in
 * STRICT_TYPESCRIPT_RULES (recommended for every type-aware TS consumer); the
 * more opinionated / stylistic elevations live in the separate opt-in
 * STRICT_TYPESCRIPT_STYLISTIC_RULES so consumers are not forced into stylistic
 * churn. `reportUnusedDisableDirectives` is NOT here — it is a linterOption, not
 * a rule, and ships always-on in the generic base config alongside
 * `no-eslint-disable`.
 */
export declare const STRICT_TYPESCRIPT_RULES: Linter.RulesRecord;
/**
 * Opinionated / stylistic elevations (rule-classification.md §3, "kept optional
 * so consumers aren't forced into stylistic churn"). Ships separately so a
 * consumer that wants the full admin-ts posture can spread this on top of
 * STRICT_TYPESCRIPT_RULES, while a consumer that only wants the correctness
 * ratchet is not dragged into readonly/module-boundary/type-export churn.
 */
export declare const STRICT_TYPESCRIPT_STYLISTIC_RULES: Linter.RulesRecord;
//# sourceMappingURL=strictTypescript.d.ts.map