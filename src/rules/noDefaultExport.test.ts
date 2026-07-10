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
    // Carve-out also covers the [cm]? extension alternatives the regex allows.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/index.mts',
    },
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/index.cts',
    },
    // Known syntactic limitation — matches the dbf original verbatim: the rule
    // only visits ExportDefaultDeclaration, so `export { x as default }` (an
    // ExportNamedDeclaration specifier) is NOT flagged. Kept as valid to pin
    // the port to equal behaviour; catching it would require named-specifier
    // handling the original never had.
    { code: 'const foo = 1;\nexport { foo as default };\n' },
    // Re-export default form is likewise an ExportNamedDeclaration — not flagged.
    { code: "export { default } from './other.js';\n" },
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
    // Class and bare-expression default forms are ExportDefaultDeclaration too.
    {
      code: 'export default class Foo {}\n',
      errors: [{ messageId: 'default' }],
    },
    {
      code: 'export default 42;\n',
      errors: [{ messageId: 'default' }],
    },
    {
      code: 'export default (() => 1);\n',
      errors: [{ messageId: 'default' }],
    },
    // A non-widget index.ts gets no carve-out — the exemption is widget-scoped only.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/components/cart/index.ts',
      errors: [{ messageId: 'default' }],
    },
    // Widget dir but NOT the index entry — the carve-out is index-only, so a
    // sibling module still gets flagged.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/mount.ts',
      errors: [{ messageId: 'default' }],
    },
    // Widget dir but nested one level below index — the regex's [^/]+ allows a
    // single widget-name segment only, so a deeper index is NOT exempt.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/sub/index.ts',
      errors: [{ messageId: 'default' }],
    },
    // A plain .js widget index is NOT covered — the regex requires a `ts`/`tsx`
    // (optionally c/m-prefixed) extension, so `.js` still gets flagged.
    {
      code: 'export default function mount() {}\n',
      filename: '/repo/src/widgets/cart/index.js',
      errors: [{ messageId: 'default' }],
    },
    // No default export at all in a non-widget file: sanity that named exports
    // alongside code stay clean is covered in `valid`; here confirm a default
    // in a deeply-nested non-widget path is flagged.
    {
      code: 'export default foo;\n',
      filename: '/repo/src/lib/util/index.ts',
      errors: [{ messageId: 'default' }],
    },
  ],
});
