/**
 * The CI / read-only duality (Plan 011 phase2-design.md §2.5), ported 1:1 from
 * php-qa-ci's detectReadOnly()/qaReadOnly split. Two independent booleans, set
 * by different signals - CLAUDECODE/non-TTY deliberately does NOT affect
 * TSQA_READONLY, only TSQA_CI, so a Claude Code session stays writable.
 */
export declare function detectCi(env: NodeJS.ProcessEnv, stdinIsTTY: boolean, stdoutIsTTY: boolean): boolean;
export declare function detectReadOnly(env: NodeJS.ProcessEnv): boolean;
/**
 * Auto-detect an agent/LLM environment, so `--llm` output can turn on without an
 * explicit flag (mirrors detectCi's CLAUDECODE check, and php-qa-ci's agent
 * detection). This is the `"auto"` branch of the `llmOutput` config knob.
 *
 * The allowlist is explicit and env-signal only: `TSQA_LLM` is the override
 * (exact `'1'`/`'0'` on/off, like TSQA_READONLY — never JS-truthiness, so the
 * string `'0'` reads as OFF), then a fixed set of agent markers. It deliberately
 * does NOT infer from a non-TTY or a pipe (detectCi's job) — a human piping a
 * run to a file must keep the rich output, not silently switch to summary mode.
 */
export declare function detectLlm(env: NodeJS.ProcessEnv): boolean;
//# sourceMappingURL=detectReadOnly.d.ts.map