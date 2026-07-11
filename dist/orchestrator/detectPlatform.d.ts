import type { Platform } from "./types.js";
/**
 * Platform detection (phase2-design.md §2.4). Next.js detection is
 * architecturally reserved (next.config.* presence) but not implemented in
 * v1, per Plan 011's Non-Goals.
 */
export declare function detectPlatform(projectRoot: string): Platform;
//# sourceMappingURL=detectPlatform.d.ts.map