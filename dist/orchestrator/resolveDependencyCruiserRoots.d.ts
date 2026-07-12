/**
 * Resolves the positional scan targets handed to dependency-cruiser, from
 * `tsQaConfig/ts-qa.json` (`"dependencyCruiserScanRoots": [...]`).
 *
 * depcruise requires at least one positional path. ts-qa historically
 * hardcoded `src`, which fails `Can't open 'src'` on any repo that does not
 * keep all sources under a single top-level ./src — notably a pnpm monorepo
 * whose packages live under `apps/<pkg>/src`, `packages/<pkg>/src`. Making the
 * targets configurable lets such a layout cruise its real source dirs while
 * single-package repos keep the historical default with no config at all.
 *
 * A missing config file (or a config without the key) yields the default
 * `["src"]`. A present-but-malformed value throws rather than being silently
 * ignored (mirrors resolveDisabledTools): a typo must fail loudly, never
 * quietly cruise the wrong tree or nothing.
 */
export declare function resolveDependencyCruiserRoots(projectRoot: string): string[];
//# sourceMappingURL=resolveDependencyCruiserRoots.d.ts.map