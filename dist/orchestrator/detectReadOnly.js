/**
 * The CI / read-only duality (Plan 011 phase2-design.md §2.5), ported 1:1 from
 * php-qa-ci's detectReadOnly()/qaReadOnly split. Two independent booleans, set
 * by different signals - CLAUDECODE/non-TTY deliberately does NOT affect
 * TSQA_READONLY, only TSQA_CI, so a Claude Code session stays writable.
 */
export function detectCi(env, stdinIsTTY, stdoutIsTTY) {
    if (env.CI === 'true')
        return true;
    if (env.CLAUDECODE === '1') {
        console.log('Claude Code environment detected - enabling CI mode');
        return true;
    }
    if (!stdinIsTTY || !stdoutIsTTY)
        return true;
    return false;
}
export function detectReadOnly(env) {
    if (env.TSQA_READONLY === '1')
        return true;
    if (env.TSQA_READONLY === '0')
        return false;
    if (env.GITHUB_ACTIONS === 'true')
        return true;
    return false;
}
//# sourceMappingURL=detectReadOnly.js.map