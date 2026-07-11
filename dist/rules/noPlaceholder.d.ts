import type { Rule } from "eslint";
/**
 * Tier A core rule: bans the literal string "PLACEHOLDER" anywhere in
 * string/template literals — repo-wide, including data files like
 * articles.ts. Fully generic, zero coupling; catches forgotten
 * placeholder content before it ships.
 */
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=noPlaceholder.d.ts.map