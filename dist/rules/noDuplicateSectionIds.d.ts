import type { Rule } from "eslint";
/**
 * Tier A core rule: flags duplicate literal id="..." JSX attributes within
 * one file. Pure AST bookkeeping, zero business content — applies to any
 * SSG/prerendered React site (duplicate DOM ids break same-page anchors and
 * accessibility).
 */
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=noDuplicateSectionIds.d.ts.map
