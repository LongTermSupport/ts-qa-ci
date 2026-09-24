import type { Rule } from "eslint";
import type {
  ExportAllDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
  ImportExpression,
  Node,
} from "estree";

/**
 * WHY: shipped source must never depend on dev-only source. A test helper,
 * an MSW fixture, a Storybook story or anything under a dev-only source tree
 * (the TypeScript equivalent of a PHP dev autoloader — `src-dev/` by default)
 * is written to the standards of demo/test code, is not covered by the
 * shipped-app lint posture (the non-app surfaces turn the CDD doctrine off),
 * and must not reach a production bundle. One stray import is enough to pull
 * a fixture, a mock server or fake data into the build, and the bundler will
 * not complain — it only ever follows the import graph.
 *
 * The rule is purely syntactic. It looks at the IMPORTER's filename to decide
 * whether it is shipped source, and at the IMPORTED specifier's text to decide
 * whether it names dev-only source:
 *
 *   - by alias   : `~dev/...`, `~tests/...` (configurable `devAliases`)
 *   - by dir     : any path segment equal to a `devSourceDirs` entry
 *                  (default `src-dev`, `tests`, `__tests__`)
 *   - by suffix  : a module whose basename is `*.test`, `*.spec`, `*.stories`
 *
 * A file that is itself dev-only (a test, a story, or one living under a
 * dev-only dir) is never policed, and neither is anything outside `src/`
 * (config, tooling, a Storybook `.storybook/` dir) — those are allowed to
 * reach into dev-only source, that is what it exists for.
 */
const DEFAULT_DEV_ALIASES: string[] = ["~dev", "~tests"];
const DEFAULT_DEV_SOURCE_DIRS: string[] = ["src-dev", "tests", "__tests__"];
const DEFAULT_SRC_MARKER = "/src/";
const DEV_MODULE_SUFFIX = /\.(test|spec|stories)(\.[cm]?[jt]sx?)?$/;

interface RuleOptions {
  devAliases?: string[];
  devSourceDirs?: string[];
  srcMarker?: string;
}

const isDevOnlyFile = (filename: string, devSourceDirs: readonly string[]): boolean => {
  const segments = filename.split("/");
  if (segments.some((segment) => devSourceDirs.includes(segment))) return true;
  const basename = segments[segments.length - 1] ?? "";
  return DEV_MODULE_SUFFIX.test(basename);
};

const isDevOnlySpecifier = (
  specifier: string,
  devAliases: readonly string[],
  devSourceDirs: readonly string[],
): boolean => {
  if (devAliases.some((alias) => specifier === alias || specifier.startsWith(`${alias}/`))) {
    return true;
  }
  // Only a path import (relative or aliased) can name a dev-only dir. A bare
  // package specifier (`msw`, `@scope/pkg/tests`) is a dependency, not a path.
  const isPath = specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("~");
  if (!isPath) return false;
  return isDevOnlyFile(specifier, devSourceDirs);
};

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow shipped source (src/**) importing dev-only source: tests, stories, test helpers, or a dev-only source tree such as src-dev/.",
    },
    schema: [
      {
        type: "object",
        properties: {
          devAliases: { type: "array", items: { type: "string" } },
          devSourceDirs: { type: "array", items: { type: "string" } },
          srcMarker: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      devOnly:
        'Shipped source imports dev-only module "{{source}}". Tests, stories, fixtures and the dev-only source tree must not reach the production import graph — move the shared piece into src/, or move this file out of it.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const devAliases = options.devAliases ?? DEFAULT_DEV_ALIASES;
    const devSourceDirs = options.devSourceDirs ?? DEFAULT_DEV_SOURCE_DIRS;
    const srcMarker = options.srcMarker ?? DEFAULT_SRC_MARKER;

    const filename = context.filename;
    if (!filename.includes(srcMarker) || isDevOnlyFile(filename, devSourceDirs)) {
      return {};
    }

    const check = (sourceNode: Node | null | undefined): void => {
      if (sourceNode === null || sourceNode === undefined || sourceNode.type !== "Literal") return;
      const specifier = sourceNode.value;
      if (typeof specifier !== "string") return;
      if (!isDevOnlySpecifier(specifier, devAliases, devSourceDirs)) return;
      context.report({ node: sourceNode, messageId: "devOnly", data: { source: specifier } });
    };

    return {
      ImportDeclaration(node: ImportDeclaration) {
        check(node.source);
      },
      ExportNamedDeclaration(node: ExportNamedDeclaration) {
        check(node.source);
      },
      ExportAllDeclaration(node: ExportAllDeclaration) {
        check(node.source);
      },
      ImportExpression(node: ImportExpression) {
        check(node.source);
      },
    };
  },
};

export default rule;
