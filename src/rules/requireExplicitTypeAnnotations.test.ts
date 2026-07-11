import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./requireExplicitTypeAnnotations.js";

const ruleTester = makeRuleTester();

ruleTester.run("require-explicit-type-annotations", rule, {
  valid: [
    // Exported object/array literal WITH an explicit annotation — the sanctioned shape.
    { code: "export const cfg: Config = {};\n" },
    { code: "export const list: readonly string[] = [];\n" },
    // NON-exported top-level consts are private implementation detail — NOT
    // policed (scope refinement, Plan 00004). Was previously flagged.
    { code: "const cfg = {};\n" },
    { code: "const list = [];\n" },
    // `satisfies T` / `as const` are the idiomatic "explicit without widening"
    // escapes: they wrap the literal so `init` is no longer a bare Object/Array
    // expression, so the rule does not fire even on an exported const.
    { code: "export const cfg = {} satisfies Config;\n" },
    { code: "export const list = [] as const;\n" },
    // Non-literal initialisers are out of scope — only object/array literals.
    { code: "export const n = 1;\n" },
    { code: 'export const s = "text";\n' },
    { code: "export const client = makeClient();\n" },
    // Nested (non-top-level) literals are unaffected.
    { code: "function f() {\n  const inner = {};\n  return inner;\n}\n" },
  ],
  invalid: [
    // Exported const object literal without an annotation — the API-surface hazard.
    {
      code: "export const cfg = {};\n",
      errors: [{ messageId: "missingAnnotation" }],
    },
    // Exported const array literal without an annotation.
    {
      code: "export const list = [];\n",
      errors: [{ messageId: "missingAnnotation" }],
    },
  ],
});
