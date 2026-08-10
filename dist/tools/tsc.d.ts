import type { ToolModule } from "../orchestrator/types.js";
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
export declare function pnpmPackageGlobs(yaml: string): string[];
/**
 * The workspace member globs a consumer declares, from `package.json`
 * `workspaces` (npm / yarn / bun — array OR `{ packages: [] }`) or, failing that,
 * `pnpm-workspace.yaml`. Empty when the project is not a workspace.
 */
export declare function workspacePackageGlobs(cwd: string): string[];
/**
 * The `tsconfig.json` paths (relative to `cwd`) to type-check when the workspace
 * root has none of its own: every declared member directory that actually carries
 * a tsconfig. Globs like `packages/*` are resolved with the dependency-free
 * `fs.globSync` (Node >= 22, already ts-qa-ci's `@types/node` floor). Deduped and
 * sorted for deterministic output ordering.
 */
export declare function memberTsconfigs(cwd: string): string[];
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
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=tsc.d.ts.map
