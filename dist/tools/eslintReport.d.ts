import type { ToolModule } from "../orchestrator/types.js";
/**
 * ESLint Phase 2 pass (phase2-design.md §2.2): pure report pass over
 * whatever the Phase 1 --fix pass could not resolve, including the CDD
 * tier. Never mutates - runs the same rules with no --fix flag at all.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=eslintReport.d.ts.map
