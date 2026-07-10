import type { ToolResult } from './types.js';
/**
 * var/qa/ result caching (phase2-design.md §2.3). Keyed on a content hash of
 * the tool's config + input paths, so a rerun with nothing changed can skip
 * straight to the cached result instead of re-invoking the tool. Written
 * fresh for ts-qa-ci (no source available to lift from) - the shape mirrors
 * what Plan 011's research described: var/qa/<tool>/<hash>.<timestamp>.json.
 */
export interface CacheEntry {
    toolName: string;
    hash: string;
    timestamp: string;
    result: ToolResult;
}
export declare function computeCacheKey(inputs: string[]): string;
export declare function readCache(projectRoot: string, toolName: string, key: string): ToolResult | undefined;
export declare function writeCache(projectRoot: string, toolName: string, key: string, result: ToolResult): void;
//# sourceMappingURL=cache.d.ts.map