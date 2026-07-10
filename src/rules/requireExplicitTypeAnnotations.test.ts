import rule from './requireExplicitTypeAnnotations.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('require-explicit-type-annotations', rule, {
  valid: [
    // Object literal with an explicit annotation — the sanctioned shape.
    { code: 'const cfg: Config = {};\n' },
    // Array literal with an explicit annotation.
    { code: 'const list: readonly string[] = [];\n' },
    // Exported object literal with an explicit annotation — the exported form
    // must be held to the same standard as the local form.
    { code: 'export const cfg: Config = {};\n' },
    { code: 'export const list: readonly string[] = [];\n' },
    // Non-literal initialisers are out of scope — only object/array literals.
    { code: 'const n = 1;\n' },
    { code: 'export const n = 1;\n' },
    { code: 'const s = "text";\n' },
    // A call-expression initialiser is not an object/array literal.
    { code: 'const client = makeClient();\n' },
    // Nested (non-top-level) literals are unaffected — the rule targets only
    // the Program / ExportNamedDeclaration levels.
    { code: 'function f() {\n  const inner = {};\n  return inner;\n}\n' },
  ],
  invalid: [
    // Top-level const object literal without an annotation.
    {
      code: 'const cfg = {};\n',
      errors: [{ messageId: 'missingAnnotation' }],
    },
    // Top-level const array literal without an annotation.
    {
      code: 'const list = [];\n',
      errors: [{ messageId: 'missingAnnotation' }],
    },
    // Exported const object literal without an annotation — parses as
    // ExportNamedDeclaration > VariableDeclaration > VariableDeclarator, which
    // the direct-child Program selector alone would miss.
    {
      code: 'export const cfg = {};\n',
      errors: [{ messageId: 'missingAnnotation' }],
    },
    // Exported const array literal without an annotation.
    {
      code: 'export const list = [];\n',
      errors: [{ messageId: 'missingAnnotation' }],
    },
  ],
});
