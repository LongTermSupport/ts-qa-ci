import type { ToolModule } from "../orchestrator/types.js";
/**
 * dependency-cruiser, run as its own standalone phase-3 step (phase2-design.md
 * §1) - NOT via eslint-plugin-dependency-cruiser, which re-cruises per file
 * inside ESLint's single-file AST pass and recreates the exact
 * structural-check-inside-behavioural-engine anti-pattern the SSoT
 * principle exists to prevent.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=dependencyCruiser.d.ts.map