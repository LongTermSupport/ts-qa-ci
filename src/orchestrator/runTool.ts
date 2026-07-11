import { retryGate } from './retryGate.js';
import type { RunContext, ToolModule, ToolResult } from './types.js';

/**
 * Single-tool dispatch (phase2-design.md §2.3): the only place that
 * interprets a tool's exit code into a ToolResult and hands it to the retry
 * gate. Tool modules never talk to the retry gate or CI detection directly.
 */
export async function runTool(tool: ToolModule, ctx: RunContext): Promise<ToolResult> {
  if (tool.pathSupporting === false && ctx.path) {
    throw new Error(
      `ts-qa: ${tool.name} does not support -p/--path scoping (its config owns its own path resolution)`
    );
  }
  if (tool.mutates && ctx.readOnly) {
    // Mutating tools run in check/dry-run mode when read-only; the tool module
    // itself is responsible for choosing --check vs --write based on ctx.readOnly.
  }
  return retryGate(tool, ctx);
}
