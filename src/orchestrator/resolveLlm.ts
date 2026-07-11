import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { detectLlm } from './detectReadOnly.js';

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

const LLM_OUTPUT_MODES = ['auto', 'always', 'never'] as const;

function isLlmOutputMode(value: unknown): value is LlmOutputMode {
  return typeof value === 'string' && (LLM_OUTPUT_MODES as readonly string[]).includes(value);
}

/**
 * Reads the `llmOutput` knob from `tsQaConfig/ts-qa.json` via the same path
 * `resolveDisabledTools` uses. A missing file or absent key defaults to
 * `"auto"`; a present-but-invalid value throws rather than being silently
 * ignored (mirrors the `disabledTools` validation).
 */
export function resolveLlmOutputMode(projectRoot: string): LlmOutputMode {
  const configPath = join(projectRoot, 'tsQaConfig', 'ts-qa.json');
  if (!existsSync(configPath)) return 'auto';

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (cause) {
    throw new Error(`ts-qa: could not parse ${configPath} as JSON`, { cause });
  }

  if (parsed === null || typeof parsed !== 'object' || !('llmOutput' in parsed)) {
    return 'auto';
  }

  const value = (parsed as { llmOutput: unknown }).llmOutput;
  if (!isLlmOutputMode(value)) {
    throw new Error(
      `ts-qa: "llmOutput" in ${configPath} must be one of ${LLM_OUTPUT_MODES.join(', ')} (got ${JSON.stringify(value)})`
    );
  }
  return value;
}

export interface LlmResolutionInput {
  /** CLI tri-state: `true` = `--llm`, `false` = `--no-llm`, `undefined` = neither. */
  cli: boolean | undefined;
  /** Whether `--json` was passed — it owns stdout, so `--llm` is never auto-enabled alongside it. */
  json: boolean;
  env: NodeJS.ProcessEnv;
  mode: LlmOutputMode;
}

/** Applies the precedence ladder to a definite on/off decision. */
export function resolveLlm(input: LlmResolutionInput): boolean {
  if (input.cli === true) return true;
  if (input.cli === false) return false;
  // An explicit `--json` dump owns stdout; do not auto-enable the summary next to it.
  if (input.json) return false;
  if (input.env.TSQA_LLM === '1') return true;
  if (input.env.TSQA_LLM === '0') return false;
  if (input.mode === 'always') return true;
  if (input.mode === 'never') return false;
  return detectLlm(input.env);
}
