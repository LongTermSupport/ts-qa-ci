import type { Rule } from 'eslint';
/**
 * Tier A core rule: requires top-level `const` object/array data literals
 * to carry an explicit, imported type annotation rather than relying on
 * inference. Pure TS strictness — zero business logic. Direct cross-language
 * analogue: php-qa-ci's RequireDeclareStrictTypesRule.
 */
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=requireExplicitTypeAnnotations.d.ts.map