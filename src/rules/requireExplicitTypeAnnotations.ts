import type { Rule } from 'eslint';
import type { VariableDeclarator } from 'estree';

/**
 * Tier A core rule: requires top-level `const` object/array data literals
 * to carry an explicit, imported type annotation rather than relying on
 * inference. Pure TS strictness — zero business logic. Direct cross-language
 * analogue: php-qa-ci's RequireDeclareStrictTypesRule.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require top-level const data literals to carry an explicit type annotation' },
    schema: [],
    messages: {
      missingAnnotation: 'Top-level const "{{name}}" holds an object/array literal but has no explicit type annotation.',
    },
  },
  create(context) {
    const check = (node: VariableDeclarator): void => {
      if (node.id.type !== 'Identifier') return;
      if (!node.init || (node.init.type !== 'ObjectExpression' && node.init.type !== 'ArrayExpression')) return;
      const hasAnnotation = (node.id as unknown as { typeAnnotation?: unknown }).typeAnnotation !== undefined;
      if (!hasAnnotation) {
        context.report({ node: node as unknown as Rule.Node, messageId: 'missingAnnotation', data: { name: node.id.name } });
      }
    };
    return {
      // Top-level `const` (`Program > ...`) and its exported form
      // (`export const ...` parses as ExportNamedDeclaration > VariableDeclaration
      // > VariableDeclarator) must both be covered — exported data literals are
      // the ones most likely to need an explicit type.
      ':matches(Program, ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator'(
        node: VariableDeclarator,
      ) {
        check(node);
      },
    };
  },
};

export default rule;
