import type { ToolModule } from "../orchestrator/types.js";
/**
 * ESLint Phase 1 pass (phase2-design.md §2.2): --fix locally, --fix-dry-run
 * + diff-check in CI. Exit 0 = clean, exit 1 = problems found (retryable
 * failure), exit 2 = fatal config/crash (never retry).
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=eslintFix.d.ts.map