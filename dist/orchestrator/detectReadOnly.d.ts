/**
 * The CI / read-only duality (Plan 011 phase2-design.md §2.5), ported 1:1 from
 * php-qa-ci's detectReadOnly()/qaReadOnly split. Two independent booleans, set
 * by different signals - CLAUDECODE/non-TTY deliberately does NOT affect
 * TSQA_READONLY, only TSQA_CI, so a Claude Code session stays writable.
 */
export declare function detectCi(env: NodeJS.ProcessEnv, stdinIsTTY: boolean, stdoutIsTTY: boolean): boolean;
export declare function detectReadOnly(env: NodeJS.ProcessEnv): boolean;
//# sourceMappingURL=detectReadOnly.d.ts.map