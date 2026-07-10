import type { Rule } from 'eslint';

/**
 * Tier A core rule.
 *
 * WHY: `document.querySelectorAll<HTMLElement>('.foo')` is an `as` cast
 * in disguise. The runtime returns `NodeListOf<Element>` and TypeScript
 * uses the generic argument as a typing-lie narrow — no `instanceof`
 * check actually runs. If the selector matches an `<svg>`, an XHTML
 * element, or anything that isn't `HTMLElement`, the code downstream
 * accesses `.dataset` / `.style` on a non-HTMLElement and either fails
 * at runtime or silently misbehaves.
 *
 * Plan 025 audit (§1.2 + §3.5) found two sites: `loader.ts:121`
 * (`querySelectorAll<HTMLElement>('[data-bw-widget]')`) and
 * `Widget.tsx:25` (`querySelectorAll<HTMLLIElement>('li')`).
 *
 * The fix is a runtime `instanceof` filter:
 *
 *   Array.from(root.querySelectorAll('.foo')).filter(
 *     (el): el is HTMLElement => el instanceof HTMLElement,
 *   )
 *
 * `no-as-cast` doesn't cover this shape — `querySelectorAll<T>(...)`
 * is a `TSCallExpression` with `typeArguments`, not a `TSAsExpression`.
 * Sibling rule, kept separate.
 *
 * This is a purely SYNTACTIC check (it inspects the call's explicit
 * type-argument list on the AST); it needs no type information, so it
 * ports faithfully to ts-qa-ci's non-type-aware rule convention.
 */

// Minimal shapes for the TypeScript-flavoured call-expression node this rule
// inspects. @typescript-eslint/parser exposes the explicit type-argument list
// as `typeArguments` (a `TSTypeParameterInstantiation`) on the CallExpression —
// a property the base ESTree CallExpression type does not carry.
interface Identifier {
  type: 'Identifier';
  name: string;
}
interface MemberExpressionNode {
  type: 'MemberExpression';
  property: Identifier | { type: string };
}
interface TypeParameterInstantiationNode {
  type: 'TSTypeParameterInstantiation';
  params: unknown[];
}
interface CallExpressionNode {
  callee: MemberExpressionNode | { type: string };
  typeArguments?: TypeParameterInstantiationNode | { type: string } | null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow explicit type arguments on querySelector/querySelectorAll; use a runtime instanceof filter.',
    },
    schema: [],
    messages: {
      typed:
        '`{{name}}<T>(...)` is an unchecked cast — the runtime returns whatever matches the CSS selector, not necessarily a T. Filter with `instanceof` after, e.g. `Array.from(...).filter((el): el is HTMLElement => el instanceof HTMLElement)`.',
    },
  },
  create(context) {
    const filename = context.filename;
    if (filename.includes('/src/api-client/generated/')) return {};
    if (/\.test\.[cm]?[jt]sx?$/.test(filename)) return {};

    return {
      CallExpression(node) {
        const call = node as unknown as CallExpressionNode;
        const callee = call.callee;
        if (callee.type !== 'MemberExpression') return;
        const member = callee as MemberExpressionNode;
        if (member.property.type !== 'Identifier') return;
        const name = (member.property as Identifier).name;
        if (name !== 'querySelector' && name !== 'querySelectorAll') return;
        // typescript-eslint exposes the type-argument list as
        // `typeArguments` on the CallExpression node.
        const args = call.typeArguments;
        if (args === undefined || args === null) return;
        if (args.type !== 'TSTypeParameterInstantiation') return;
        if ((args as TypeParameterInstantiationNode).params.length === 0) return;
        context.report({ node, messageId: 'typed', data: { name } });
      },
    };
  },
};

export default rule;
