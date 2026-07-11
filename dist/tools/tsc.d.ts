import type { ToolModule } from "../orchestrator/types.js";
/**
 * tsc --noEmit (phase2-design.md §2.5): non-mutating, always runs
 * unconditionally outside the read-only branch — there's no writable mode
 * for a type-checker.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=tsc.d.ts.map
