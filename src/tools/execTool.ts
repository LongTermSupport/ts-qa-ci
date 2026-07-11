import { spawn } from 'node:child_process';

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
export function execTool(command: string, args: string[], cwd: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (error: Error) =>
      reject(new Error(`ts-qa: failed to spawn "${command}": ${error.message}`))
    );
    child.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
