import type { Platform, ToolModule } from './types.js';
/**
 * Tool-resolution cascade (phase2-design.md §2.4): project override (full
 * replacement) -> platform-specific implementation -> generic implementation.
 * Unlike resolveEslintConfig.ts, this IS a plain first-match-wins cascade -
 * a consumer replacing an entire tool module is a legitimate, no-guarantee-
 * bypassing choice (they own the consequences of a bad replacement).
 */
export declare function resolveToolModule(projectRoot: string, platform: Platform, packageRoot: string, toolName: string): Promise<ToolModule>;
//# sourceMappingURL=resolveToolModule.d.ts.map