/**
 * The CI / read-only duality (Plan 011 phase2-design.md §2.5), ported 1:1 from
 * php-qa-ci's detectReadOnly()/qaReadOnly split. Two independent booleans, set
 * by different signals - CLAUDECODE/non-TTY deliberately does NOT affect
 * TSQA_READONLY, only TSQA_CI, so a Claude Code session stays writable.
 */

export function detectCi(
  env: NodeJS.ProcessEnv,
  stdinIsTTY: boolean,
  stdoutIsTTY: boolean,
): boolean {
  if (env.CI === "true") return true;
  // BUG A: this used to console.log unconditionally, corrupting `--json` output.
  // detectCi is now pure; the CLAUDECODE diagnostic lives in runPipeline, where
  // the json flag is known and the message can be gated on non-json runs.
  if (env.CLAUDECODE === "1") return true;
  if (!stdinIsTTY || !stdoutIsTTY) return true;
  return false;
}

export function detectReadOnly(env: NodeJS.ProcessEnv): boolean {
  if (env.TSQA_READONLY === "1") return true;
  if (env.TSQA_READONLY === "0") return false;
  if (env.GITHUB_ACTIONS === "true") return true;
  return false;
}
