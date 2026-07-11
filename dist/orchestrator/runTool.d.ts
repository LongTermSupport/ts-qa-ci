import type { RunContext, ToolModule, ToolResult } from "./types.js";
/**
 * Single-tool dispatch (phase2-design.md §2.3): the only place that
 * interprets a tool's exit code into a ToolResult and hands it to the retry
 * gate. Tool modules never talk to the retry gate or CI detection directly.
 */
export declare function runTool(
  tool: ToolModule,
  ctx: RunContext,
): Promise<ToolResult>;
//# sourceMappingURL=runTool.d.ts.map
