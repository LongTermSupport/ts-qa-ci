/**
 * Every tool name the pipeline can run, across all phases plus the opt-in
 * Stryker. Used to validate `disabledTools` / `--skip` inputs so a typo fails
 * loudly instead of silently disabling nothing (or hiding a heavy tool the
 * author only *thought* was still on). Keep in sync with the PHASES table in
 * runPipeline.ts and the opt-in tools.
 */
export declare const KNOWN_TOOLS: readonly [
  "eslintConfigParity",
  "supplyChain",
  "oxlint",
  "prettier",
  "eslintFix",
  "eslintReport",
  "remarkValidateLinks",
  "knip",
  "tsc",
  "dependencyCruiser",
  "vitest",
  "playwright",
  "stryker",
];
export interface DisabledToolsResult {
  /** Tool names to skip. */
  disabled: Set<string>;
  /** Where each disabled tool came from, for transparency logging. */
  sources: Map<string, "config" | "cli">;
}
/**
 * Resolves the set of tools to skip for this run, from
 * `tsQaConfig/ts-qa.json` (`"disabledTools": [...]`) merged with any CLI
 * `--skip <tool>` values.
 *
 * The canonical use case is Playwright: it needs a served instance, so a
 * project can run browser tests as a separate served-instance CI job and keep
 * `ts-qa` scoped to the static + unit surface (`disabledTools: ["playwright"]`).
 *
 * Every name is validated against {@link KNOWN_TOOLS}; an unknown name throws
 * (a typo must not silently disable nothing). A missing config file is fine;
 * a present-but-malformed one throws rather than being silently ignored.
 */
export declare function resolveDisabledTools(
  projectRoot: string,
  cliSkip?: string[],
): DisabledToolsResult;
//# sourceMappingURL=resolveDisabledTools.d.ts.map
