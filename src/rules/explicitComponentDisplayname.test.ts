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
  ],
});
