/**
 * The SSoT proof-of-delegation marker.
 *
 * `resolveEslintConfig()` stamps this symbol (non-enumerable) onto the flat
 * config array it returns. A consumer's OPTIONAL project-root `eslint.config.js`
 * is expected to be a thin delegator — `export default await
 * projectEslintConfig(import.meta.url)` — so its default export is that same
 * marked array. The parity check (src/tools/eslintConfigParity.ts) dynamic-imports
 * the root config and asserts the mark is present: that is what proves `npx eslint`
 * (native discovery → root config) and `npx ts-qa` (generated `--config` →
 * resolveEslintConfig) run the IDENTICAL rule set, instead of silently diverging.
 *
 * `Symbol.for` keys by string in the cross-realm global symbol registry, so the
 * mark is the SAME symbol on both sides of the dynamic `import()` boundary between
 * the root-config module instance and the checker — a plain module-local
 * `Symbol()` would not survive that boundary.
 */
export declare const RESOLVED_ESLINT_CONFIG_MARK: unique symbol;
/**
 * Stamp the resolved-config marker onto a flat-config array (arrays are objects,
 * so `defineProperty` is valid). Non-enumerable so it never leaks into ESLint's
 * own iteration of the config entries.
 */
export declare function markResolvedEslintConfig<T extends object>(config: T): T;
/**
 * True iff `value` carries the resolved-config marker — i.e. it came out of
 * `resolveEslintConfig()` (directly, or via `projectEslintConfig`), rather than
 * being a hand-rolled config that would diverge from the ts-qa run.
 */
export declare function isResolvedEslintConfig(value: unknown): boolean;
//# sourceMappingURL=resolvedConfigMarker.d.ts.map