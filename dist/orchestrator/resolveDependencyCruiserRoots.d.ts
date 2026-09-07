/**
 * Resolves the positional scan targets handed to dependency-cruiser, from
 * `tsQaConfig/ts-qa.json` (`"dependencyCruiserScanRoots": [...]`).
 *
 * depcruise requires at least one positional path. With no configuration the
 * target is `.`, the project root the tool already runs in, so scope is
 * derived from where the run happens rather than from a guessed directory
 * name; depcruise's own config bounds the graph (node_modules excluded). A
 * project that wants narrower roots (a pnpm monorepo cruising only
 * `apps/<pkg>/src`) configures them.
 *
 * A missing config file (or a config without the key) yields `["."]`. A
 * present-but-malformed value throws rather than being silently ignored
 * (mirrors resolveDisabledTools): a typo must fail loudly, never quietly
 * cruise the wrong tree or nothing.
 */
export declare function resolveDependencyCruiserRoots(
  projectRoot: string,
): string[];
//# sourceMappingURL=resolveDependencyCruiserRoots.d.ts.map
