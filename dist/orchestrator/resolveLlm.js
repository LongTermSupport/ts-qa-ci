import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectLlm } from './detectReadOnly.js';
const LLM_OUTPUT_MODES = ['auto', 'always', 'never'];
function isLlmOutputMode(value) {
    return typeof value === 'string' && LLM_OUTPUT_MODES.includes(value);
}
/**
 * Reads the `llmOutput` knob from `tsQaConfig/ts-qa.json` via the same path
 * `resolveDisabledTools` uses. A missing file or absent key defaults to
 * `"auto"`; a present-but-invalid value throws rather than being silently
 * ignored (mirrors the `disabledTools` validation).
 */
export function resolveLlmOutputMode(projectRoot) {
    const configPath = join(projectRoot, 'tsQaConfig', 'ts-qa.json');
    if (!existsSync(configPath))
        return 'auto';
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
    }
    catch (cause) {
        throw new Error(`ts-qa: could not parse ${configPath} as JSON`, { cause });
    }
    if (parsed === null || typeof parsed !== 'object' || !('llmOutput' in parsed)) {
        return 'auto';
    }
    const value = parsed.llmOutput;
    if (!isLlmOutputMode(value)) {
        throw new Error(`ts-qa: "llmOutput" in ${configPath} must be one of ${LLM_OUTPUT_MODES.join(', ')} (got ${JSON.stringify(value)})`);
    }
    return value;
}
/** Applies the precedence ladder to a definite on/off decision. */
export function resolveLlm(input) {
    if (input.cli === true)
        return true;
    if (input.cli === false)
        return false;
    // An explicit `--json` dump owns stdout; do not auto-enable the summary next to it.
    if (input.json)
        return false;
    if (input.env.TSQA_LLM === '1')
        return true;
    if (input.env.TSQA_LLM === '0')
        return false;
    if (input.mode === 'always')
        return true;
    if (input.mode === 'never')
        return false;
    return detectLlm(input.env);
}
//# sourceMappingURL=resolveLlm.js.map