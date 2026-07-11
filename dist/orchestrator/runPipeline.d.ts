import { type PhaseResult } from './runPhase.js';
export interface PipelineOptions {
    cwd: string;
    packageRoot: string;
    path?: string;
    onlyPhase?: 0 | 1 | 2 | 3 | 4;
    /** `-t <tool>` — bypass phase grouping entirely and run just this one tool. */
    tool?: string;
    forceWrite?: boolean;
    forceReadOnly?: boolean;
    aggregate?: boolean;
    json?: boolean;
    /** `--llm`: compact stdout summary + full result persisted to a cache file (bin/ts-qa.js). */
    llm?: boolean;
    /** Tool names to skip this run (CLI `--skip`), merged with tsQaConfig/ts-qa.json `disabledTools`. */
    skipTools?: string[];
}
export interface PipelineResult {
    phases: PhaseResult[];
    success: boolean;
    hasBeenRestarted: boolean;
}
/**
 * Top-level phase-ladder driver (phase2-design.md §2.2/§2.3): mutate -> lint
 * -> analyse -> test. Fail-fast across phases too - a Phase 1 failure stops
 * the whole run rather than proceeding to lint code that couldn't be fixed.
 */
export declare function runPipeline(options: PipelineOptions): Promise<PipelineResult>;
//# sourceMappingURL=runPipeline.d.ts.map