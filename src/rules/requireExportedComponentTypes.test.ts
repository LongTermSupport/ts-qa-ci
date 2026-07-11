import rule from './requireExportedComponentTypes.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('require-exported-component-types', rule, {
  valid: [
    // Inline-exported Props interface — the sanctioned form.
    {
      code: 'export interface FooProps { a: number; }\n',
      filename: '/proj/src/components/Foo.tsx',
    },
    // BUG C: declared separately, exported via a program-level `export { FooProps }`.
    {
      code: 'interface FooProps { a: number; }\nexport { FooProps };\n',
      filename: '/proj/src/components/Foo.tsx',
    },
    // BUG C: exported-as an alias still satisfies the rule (local name is exported).
    {
      code: 'interface FooProps { a: number; }\nexport { FooProps as Bar };\n',
      filename: '/proj/src/components/Foo.tsx',
    },
    // A type alias exported separately is also fine.
    {
      code: 'type BarProps = { a: number };\nexport { BarProps };\n',
      filename: '/proj/src/components/Bar.tsx',
    },
    // Outside the components path — not policed at all.
    {
      code: 'interface FooProps { a: number; }\n',
      filename: '/proj/src/pages/Foo.tsx',
    },
    // Non-Props type name is ignored.
    {
      code: 'interface FooState { a: number; }\n',
      filename: '/proj/src/components/Foo.tsx',
    },
  ],
  invalid: [
    // Declared but never exported (neither inline nor via a specifier) — flagged.
    {
      code: 'interface FooProps { a: number; }\n',
      filename: '/proj/src/components/Foo.tsx',
      errors: [{ messageId: 'mustExport' }],
    },
    // Type alias, also unexported — flagged.
    {
      code: 'type BarProps = { a: number };\n',
      filename: '/proj/src/components/Bar.tsx',
      errors: [{ messageId: 'mustExport' }],
    },
  ],
});
