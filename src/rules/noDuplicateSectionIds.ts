import type { Rule } from 'eslint';
import type { JSXAttribute, Literal } from 'estree-jsx';

/**
 * Tier A core rule: flags duplicate literal id="..." JSX attributes within
 * one file. Pure AST bookkeeping, zero business content — applies to any
 * SSG/prerendered React site (duplicate DOM ids break same-page anchors and
 * accessibility).
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow duplicate literal id="..." values on JSX elements within one file' },
    schema: [],
    messages: {
      duplicateId: 'Duplicate JSX id="{{id}}" — first used at line {{firstLine}}.',
    },
  },
  create(context) {
    const seen = new Map<string, number>();
    return {
      JSXAttribute(node: JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'id') return;
        if (!node.value || node.value.type !== 'Literal' || typeof (node.value as Literal).value !== 'string') return;

        const id = (node.value as Literal).value as string;
        const line = node.loc!.start.line;
        const firstLine = seen.get(id);
        if (firstLine !== undefined) {
          context.report({ node: node as unknown as Rule.Node, messageId: 'duplicateId', data: { id, firstLine: String(firstLine) } });
        } else {
          seen.set(id, line);
        }
      },
    };
  },
};

export default rule;
