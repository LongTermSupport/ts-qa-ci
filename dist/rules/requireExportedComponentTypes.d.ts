import type { Rule } from "eslint";
/**
 * Tier A core rule: requires *Props types declared under src/components/
 * to be exported. Generic component-library hygiene — a consumer importing
 * a component should be able to import its prop type too, not redeclare it.
 * Only the default path (src/components/) is configurable via ruleOptions.
 */
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=requireExportedComponentTypes.d.ts.map
