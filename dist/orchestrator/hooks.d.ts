import type { RunContext, ToolResult } from "./types.js";
/**
 * tsQaConfig/hookPre.ts / hookPost.ts (phase2-design.md §2.7). Pre-hook runs
 * after config resolution but before any tool executes; post-hook runs only
 * after every phase succeeds (unreached on any upstream failure - the
 * pipeline is fail-fast by default).
 */
export interface HookContext {
  phases: number[];
  platform: RunContext["platform"];
  ci: boolean;
  readOnly: boolean;
  toolResults: Record<string, ToolResult>;
}
export declare function runPreHook(
  projectRoot: string,
  ctx: HookContext,
): Promise<void>;
export declare function runPostHook(
  projectRoot: string,
  ctx: HookContext,
): Promise<void>;
//# sourceMappingURL=hooks.d.ts.map
