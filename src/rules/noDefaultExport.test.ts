import rule from './noDefaultExport.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('no-default-export', rule, {
  valid: [
    // Named exports are the sanctioned shape — renames propagate through import sites.
    { code: 'export const foo = 1;\n' },
    { code: 'export function foo() {}\n' },
    { code: 'const foo = 1;\nexport { foo };\n' },
    // No exports at all — nothing to flag.
    { code: 'const x = 1;\n' },
    // Widget mount carve-out: widgets MUST default-export their mount fn for the
    // wedge loader (import(path).then(m => m.default)). Path-based exemption.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/index.ts',
    },
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/index.tsx',
    },
  ],
  invalid: [
    {
      code: 'export default function foo() {}\n',
      errors: [{ messageId: 'default' }],
    },
    {
      code: 'const foo = 1;\nexport default foo;\n',
      errors: [{ messageId: 'default' }],
    },
    {
      code: 'export default { a: 1 };\n',
      errors: [{ messageId: 'default' }],
    },
    // A non-widget index.ts gets no carve-out — the exemption is widget-scoped only.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/components/cart/index.ts',
      errors: [{ messageId: 'default' }],
    },
  ],
});
