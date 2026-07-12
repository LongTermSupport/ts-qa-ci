export interface ExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}
/**
 * Absolute path to one of this package's OWN bundled tool binaries
 * (dependency-cruiser's `depcruise`, `knip`, `oxlint`). ts-qa-ci ships these as
 * `dependencies`, so they are NOT on the consumer's PATH and a bare `npx <tool>`
 * from the consumer root fails with "command not found".
 *
 * The bin is resolved from the tool's OWN package `bin` field (never a hard-coded
 * `.bin` path): `<packageRoot>/node_modules/.bin/<name>` does not exist natively
 * under npm (deps hoisted to the consumer root) OR pnpm (deps are flat siblings in
 * the `.pnpm` store, with no `.bin` reachable by a fixed relative path). Reading
 * the provider package's declared bin works regardless of package manager. A
 * pre-existing nested `.bin/<name>` (self-host, or a consumer-side shim) is honoured
 * as a fast path. See findToolPackageDir.
 *
 * Peer-dependency tools (eslint/prettier/tsc/vitest/playwright/stryker) stay on
 * `npx`: the consumer declares those, so they are already on the consumer's own
 * PATH / node_modules/.bin.
 */
export declare function bundledBin(packageRoot: string, name: string): string;
/**
 * Shared subprocess runner every src/tools/*.ts module uses. Never uses a
 * shell (argv array only) - avoids shell-injection entirely since tool args
 * always come from this package's own code, never raw consumer/user input.
 *
 * `extraPath`, when given, is prepended to PATH in the child's environment so a
 * spawned bundled bin can resolve its own sibling executables (see bundledBin).
 */
export declare function execTool(
  command: string,
  args: string[],
  cwd: string,
  extraPath?: string,
): Promise<ExecResult>;
//# sourceMappingURL=execTool.d.ts.map
