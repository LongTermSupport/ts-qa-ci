import type { Rule } from 'eslint';

/**
 * Tier B (opt-in CDD): bans arbitrary/inline className string literals
 * outside a component's internal variant-to-class mapping. Presupposes a
 * CVA + tailwind-merge + clsx catalogue (Decision 4/Task 4.6) — enabling
 * before that catalogue exists would fail everywhere with no fix path, so
 * this rule stays opt-in until a consumer confirms the catalogue is in
 * place (matches phase2-design.md §4.1's Tier B framing).
 *
 * v1 mechanism: flag any `className="..."` JSX attribute whose value is a
 * plain string/template literal (not a call to an allowlisted
 * variant-resolver function like cva()/cn()/clsx()). Consumers configure
 * variantResolverNames to match their own catalogue's helper names.
 */
interface RuleOptions {
  variantResolverNames?: string[];
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow arbitrary className string/template literals outside a variant-resolver call (Tier B, opt-in CDD)',
    },
    schema: [
      {
        type: 'object',
        properties: { variantResolverNames: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      adHocClassname:
        'className is a raw string literal, not a variant-resolver call ({{resolvers}}). Route styling through the component variant-prop catalogue instead.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const resolvers = options.variantResolverNames ?? ['cva', 'cn', 'clsx', 'twMerge'];

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'className') return;
        if (!node.value) return;

        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          context.report({ node: node as unknown as Rule.Node, messageId: 'adHocClassname', data: { resolvers: resolvers.join('/') } });
          return;
        }

        if (node.value.type === 'JSXExpressionContainer') {
          const expr = node.value.expression;
          if (expr.type === 'TemplateLiteral') {
            context.report({ node: node as unknown as Rule.Node, messageId: 'adHocClassname', data: { resolvers: resolvers.join('/') } });
            return;
          }
          if (expr.type === 'CallExpression' && expr.callee.type === 'Identifier' && resolvers.includes(expr.callee.name)) {
            return; // sanctioned variant-resolver call
          }
        }
      },
    };
  },
};

export default rule;
