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
export const RESOLVED_ESLINT_CONFIG_MARK = Symbol.for(
  "@longtermsupport/ts-qa-ci:resolved-eslint-config",
);

/**
 * Stamp the resolved-config marker onto a flat-config array (arrays are objects,
 * so `defineProperty` is valid). Non-enumerable so it never leaks into ESLint's
 * own iteration of the config entries.
 */
export function markResolvedEslintConfig<T extends object>(config: T): T {
  Object.defineProperty(config, RESOLVED_ESLINT_CONFIG_MARK, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return config;
}

/**
 * True iff `value` carries the resolved-config marker — i.e. it came out of
 * `resolveEslintConfig()` (directly, or via `projectEslintConfig`), rather than
 * being a hand-rolled config that would diverge from the ts-qa run.
 */
export function isResolvedEslintConfig(value: unknown): boolean {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  )
    return false;
  return (
    (value as Record<symbol, unknown>)[RESOLVED_ESLINT_CONFIG_MARK] === true
  );
}
