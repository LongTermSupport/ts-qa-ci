import type { Rule } from "eslint";
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
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=requireErrorCause.d.ts.map