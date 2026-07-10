import rule from './noClassnamePublicProp.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('no-classname-public-prop', rule, {
  valid: [
    // No className member — allowed.
    {
      code: 'interface FooProps { variant: string; size: number; }\n',
      filename: '/proj/src/ui/Foo.tsx',
    },
    // className declared out of scope — not policed.
    {
      code: 'interface FooProps { className?: string; }\n',
      filename: '/proj/lib/Foo.ts',
    },
    // A prop merely containing the substring is not `className`.
    {
      code: 'interface FooProps { classNames?: string[]; }\n',
      filename: '/proj/src/ui/Foo.tsx',
    },
    // Custom scopeGlobs: file not under the configured scope → not policed.
    {
      code: 'interface FooProps { className?: string; }\n',
      filename: '/proj/src/ui/Foo.tsx',
      options: [{ scopeGlobs: ['packages/'] }],
    },
    // Anchoring: `adsrc/` must NOT satisfy the default `src/` scope.
    {
      code: 'interface FooProps { className?: string; }\n',
      filename: '/proj/adsrc/Foo.tsx',
    },
  ],
  invalid: [
    // Interface member — flagged.
    {
      code: 'interface FooProps { className?: string; }\n',
      filename: '/proj/src/ui/Foo.tsx',
      errors: [{ messageId: 'classNameDeclared' }],
    },
    // Inline type-literal member (also a TSPropertySignature) — flagged.
    {
      code: 'type FooProps = { className?: string; variant: string };\n',
      filename: '/proj/src/ui/Foo.tsx',
      errors: [{ messageId: 'classNameDeclared' }],
    },
    // String-literal key — flagged.
    {
      code: "interface FooProps { 'className': string; }\n",
      filename: '/proj/src/ui/Foo.tsx',
      errors: [{ messageId: 'classNameDeclared' }],
    },
    // Custom scopeGlobs matching the file → policed, flagged.
    {
      code: 'interface FooProps { className?: string; }\n',
      filename: '/proj/packages/ui/Foo.tsx',
      options: [{ scopeGlobs: ['packages/'] }],
      errors: [{ messageId: 'classNameDeclared' }],
    },
  ],
});
