/**
 * Whether `--llm` compact output is active is resolved from four layers, highest
 * precedence first (see docs/pipeline.md):
 *
 *   1. CLI `--llm` / `--no-llm`        (explicit boolean, always wins)
 *   2. env `TSQA_LLM=1` / `TSQA_LLM=0` (explicit override)
 *   3. config `llmOutput` in tsQaConfig/ts-qa.json ("always" | "never" | "auto")
 *   4. default "auto" ⇒ detectLlm(env) agent auto-detection
 *
 * This mirrors the resolution shape of detectReadOnly (CLI flag > env > default)
 * so an agent gets compact+cached output automatically while a human in a
 * terminal keeps the current rich output, and either can be forced.
 */
export type LlmOutputMode = 'auto' | 'always' | 'never';
/**
 * Reads the `llmOutput` knob from `tsQaConfig/ts-qa.json` via the same path
 * `resolveDisabledTools` uses. A missing file or absent key defaults to
 * `"auto"`; a present-but-invalid value throws rather than being silently
 * ignored (mirrors the `disabledTools` validation).
 */
export declare function resolveLlmOutputMode(projectRoot: string): LlmOutputMode;
export interface LlmResolutionInput {
    /** CLI tri-state: `true` = `--llm`, `false` = `--no-llm`, `undefined` = neither. */
    cli: boolean | undefined;
    /** Whether `--json` was passed — it owns stdout, so `--llm` is never auto-enabled alongside it. */
    json: boolean;
    env: NodeJS.ProcessEnv;
    mode: LlmOutputMode;
}
/** Applies the precedence ladder to a definite on/off decision. */
export declare function resolveLlm(input: LlmResolutionInput): boolean;
//# sourceMappingURL=resolveLlm.d.ts.map