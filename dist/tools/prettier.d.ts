import type { ToolModule } from "../orchestrator/types.js";
/**
 * Prettier exit-code contract (phase2-design.md §2.5, flagged as needing
 * empirical re-verification against pinned versions before shipping — see
 * §7 risk 5): --check exit 0 = clean, exit 1 = pending diff OR a parse
 * error (no separate crash code). Disambiguate via the
 * "Files that were not fixed due to errors" stdout marker, mirroring the
 * PHP CS Fixer fallback A.2 documented.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=prettier.d.ts.map
