import rule from './jsxTruthyNarrow.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('jsx-truthy-narrow', rule, {
  valid: [
    // Explicit null-narrowing — the idiomatic correction.
    { code: 'const El = () => <div>{count != null && <Foo />}</div>;\n' },
    { code: 'const El = () => <div>{count !== null && <Foo />}</div>;\n' },
    // Comparison LHS is boolean-shaped.
    { code: 'const El = () => <div>{count > 0 && <Foo />}</div>;\n' },
    // Boolean() call is bool-ish.
    { code: 'const El = () => <div>{Boolean(count) && <Foo />}</div>;\n' },
    // `!`-prefix unary yields a boolean.
    { code: 'const El = () => <div>{!count && <Foo />}</div>;\n' },
    // `typeof` unary yields a string but is treated as boolean-shape by source.
    { code: 'const El = () => <div>{(typeof x) && <Foo />}</div>;\n' },
    // Boolean literal LHS — both `true` and `false` are boolean-shape.
    { code: 'const El = () => <div>{true && <Foo />}</div>;\n' },
    { code: 'const El = () => <div>{false && <Foo />}</div>;\n' },
    // `instanceof` / `in` are BinaryExpressions and thus boolean-shape.
    { code: 'const El = () => <div>{x instanceof Foo && <Foo />}</div>;\n' },
    { code: "const El = () => <div>{'k' in obj && <Foo />}</div>;\n" },
    // Naming-convention heuristic: every recognised boolean prefix is allowed.
    { code: 'const El = () => <div>{isOpen && <Foo />}</div>;\n' },
    { code: 'const El = () => <div>{hasItems && <Foo />}</div>;\n' },
    { code: 'const El = () => <div>{shouldRender && <Foo />}</div>;\n' },
    { code: 'const El = () => <div>{willUpdate && <Foo />}</div>;\n' },
    // Member-access with boolean-prefixed property (any depth).
    { code: 'const El = () => <div>{props.canEdit && <Foo />}</div>;\n' },
    { code: 'const El = () => <div>{state.ui.isLoading && <Foo />}</div>;\n' },
    // Ternary is not a LogicalExpression — never flagged.
    { code: 'const El = () => <div>{count ? <Foo /> : null}</div>;\n' },
    // `||` is not `&&` — out of scope.
    { code: 'const El = () => <div>{count || <Foo />}</div>;\n' },
    // Right operand of nested `&&` is boolean-shaped, so the chain passes.
    { code: 'const El = () => <div>{a && b > 0 && <Foo />}</div>;\n' },
    // Generated api-client files are exempt by path.
    {
      code: 'const El = () => <div>{count && <Foo />}</div>;\n',
      filename: '/repo/src/api-client/generated/Widget.tsx',
    },
    // Test files are exempt.
    {
      code: 'const El = () => <div>{count && <Foo />}</div>;\n',
      filename: '/repo/src/Widget.test.tsx',
    },
  ],
  invalid: [
    // Bare identifier LHS that could be a primitive count.
    {
      code: 'const El = () => <div>{count && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Property access without a boolean-prefixed name.
    {
      code: 'const El = () => <div>{props.count && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Non-Boolean call expression.
    {
      code: 'const El = () => <div>{getCount() && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Computed member access can't be introspected — flagged.
    {
      code: "const El = () => <div>{obj['count'] && <Foo />}</div>;\n",
      errors: [{ messageId: 'truthy' }],
    },
    // String-literal falsy leaks to DOM.
    {
      code: "const El = () => <div>{name && <Foo />}</div>;\n",
      errors: [{ messageId: 'truthy' }],
    },
    // Naming heuristic requires an uppercase char after the prefix: `island`
    // begins with "is" but the next char is lowercase, so it is NOT boolean.
    {
      code: 'const El = () => <div>{island && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Nested `&&` whose rightmost operand is a bare (non-boolean) identifier —
    // recursion into `.right` still resolves to a primitive, so it is flagged.
    {
      code: 'const El = () => <div>{a && count && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Call whose callee is a MemberExpression (not the identifier `Boolean`).
    {
      code: 'const El = () => <div>{foo.getCount() && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Numeric literal `0` — the canonical primitive-falsy leak.
    {
      code: 'const El = () => <div>{0 && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
    // Template literal LHS is a primitive string, not boolean-shape.
    {
      code: 'const El = () => <div>{`${x}` && <Foo />}</div>;\n',
      errors: [{ messageId: 'truthy' }],
    },
  ],
});
