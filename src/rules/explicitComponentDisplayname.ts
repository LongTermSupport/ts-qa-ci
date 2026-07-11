import type { Rule } from "eslint";
import type {
  AssignmentExpression,
  ExportNamedDeclaration,
  Node,
} from "estree";

/**
 * Tier B rule: in React DevTools, components show their `displayName` (or fall
 * back to the underlying function `name`). In dev, V8 infers `name` from the
 * `const Foo = ...` binding, so you mostly see `Foo`. In production after
 * minification (terser/esbuild rename), the variable name is gone — every
 * arrow-form component shows as `<Anonymous>` or a single letter. That is
 * the moment you need devtools (production bug repro on a customer ticket)
 * and the moment the names disappear.
 *
 * Two acceptable forms:
 *   - `export function Foo(props) { … }` — function declarations carry an
 *     intrinsic `.name` that minifiers preserve.
 *   - `export const Foo: FC<…> = () => …` PLUS `Foo.displayName = 'Foo'`
 *     somewhere in the same file. The explicit assignment survives minification.
 *
 * Rule scope: every `ExportNamedDeclaration` of a PascalCase `const`. Each
 * such export needs either to also export a `Foo.displayName = 'Foo'`
 * assignment, or to be rewritten as a `function Foo()`. Function-declaration
 * form exports require nothing extra.
 *
 * Scope: enforced under `src/widgets/**`, `src/ui/**`, `src/core/**`.
 *
 * Limitations:
 *   - Only literal-string `Foo.displayName = 'Foo'` assignments are matched.
 *     Computed-key or expression-value assignments are ignored — pre-empts
 *     a class of "displayName is being set to undefined at runtime" bugs.
 *   - The assigned value must match the component identifier exactly.
 */
const ENFORCE_PATTERN = /\/src\/(widgets|ui|core)\//;

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name.charAt(0);
  return first !== first.toLowerCase() && first === first.toUpperCase();
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Arrow-form components (`export const Foo = () => …`) must include a `Foo.displayName = "Foo"` assignment so devtools shows the real name in production builds.',
    },
    schema: [],
    messages: {
      missing:
        'Component `{{name}}` is exported as an arrow-form const but has no matching `{{name}}.displayName = "{{name}}"` assignment. Add one in the same file, or rewrite as `export function {{name}}()`. Without it, minified production builds show `<Anonymous>` in React DevTools.',
    },
  },
  create(context) {
    const filename = context.filename;
    if (!ENFORCE_PATTERN.test(filename)) return {};

    const arrowComponentExports = new Map<string, Node>();
    const displayNameAssignments = new Set<string>();

    return {
      ExportNamedDeclaration(node: ExportNamedDeclaration) {
        const decl = node.declaration;
        if (decl?.type !== "VariableDeclaration") return;
        for (const v of decl.declarations) {
          const id = v.id;
          if (id.type !== "Identifier") continue;
          if (!isPascalCase(id.name)) continue;
          const init = v.init;
          if (
            init?.type !== "ArrowFunctionExpression" &&
            init?.type !== "FunctionExpression"
          ) {
            continue;
          }
          arrowComponentExports.set(id.name, v);
        }
      },
      AssignmentExpression(node: AssignmentExpression) {
        if (node.operator !== "=") return;
        const left = node.left;
        if (left.type !== "MemberExpression") return;
        if (left.computed) return;
        if (left.object.type !== "Identifier") return;
        if (left.property.type !== "Identifier") return;
        if (left.property.name !== "displayName") return;
        const right = node.right;
        if (right.type !== "Literal") return;
        if (typeof right.value !== "string") return;
        if (right.value !== left.object.name) return;
        displayNameAssignments.add(left.object.name);
      },
      "Program:exit"() {
        for (const [name, declaratorNode] of arrowComponentExports) {
          if (displayNameAssignments.has(name)) continue;
          context.report({
            node: declaratorNode as Rule.Node,
            messageId: "missing",
            data: { name },
          });
        }
      },
    };
  },
};

export default rule;
