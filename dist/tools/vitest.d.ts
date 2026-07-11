import type { ToolModule } from "../orchestrator/types.js";
/**
 * Vitest (phase2-design.md §3): peerDependency, orchestrates the consumer's
 * own configured test setup rather than shipping a default one - invokes
 * the consumer's own installed binary/config, the same relationship tsc
 * --noEmit has to the consumer's tsconfig.json.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=vitest.d.ts.map
