import type { Rule } from "eslint";
/**
 * Tier A core rule: requires EXPORTED top-level `const` object/array data
 * literals to carry an explicit type annotation rather than relying on
 * inference. Pure TS strictness — zero business logic. Direct cross-language
 * analogue: php-qa-ci's RequireDeclareStrictTypesRule.
 *
 * SCOPE (Plan 00004 refinement): only EXPORTED consts are policed — they are the
 * module's API surface, where an inferred-and-widened type is a real hazard for
 * consumers. A NON-exported top-level const is a private implementation detail
 * (e.g. an internal zod shape `const s = { … }` consumed by `z.object(s)`, where
 * an explicit annotation would destroy the precise inference the code depends on)
 * and is left alone.
 *
 * ESCAPE (no rule option needed): `const X = { … } satisfies T` and
 * `const X = [ … ] as const` both wrap the literal in a TSSatisfiesExpression /
 * TSAsExpression, so `node.init` is no longer a bare Object/ArrayExpression and
 * the rule does not fire — the idiomatic way to be explicit WITHOUT widening.
 */
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=requireExplicitTypeAnnotations.d.ts.map