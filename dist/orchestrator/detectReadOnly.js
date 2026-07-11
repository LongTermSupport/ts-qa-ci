/**
 * The CI / read-only duality (Plan 011 phase2-design.md §2.5), ported 1:1 from
 * php-qa-ci's detectReadOnly()/qaReadOnly split. Two independent booleans, set
 * by different signals - CLAUDECODE/non-TTY deliberately does NOT affect
 * TSQA_READONLY, only TSQA_CI, so a Claude Code session stays writable.
 */
export function detectCi(env, stdinIsTTY, stdoutIsTTY) {
  if (env.CI === "true") return true;
  // BUG A: this used to console.log unconditionally, corrupting `--json` output.
  // detectCi is now pure; the CLAUDECODE diagnostic lives in runPipeline, where
  // the json flag is known and the message can be gated on non-json runs.
  if (env.CLAUDECODE === "1") return true;
  if (!stdinIsTTY || !stdoutIsTTY) return true;
  return false;
}
export function detectReadOnly(env) {
  if (env.TSQA_READONLY === "1") return true;
  if (env.TSQA_READONLY === "0") return false;
  if (env.GITHUB_ACTIONS === "true") return true;
  return false;
}
/** An env var counts as "set" only when present and non-empty (an empty string is treated as unset). */
function isSet(value) {
  return value !== undefined && value !== "";
}
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
export function detectLlm(env) {
  if (env.TSQA_LLM === "1") return true;
  if (env.TSQA_LLM === "0") return false;
  if (env.CLAUDECODE === "1") return true;
  if (isSet(env.CLAUDE_CODE)) return true;
  if (isSet(env.CLAUDE_CODE_ENTRYPOINT)) return true;
  if (isSet(env.AGENT)) return true;
  if (isSet(env.AI_AGENT)) return true;
  return false;
}
//# sourceMappingURL=detectReadOnly.js.map
