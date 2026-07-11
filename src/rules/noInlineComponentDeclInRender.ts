import type { Rule } from "eslint";
import type { FunctionDeclaration, Node, VariableDeclarator } from "estree";

/**
 * WHY: declaring a React component inside another component's body causes
 * the inner component to be re-created on every render of the outer. React
 * sees a new component type each render → it unmounts and remounts the
 * subtree, blowing away any internal state, refs, and DOM identity. This
 * is a classic perf-and-correctness bug.
 *
 * The doctrine half: it's also the same anti-pattern as `dbf/one-component-
 * per-file` at a smaller scale — a sub-component buried inside another
 * function body is a presentation helper that nobody can find via the file
 * tree or compose elsewhere. Move it out, give it a real file, and either
 * keep it next to its consumer or graduate it to `~/ui/`.
 *
 * Rule: a `VariableDeclarator` whose `id` is a PascalCase identifier and
 * whose `init` is an `ArrowFunctionExpression` or `FunctionExpression`,
 * AND which is declared inside any enclosing function body, is reported.
 * Same for a nested `FunctionDeclaration` with a PascalCase name.
 *
 * Module-level component declarations (the normal, correct case) are not
 * flagged — they have `Program` as the enclosing scope, not another
 * function.
 *
 * Scope: enforced under `src/`. Per-call inline JSX (e.g. inside
 * `.map((x) => <Row ... />)`) is NOT flagged — those are anonymous
 * callbacks, not named component declarations.
 */
const ENFORCE_PATTERN = /\/src\//;

const FUNCTION_NODE_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

function isPascalCase(name: string): boolean {
  if (name.length === 0) return false;
  const first = name.charAt(0);
  return first !== first.toLowerCase() && first === first.toUpperCase();
}

// Walks the parent chain (ESLint augments every visited node with `.parent`)
// looking for any enclosing function scope. A module-level declaration reaches
// `Program` without passing through a function and returns false.
function isInsideFunction(node: Rule.Node): boolean {
  let cur: Rule.Node | null = node.parent;
  while (cur !== null && cur !== undefined) {
    if (FUNCTION_NODE_TYPES.has(cur.type)) return true;
    cur = cur.parent;
  }
  return false;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "React components must be declared at module scope. Declaring a component inside another component body re-creates it on every render and remounts its subtree.",
    },
    schema: [],
    messages: {
      inlineComponent:
        "Component `{{name}}` is declared inside another function body. Move it to module scope (and probably to its own file — see `dbf/one-component-per-file`). Inline component decls remount on every parent render, destroying internal state.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!ENFORCE_PATTERN.test(filename)) return {};

    return {
      VariableDeclarator(node: VariableDeclarator) {
        const id = node.id;
        if (id.type !== "Identifier") return;
        if (!isPascalCase(id.name)) return;
        const init = node.init;
        if (init === null || init === undefined) return;
        if (
          init.type !== "ArrowFunctionExpression" &&
          init.type !== "FunctionExpression"
        )
          return;
        if (!isInsideFunction(node as Node as Rule.Node)) return;
        context.report({
          node,
          messageId: "inlineComponent",
          data: { name: id.name },
        });
      },
      FunctionDeclaration(node: FunctionDeclaration) {
        if (node.id === null || node.id.type !== "Identifier") return;
        if (!isPascalCase(node.id.name)) return;
        if (!isInsideFunction(node as Node as Rule.Node)) return;
        context.report({
          node,
          messageId: "inlineComponent",
          data: { name: node.id.name },
        });
      },
    };
  },
};

export default rule;
