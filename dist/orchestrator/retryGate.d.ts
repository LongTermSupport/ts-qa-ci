import type { RunContext, ToolModule, ToolResult } from "./types.js";
/**
 * CI-vs-interactive retry gate (phase2-design.md §2.6). Never retries a
 * crash. In CI, fails fast with no prompt (unless --aggregate, handled by the
 * caller). Interactively, offers a retry loop and flags hasBeenRestarted so
 * the end-of-run warning fires ("re-run the whole pipeline to be sure").
 */
export declare function retryGate(tool: ToolModule, ctx: RunContext): Promise<ToolResult>;
export declare const RESTART_WARNING = "RAN WITH RETRIES \u2014 re-run the whole pipeline to be sure everything is fine (a retried tool does not re-validate phases that already passed before the fix).";
//# sourceMappingURL=retryGate.d.ts.map