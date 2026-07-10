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
    // Boolean literal LHS.
    { code: 'const El = () => <div>{true && <Foo />}</div>;\n' },
    // Naming-convention heuristic: `is*` identifier treated as boolean.
    { code: 'const El = () => <div>{isOpen && <Foo />}</div>;\n' },
    // Member-access with boolean-prefixed property.
    { code: 'const El = () => <div>{props.canEdit && <Foo />}</div>;\n' },
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
  ],
});
