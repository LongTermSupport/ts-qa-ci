import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { delimiter, dirname, join, resolve } from "node:path";
/**
 * The bins ts-qa-ci spawns, mapped to the dependency that provides each — needed
 * only where the bin name differs from its package name (depcruise ← dependency-cruiser).
 */
const BIN_PROVIDER = {
  oxlint: "oxlint",
  knip: "knip",
  depcruise: "dependency-cruiser",
};
/**
 * Locate the directory of a bundled tool's package, resolving from ts-qa-ci's
 * own location so it works under EVERY install layout:
 *  - self-hosted / local install: the tool is a normal nested dependency;
 *  - npm consumer: npm hoists the tool to the consumer root, one level up from
 *    ts-qa-ci's own dir;
 *  - pnpm consumer: pnpm places ts-qa-ci and its deps as flat SIBLINGS inside the
 *    `.pnpm` virtual store, reachable two levels up from the package's real path.
 */
function findToolPackageDir(packageRoot, pkg) {
  const candidates = [join(packageRoot, "node_modules", pkg)]; // nested / self-host
  let realRoot;
  try {
    realRoot = realpathSync(packageRoot);
  } catch {
    realRoot = undefined;
  }
  if (realRoot !== undefined) {
    // `<store>/<hash>/node_modules/@scope/ts-qa-ci` → up two → the dir holding the
    // flat sibling deps (pnpm store) / the npm-hoisted consumer `node_modules`.
    candidates.push(join(realRoot, "..", "..", pkg));
  }
  try {
    const req = createRequire(join(packageRoot, "package.json"));
    candidates.push(dirname(req.resolve(join(pkg, "package.json"))));
  } catch {
    // Some tools block `package.json` in their `exports` map — fall through.
  }
  const found = candidates.find((dir) => existsSync(join(dir, "package.json")));
  if (found === undefined) {
    throw new Error(
      `ts-qa: cannot locate bundled tool "${pkg}" from ${packageRoot} — ` +
        `checked: ${candidates.join(", ")}`,
    );
  }
  return found;
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
export function bundledBin(packageRoot, name) {
  const nested = join(packageRoot, "node_modules", ".bin", name);
  if (existsSync(nested)) {
    return nested;
  }
  const pkg = BIN_PROVIDER[name] ?? name;
  const pkgDir = findToolPackageDir(packageRoot, pkg);
  const manifest = JSON.parse(
    readFileSync(join(pkgDir, "package.json"), "utf8"),
  );
  const binField = manifest.bin;
  const subpath = typeof binField === "string" ? binField : binField?.[name];
  if (typeof subpath !== "string") {
    throw new Error(
      `ts-qa: bundled tool package "${pkg}" declares no "${name}" bin`,
    );
  }
  return resolve(pkgDir, subpath);
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
  const env =
    extraPath === undefined
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
    child.on("error", (error) =>
      reject(
        new Error(`ts-qa: failed to spawn "${command}": ${error.message}`),
      ),
    );
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
//# sourceMappingURL=execTool.js.map
