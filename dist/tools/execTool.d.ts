export interface ExecResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
}
/**
 * Shared subprocess runner every src/tools/*.ts module uses. Never uses a
 * shell (argv array only) - avoids shell-injection entirely since tool args
 * always come from this package's own code, never raw consumer/user input.
 */
export declare function execTool(command: string, args: string[], cwd: string): Promise<ExecResult>;
//# sourceMappingURL=execTool.d.ts.map