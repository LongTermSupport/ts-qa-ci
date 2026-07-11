import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
/**
 * Absolute path to one of this package's OWN bundled tool binaries
 * (dependency-cruiser's `depcruise`, `knip`, `oxlint`). ts-qa-ci ships these as
 * `dependencies`, so under pnpm's isolated node_modules they are NOT linked into
 * the CONSUMER's top-level `.bin` and are unreachable via `npx <tool>` or a bare
 * PATH lookup from the consumer root — a bare `npx oxlint` there fails with
 * "command not found". (This is the sibling of the CLI-symlink bug: both broke
 * every pnpm consumer while the un-symlinked self-host masked them.) The bins
 * ARE linked into ts-qa-ci's own `<packageRoot>/node_modules/.bin`, so spawning
 * that absolute path — and prepending its dir to PATH for any nested lookups —
 * works regardless of the consumer's package manager or hoisting layout.
 *
 * Peer-dependency tools (eslint/prettier/tsc/vitest/playwright/stryker) stay on
 * `npx`: the consumer declares those, so they are already on the consumer's own
 * PATH / node_modules/.bin.
 */
export function bundledBin(packageRoot, name) {
    return join(packageRoot, "node_modules", ".bin", name);
}
/**
 * Shared subprocess runner every src/tools/*.ts module uses. Never uses a
 * shell (argv array only) - avoids shell-injection entirely since tool args
 * always come from this package's own code, never raw consumer/user input.
 *
 * `extraPath`, when given, is prepended to PATH in the child's environment so a
 * spawned bundled bin can resolve its own sibling executables (see bundledBin).
 */
export function execTool(command, args, cwd, extraPath) {
    const env = extraPath === undefined
        ? process.env
        : {
            ...process.env,
            PATH: `${extraPath}${delimiter}${process.env.PATH ?? ""}`,
        };
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd, shell: false, env });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
        child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
        child.on("error", (error) => reject(new Error(`ts-qa: failed to spawn "${command}": ${error.message}`)));
        child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
    });
}
//# sourceMappingURL=execTool.js.map