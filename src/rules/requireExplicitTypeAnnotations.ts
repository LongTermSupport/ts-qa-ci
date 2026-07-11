import type { Rule } from "eslint";
import type { VariableDeclarator } from "estree";

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
const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require top-level const data literals to carry an explicit type annotation",
    },
    schema: [],
    messages: {
      missingAnnotation:
        'Top-level const "{{name}}" holds an object/array literal but has no explicit type annotation.',
    },
  },
  create(context) {
    const check = (node: VariableDeclarator): void => {
      if (node.id.type !== "Identifier") return;
      if (
        !node.init ||
        (node.init.type !== "ObjectExpression" &&
          node.init.type !== "ArrayExpression")
      )
        return;
      const hasAnnotation =
        (node.id as unknown as { typeAnnotation?: unknown }).typeAnnotation !==
        undefined;
      if (!hasAnnotation) {
        context.report({
          node: node as unknown as Rule.Node,
          messageId: "missingAnnotation",
          data: { name: node.id.name },
        });
      }
    };
    return {
      // EXPORTED top-level `const` only (`export const … ` parses as
      // ExportNamedDeclaration > VariableDeclaration > VariableDeclarator). A
      // non-exported top-level const is a private implementation detail and is
      // deliberately NOT policed (see the SCOPE note above).
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"(
        node: VariableDeclarator,
      ) {
        check(node);
      },
    };
  },
};

export default rule;
