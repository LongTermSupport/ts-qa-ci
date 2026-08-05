import { existsSync, globSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  RunContext,
  ToolModule,
  ToolResult,
} from "../orchestrator/types.js";
import { execTool } from "./execTool.js";

/**
 * Extract the workspace member globs from a `pnpm-workspace.yaml` body.
 *
 * Deliberately a targeted line parse, NOT a full YAML dependency: ts-qa-ci ships
 * dependency-light, and the pnpm `packages:` block is a stable, simple shape. We
 * take ONLY the contiguous run of `- <glob>` list items directly under the
 * top-level `packages:` key and stop at the first line that is not such an item —
 * so a sibling key that carries its OWN list (e.g. `onlyBuiltDependencies:`) is
 * never mistaken for a package glob. Surrounding quotes and trailing `# comments`
 * on an item are stripped.
 */
export function pnpmPackageGlobs(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => /^packages:\s*(#.*)?$/.test(line));
  if (start === -1) return [];

  const globs: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const match = /^\s+-\s+(.+?)\s*$/.exec(lines[i] ?? "");
    if (!match) break; // end of the contiguous packages list
    const raw = (match[1] ?? "")
      .replace(/\s+#.*$/, "") // strip a trailing inline comment
      .trim()
      .replace(/^['"]|['"]$/g, ""); // strip surrounding quotes
    if (raw !== "") globs.push(raw);
  }
  return globs;
}

/**
 * The workspace member globs a consumer declares, from `package.json`
 * `workspaces` (npm / yarn / bun — array OR `{ packages: [] }`) or, failing that,
 * `pnpm-workspace.yaml`. Empty when the project is not a workspace.
 */
export function workspacePackageGlobs(cwd: string): string[] {
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        workspaces?: string[] | { packages?: string[] };
      };
      const ws = pkg.workspaces;
      const globs = Array.isArray(ws) ? ws : ws?.packages;
      if (globs !== undefined && globs.length > 0) return globs;
    } catch {
      // Malformed package.json — fall through to pnpm-workspace.yaml.
    }
  }

  const pnpmPath = join(cwd, "pnpm-workspace.yaml");
  if (existsSync(pnpmPath)) {
    return pnpmPackageGlobs(readFileSync(pnpmPath, "utf8"));
  }
  return [];
}

/**
 * The `tsconfig.json` paths (relative to `cwd`) to type-check when the workspace
 * root has none of its own: every declared member directory that actually carries
 * a tsconfig. Globs like `packages/*` are resolved with the dependency-free
 * `fs.globSync` (Node >= 22, already ts-qa-ci's `@types/node` floor). Deduped and
 * sorted for deterministic output ordering.
 */
export function memberTsconfigs(cwd: string): string[] {
  const found: string[] = [];
  for (const glob of workspacePackageGlobs(cwd)) {
    const dirs = /[*?[\]{}]/.test(glob) ? globSync(glob, { cwd }) : [glob];
    for (const dir of dirs) {
      const rel = join(dir, "tsconfig.json");
      if (existsSync(join(cwd, rel))) found.push(rel);
    }
  }
  return [...new Set(found)].sort();
}

function classify(exitCode: number | null): ToolResult["exitClass"] {
  return exitCode === 0 ? "clean" : "failure";
}

/**
 * tsc --noEmit (phase2-design.md §2.5): non-mutating, always runs unconditionally
 * outside the read-only branch — there's no writable mode for a type-checker.
 *
 * A bare `npx tsc --noEmit` at the consumer root only works when a `tsconfig.json`
 * lives THERE. In a pnpm/npm workspace the root has no tsconfig (the projects are
 * the members), and modern TypeScript (6.x) responds to "no inputs" by printing its
 * help banner and exiting non-zero — the tsc phase then fails for a reason that has
 * nothing to do with the code (gh #409). So: when the root has a tsconfig, run the
 * single `tsc --noEmit` as before; otherwise type-check each workspace member's own
 * tsconfig (`tsc --noEmit -p <member>`), the workspace analogue, and aggregate.
 */
const tool: ToolModule = {
  name: "tsc",
  phase: 3,
  mutates: false,
  pathSupporting: false, // tsc's scope is owned by tsconfig.json, not a CLI path arg

  async run(ctx: RunContext): Promise<ToolResult> {
    if (existsSync(join(ctx.cwd, "tsconfig.json"))) {
      const result = await execTool("npx", ["tsc", "--noEmit"], ctx.cwd);
      return {
        exitClass: classify(result.exitCode),
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    const projects = memberTsconfigs(ctx.cwd);
    if (projects.length === 0) {
      return {
        exitClass: "failure",
        stdout: "",
        stderr:
          `ts-qa tsc: no tsconfig.json at ${ctx.cwd}, and no workspace member ` +
          `tsconfig found (checked package.json "workspaces" and ` +
          `pnpm-workspace.yaml). Add a root tsconfig.json, declare workspace ` +
          `packages, or disable the tsc tool.`,
      };
    }

    const results = await Promise.all(
      projects.map((project) =>
        execTool("npx", ["tsc", "--noEmit", "-p", project], ctx.cwd),
      ),
    );

    // Clean only when EVERY member type-checks. Each member's output is labelled so
    // a failure is attributable to its package.
    const stdout = projects
      .map((project, i) => `# ${project}\n${results[i]?.stdout ?? ""}`)
      .join("\n")
      .trimEnd();
    const stderr = projects
      .map((_project, i) => results[i]?.stderr ?? "")
      .filter((text) => text !== "")
      .join("\n");
    const anyFailed = results.some((result) => result.exitCode !== 0);

    return {
      exitClass: anyFailed ? "failure" : "clean",
      stdout,
      stderr,
    };
  },
};

export default tool;
