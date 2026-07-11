import type { Rule } from "eslint";
import type { CallExpression } from "estree";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Tier A core rule: validates React.lazy(() => import('...')) paths
 * resolve to a real file. TypeScript does not validate dynamic import()
 * paths at all — a typo here is a silent runtime 404, not a build error.
 * Completely generic; only `@/` alias resolution needs to match the
 * consumer's real tsconfig paths (configurable via ruleOptions).
 */
const EXTENSIONS: string[] = [".tsx", ".ts", ".jsx", ".js"];

function resolveImportPath(
  fromFile: string,
  importPath: string,
  aliasRoot: string | undefined,
): string | undefined {
  let basePath: string;
  if (importPath.startsWith("@/") && aliasRoot) {
    basePath = join(aliasRoot, importPath.slice(2));
  } else if (importPath.startsWith(".")) {
    basePath = resolve(dirname(fromFile), importPath);
  } else {
    return undefined; // bare package specifier - not this rule's concern
  }

  if (existsSync(basePath)) return basePath;
  for (const ext of EXTENSIONS) {
    if (existsSync(`${basePath}${ext}`)) return `${basePath}${ext}`;
    if (existsSync(join(basePath, `index${ext}`)))
      return join(basePath, `index${ext}`);
  }
  return undefined;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Validate React.lazy(() => import('...')) paths resolve to a real file",
    },
    schema: [
      {
        type: "object",
        properties: { aliasRoot: { type: "string" } },
        additionalProperties: false,
      },
    ],
    messages: {
      unresolvedImport:
        'lazy() import path "{{path}}" does not resolve to any file.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as { aliasRoot?: string };
    const aliasRoot = options.aliasRoot
      ? resolve(context.cwd, options.aliasRoot)
      : undefined;

    // Local name that `lazy` was imported under from 'react' (usually `lazy`,
    // but honour aliases like `import { lazy as reactLazy }`). Only a bare call
    // to THIS name is treated as React's lazy(), avoiding false positives on
    // unrelated helpers that happen to be called `lazy`.
    let lazyLocalName: string | undefined;

    function isLazyCallee(callee: CallExpression["callee"]): boolean {
      if (callee.type === "MemberExpression") {
        return (
          callee.object.type === "Identifier" &&
          callee.object.name === "React" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "lazy"
        );
      }
      return (
        callee.type === "Identifier" &&
        lazyLocalName !== undefined &&
        callee.name === lazyLocalName
      );
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "react") return;
        for (const spec of node.specifiers) {
          if (
            spec.type === "ImportSpecifier" &&
            spec.imported.type === "Identifier" &&
            spec.imported.name === "lazy"
          ) {
            lazyLocalName = spec.local.name;
          }
        }
      },
      CallExpression(node) {
        if (!isLazyCallee(node.callee)) return;

        const arg = node.arguments[0];
        if (
          !arg ||
          (arg.type !== "ArrowFunctionExpression" &&
            arg.type !== "FunctionExpression")
        )
          return;
        // Dynamic import() is its own ESTree node type (ImportExpression), not a
        // CallExpression with callee.type 'Import' - that was an older/non-standard
        // representation some parsers used.
        const body =
          arg.body.type === "ImportExpression" ? arg.body : undefined;
        if (!body) return;

        const pathArg = body.source;
        if (pathArg.type !== "Literal" || typeof pathArg.value !== "string")
          return;

        const resolved = resolveImportPath(
          context.filename,
          pathArg.value,
          aliasRoot,
        );
        if (!resolved) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: "unresolvedImport",
            data: { path: pathArg.value },
          });
        }
      },
    };
  },
};

export default rule;
