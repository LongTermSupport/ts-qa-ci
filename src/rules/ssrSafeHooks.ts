import type { Rule } from 'eslint';
import type { MemberExpression } from 'estree';

/**
 * Tier A core rule: flags SSR-hydration-unsafe patterns — reading
 * window/document/localStorage/sessionStorage directly during render, and
 * non-deterministic render values (new Date(), Math.random()) — both cause
 * server/client output mismatches (React error #418/#421) on any SSG/SSR
 * setup (Vite SSR + prerender, Next.js, etc). Zero business logic.
 */
const BROWSER_GLOBALS = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'navigator']);

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow SSR-hydration-unsafe browser-global reads and non-deterministic values during render' },
    schema: [],
    messages: {
      browserGlobal:
        '"{{name}}" is a browser global read during render — unsafe under SSR/SSG. Read it inside useEffect/useSyncExternalStore instead.',
      nonDeterministic: '"{{name}}" produces a different value on server vs client render — causes hydration mismatches.',
    },
  },
  create(context) {
    function isInsideEffectOrHandler(node: Rule.Node): boolean {
      let current: Rule.Node | null = node;
      while (current) {
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'Identifier' &&
          ['useEffect', 'useLayoutEffect', 'useSyncExternalStore'].includes(current.callee.name)
        ) {
          return true;
        }
        if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') {
          // Stop climbing at the nearest function boundary that isn't a hook callback -
          // conservative: only exempt when we actually found a hook call above.
        }
        current = current.parent ?? null;
      }
      return false;
    }

    return {
      Identifier(node) {
        if (!BROWSER_GLOBALS.has(node.name)) return;
        const parent = (node as unknown as { parent?: Rule.Node }).parent;
        if (parent?.type === 'MemberExpression' && (parent as unknown as MemberExpression).object !== node) return;
        if (isInsideEffectOrHandler(node as unknown as Rule.Node)) return;
        context.report({ node: node as unknown as Rule.Node, messageId: 'browserGlobal', data: { name: node.name } });
      },
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Date' && node.arguments.length === 0) {
          if (!isInsideEffectOrHandler(node as unknown as Rule.Node)) {
            context.report({ node: node as unknown as Rule.Node, messageId: 'nonDeterministic', data: { name: 'new Date()' } });
          }
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Math' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'random'
        ) {
          if (!isInsideEffectOrHandler(node as unknown as Rule.Node)) {
            context.report({ node: node as unknown as Rule.Node, messageId: 'nonDeterministic', data: { name: 'Math.random()' } });
          }
        }
      },
    };
  },
};

export default rule;
