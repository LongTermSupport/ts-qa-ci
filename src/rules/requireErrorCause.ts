import type { Rule } from 'eslint';
import type { CatchClause, NewExpression, ThrowStatement } from 'estree';

/**
 * Tier A core rule: throwing a `new Error` inside a catch block without
 * `{ cause: original }` silently destroys the original stack. The debugger
 * sees only the rethrow site; the actual failure point is gone.
 *
 * Bad:
 *   try { ... }
 *   catch (e) { throw new Error('lookup failed'); }
 *
 * Good:
 *   try { ... }
 *   catch (e) { throw new Error('lookup failed', { cause: e }); }
 *
 * Previously this rule whitelisted custom Error subclasses (anything not
 * named `Error|TypeError|RangeError|SyntaxError|ReferenceError`). That
 * exempted exactly the typed-error hierarchy in `~/core/errors.ts`
 * (`ApiError`, `AuthError`, `ValidationError`, `BallicomError`) — the
 * classes CLAUDE.md §Patterns tells us to use everywhere. Now flagged:
 * any `new X` whose callee identifier ends in `Error` and is thrown
 * inside a catch must pass `{ cause: ... }`. Plan 025 Phase 1.1.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'New Error throws inside catch blocks must pass { cause: <caught-var> }.',
    },
    schema: [],
    messages: {
      missing:
        '`throw new Error(...)` inside a catch must pass `{ cause: <caught-var> }` as 2nd arg, otherwise the original error context is lost.',
    },
  },
  create(context) {
    // Stack of catch-param names (or null for a param-less catch). Tracking the
    // name is not currently used by the report — we only need to know whether we
    // are inside a catch at all — but is retained to mirror the source rule's
    // logic and to leave room for a future "cause must reference the caught var"
    // tightening.
    const catchStack: Array<string | null> = [];
    return {
      CatchClause(node: CatchClause) {
        const paramName = node.param?.type === 'Identifier' ? node.param.name : null;
        catchStack.push(paramName);
      },
      'CatchClause:exit'() {
        catchStack.pop();
      },
      ThrowStatement(node: ThrowStatement) {
        if (catchStack.length === 0) return;
        const arg = node.argument;
        if (!arg || arg.type !== 'NewExpression') return;
        // Police any constructor whose identifier ends in `Error`. Built-in
        // (`Error`, `TypeError`, ...) AND custom (`ApiError`, `AuthError`,
        // `ValidationError`, `BallicomError`) — both must thread `cause`
        // when thrown from a catch. Custom error classes have varied
        // signatures so we don't assume `options` is at a fixed position;
        // we look for ANY argument that's an ObjectExpression containing a
        // `cause` property.
        const newExpr = arg as NewExpression;
        const callee = newExpr.callee;
        if (callee.type !== 'Identifier' || !/Error$/.test(callee.name)) return;

        const hasCauseArg = newExpr.arguments.some(
          (a) =>
            a.type === 'ObjectExpression' &&
            a.properties.some(
              (p) =>
                p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'cause',
            ),
        );
        if (!hasCauseArg) {
          context.report({ node: arg as Rule.Node, messageId: 'missing' });
        }
      },
    };
  },
};

export default rule;
