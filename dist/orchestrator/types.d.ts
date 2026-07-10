export type ExitClass = 'clean' | 'failure' | 'crash';
export interface ToolResult {
    exitClass: ExitClass;
    stdout: string;
    stderr: string;
    diffPending?: boolean;
}
export interface ToolModule {
    name: string;
    phase: 0 | 1 | 2 | 3 | 4;
    mutates: boolean;
    pathSupporting: boolean;
    run(ctx: RunContext): Promise<ToolResult>;
}
export type Platform = 'generic' | 'vite';
export interface RunContext {
    cwd: string;
    path?: string;
    platform: Platform;
    ci: boolean;
    readOnly: boolean;
    aggregate: boolean;
    hasBeenRestarted: boolean;
    json: boolean;
    packageRoot: string;
}
export interface PhaseDefinition {
    number: 0 | 1 | 2 | 3 | 4;
    name: string;
    tools: string[];
    mutates: boolean;
}
//# sourceMappingURL=types.d.ts.map