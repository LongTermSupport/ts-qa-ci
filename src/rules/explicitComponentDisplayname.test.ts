import rule from './explicitComponentDisplayname.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

// The rule only activates for files under src/widgets, src/ui, or src/core.
const IN_SCOPE = '/repo/src/ui/Widget.tsx';
const OUT_OF_SCOPE = '/repo/src/pages/Page.tsx';

ruleTester.run('explicit-component-displayname', rule, {
  valid: [
    // Arrow-form component WITH a matching displayName assignment — the sanctioned form.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />;\nFoo.displayName = "Foo";\n',
    },
    // Function-declaration form carries an intrinsic .name — requires nothing extra.
    {
      filename: IN_SCOPE,
      code: 'export function Foo() {\n  return <div />;\n}\n',
    },
    // Non-PascalCase const is not treated as a component.
    {
      filename: IN_SCOPE,
      code: 'export const useThing = () => 1;\n',
    },
    // Same offending shape, but outside the enforced scope — rule is inactive.
    {
      filename: OUT_OF_SCOPE,
      code: 'export const Foo = () => <div />;\n',
    },
    // Function-EXPRESSION form const also counts, and is satisfied by a matching displayName.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = function () {\n  return <div />;\n};\nFoo.displayName = "Foo";\n',
    },
    // A PascalCase const whose init is neither an arrow nor a function is not a component.
    {
      filename: IN_SCOPE,
      code: 'export const Theme = { color: "red" };\n',
    },
  ],
  invalid: [
    // Arrow-form component with NO displayName assignment — the flagged case.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />;\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // A displayName assigned to a DIFFERENT value than the identifier does not count.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />;\nFoo.displayName = "Bar";\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // Function-EXPRESSION form with no displayName is flagged exactly like the arrow form.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = function () {\n  return <div />;\n};\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // A computed-key displayName is intentionally ignored — the component stays flagged.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />;\nFoo["displayName"] = "Foo";\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // A non-string-literal displayName value does not satisfy the rule.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />;\nFoo.displayName = 123;\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // An expression-valued displayName (not a literal) does not satisfy the rule.
    {
      filename: IN_SCOPE,
      code: 'const label = "Foo";\nexport const Foo = () => <div />;\nFoo.displayName = label;\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // A compound-assignment operator (`+=`) is not the `=` the rule requires.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />;\nFoo.displayName += "Foo";\n',
      errors: [{ messageId: 'missing', data: { name: 'Foo' } }],
    },
    // Multiple component consts in one export statement are each checked independently.
    {
      filename: IN_SCOPE,
      code: 'export const Foo = () => <div />,\n  Bar = () => <span />;\n',
      errors: [
        { messageId: 'missing', data: { name: 'Foo' } },
        { messageId: 'missing', data: { name: 'Bar' } },
      ],
    },
  ],
});
