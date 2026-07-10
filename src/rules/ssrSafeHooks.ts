import type { Rule } from 'eslint';
import type { MemberExpression } from 'estree';

/**
 * Tier A core rule: flags SSR-hydration-unsafe patterns — reading
 * window/document/localStorage/sessionStorage directly during render, and
 * non-deterministic render values (new Date(), Math.random()) — both cause
 * server/client output mismatches (React error #418/#421) on any SSG/SSR
 * setup (Vite SSR + prerender, Next.js, etc). Zero business logic.
 *
 * "During render" is approximated structurally: a read counts as deferred
 * (and so safe) once it is nested inside a function that is ITSELF nested
 * inside another function - i.e. two or more function boundaries between
 * the read and module scope. This covers useEffect/useLayoutEffect/
 * useSyncExternalStore callbacks, useCallback callbacks, plain inline event
 * handlers (onClick={() => ...}), and any other deferred-execution closure,
 * without needing to special-case every hook/handler name individually.
 * useMemo/useState/useReducer are the one common case that's nested but
 * still runs synchronously during render, so their callback argument is
 * explicitly excluded from the "deferred" treatment regardless of depth.
 *
 * Known limitation (accepted, not silently pretended away): a helper
 * function defined inside a component and then CALLED synchronously in the
 * render body (rather than passed as a callback) reads as "deferred" by
 * this depth heuristic even though it actually executes during render.
 * Catching that precisely needs real call-graph analysis, which is out of
 * scope for a lint rule at this size - documented here so it isn't
 * mistaken for a guarantee.
 *
 * Rewritten 2026-07-10 (Plan 011 Task 4.2/4.3) after dogfooding on
 * lts-commerce-site found the previous name-list-only check
 * (useEffect/useLayoutEffect/useSyncExternalStore ONLY) flagged an ordinary
 * async form-submit handler passed to useCallback as an SSR hydration risk
 * — it never runs during render at all, so that was a false positive, not
 * a real finding.
 */
const BROWSER_GLOBALS = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'navigator']);
const SYNC_RENDER_CALLBACK_HOOKS = new Set(['useMemo', 'useState', 'useReducer']);

// Deliberately loose/structural rather than the full Rule.Node discriminated union -
// walking .parent generically across that union produces a combinatorial type TS
// cannot assign back to itself. All that's needed here is `.type` and `.parent`.
interface MinimalNode {
  type: string;
  parent?: MinimalNode | null;
  callee?: { type: string; name?: string };
}

function isSyncRenderCallback(fn: MinimalNode): boolean {
  const parent = fn.parent;
  if (!parent || parent.type !== 'CallExpression' || !parent.callee) return false;
  return parent.callee.type === 'Identifier' && Boolean(parent.callee.name) && SYNC_RENDER_CALLBACK_HOOKS.has(parent.callee.name as string);
}

function isDeferred(node: Rule.Node): boolean {
  let current: MinimalNode | null | undefined = (node as unknown as MinimalNode).parent;
  let functionBoundariesCrossed = 0;

  while (current) {
    if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') {
      if (isSyncRenderCallback(current)) return false;
      functionBoundariesCrossed++;
      if (functionBoundariesCrossed >= 2) return true;
    }
    current = current.parent;
  }

  return false;
}

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
    return {
      Identifier(node) {
        if (!BROWSER_GLOBALS.has(node.name)) return;
        const parent = (node as unknown as { parent?: Rule.Node }).parent;
        if (parent?.type === 'MemberExpression' && (parent as unknown as MemberExpression).object !== node) return;
        if (isDeferred(node as unknown as Rule.Node)) return;
        context.report({ node: node as unknown as Rule.Node, messageId: 'browserGlobal', data: { name: node.name } });
      },
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Date' && node.arguments.length === 0) {
          if (!isDeferred(node as unknown as Rule.Node)) {
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
          if (!isDeferred(node as unknown as Rule.Node)) {
            context.report({ node: node as unknown as Rule.Node, messageId: 'nonDeterministic', data: { name: 'Math.random()' } });
          }
        }
      },
    };
  },
};

export default rule;
