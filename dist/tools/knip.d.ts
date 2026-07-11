import type { ToolModule } from "../orchestrator/types.js";
/**
 * knip (phase2-design.md §1) - dead code / unused deps / unused exports.
 * §7 risk 3: ships with only a default single-entry-point config; the
 * consumer's real multi-entry graph (Vite client + SSR + free-standing
 * scripts) needs a project-specific tsQaConfig/knip.json override, or the
 * first dogfood run will surface false-positive noise.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=knip.d.ts.map