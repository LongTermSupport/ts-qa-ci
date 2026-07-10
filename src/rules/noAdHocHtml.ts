import { basename, extname } from 'node:path';
import type { Rule } from 'eslint';
import type { JSXElement, JSXOpeningElement } from 'estree-jsx';

/**
 * Tier A core rule (CDD flagship): bans raw HTML elements in .tsx JSX
 * outside designated component-definition files. Component-Driven
 * Development's central enforcement point — ad hoc <div>/<span>/<button>
 * soup in a page or page-composing component is banned; only imported,
 * PascalCase custom components are allowed there.
 *
 * Two exemption models, selected by config:
 *
 * 1. Component-definition model (DEFAULT, backwards-compatible). A file counts
 *    as "component-defining" (and so exempt) when ANY of its top-level exports —
 *    default or named — has an identifier matching the filename (extension
 *    stripped). This is the original lts-commerce-site behaviour (Plan 011): a
 *    default-export-only check would exempt zero files in a repo that uses
 *    `export function Foo()` / `export const Foo = ...`, flagging every
 *    component's own internal JSX (an infinite regress — Container.tsx's own
 *    <div> would need "a typed component instead").
 *
 * 2. Allowlist-dir model (opt-in via `uiDirs`). Raw HTML/SVG is legal ONLY in
 *    files under one of `uiDirs`; EVERY other file in scope is policed with NO
 *    per-file component-definition exemption. This is the stricter admin-ts
 *    doctrine (Plan 00004, reconciling dbf/no-raw-html-outside-ui): the base UI
 *    primitives live in one place and everything else composes them. Combine
 *    with `bannedElements: ['*']` to ban ALL lowercase JSX identifiers, closing
 *    the fixed-list hole (svg, path, main, figure, custom hyphenated elements).
 *
 * Scoped per Decision 3 (Plan 011): JSX only. String/template-literal HTML
 * content (e.g. an articles.ts data file) is invisible to this AST rule by
 * construction, and is a separately-governed, sanctioned surface — not a
 * gap in this rule.
 */
const DEFAULT_BANNED_ELEMENTS = [
  'div', 'span', 'button', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'section', 'article', 'header', 'footer', 'nav', 'aside',
  'form', 'input', 'select', 'textarea', 'label', 'table', 'tr', 'td', 'th',
  'img', 'video', 'audio', 'iframe',
];

// Sentinel in `bannedElements` meaning "ban every lowercase JSX identifier"
// (rather than only the fixed DEFAULT_BANNED_ELEMENTS list).
const BAN_ALL = '*';

interface RuleOptions {
  scopeGlobs?: string[];
  allowedElements?: string[];
  exemptFileSuffixes?: string[];
  /** Opt-in allowlist-dir model: dirs where raw HTML is legal (e.g. ['src/ui/']). */
  uiDirs?: string[];
  /** Override the banned-element denylist; `['*']` bans all lowercase tags. */
  bannedElements?: string[];
}

// Minimal shape for the export-declaration forms this rule needs to recognise -
// narrower than pulling in a full estree-flavoured Program type just for this scan.
interface Identifier {
  type: 'Identifier';
  name: string;
}
interface VariableDeclarator {
  id: Identifier | { type: string };
}
interface FunctionDeclarationNode {
  type: 'FunctionDeclaration';
  id: Identifier | null;
}
interface VariableDeclarationNode {
  type: 'VariableDeclaration';
  declarations: VariableDeclarator[];
}
interface ExportDefaultDeclarationNode {
  type: 'ExportDefaultDeclaration';
  declaration: FunctionDeclarationNode | Identifier | { type: string };
}
interface ExportSpecifierNode {
  exported: Identifier | { type: string; value?: string };
}
interface ExportNamedDeclarationNode {
  type: 'ExportNamedDeclaration';
  declaration: FunctionDeclarationNode | VariableDeclarationNode | { type: string } | null;
  specifiers: ExportSpecifierNode[];
}
type ProgramStatement = ExportDefaultDeclarationNode | ExportNamedDeclarationNode | { type: string };
interface ProgramNode {
  body: ProgramStatement[];
}

function getExportedNames(program: ProgramNode): string[] {
  const names: string[] = [];
  for (const stmt of program.body) {
    if (stmt.type === 'ExportDefaultDeclaration') {
      const decl = (stmt as ExportDefaultDeclarationNode).declaration;
      if (decl.type === 'FunctionDeclaration' && (decl as FunctionDeclarationNode).id) {
        names.push((decl as FunctionDeclarationNode).id!.name);
      } else if (decl.type === 'Identifier') {
        names.push((decl as Identifier).name);
      }
    } else if (stmt.type === 'ExportNamedDeclaration') {
      const namedStmt = stmt as ExportNamedDeclarationNode;
      const decl = namedStmt.declaration;
      if (decl) {
        if (decl.type === 'FunctionDeclaration' && (decl as FunctionDeclarationNode).id) {
          names.push((decl as FunctionDeclarationNode).id!.name);
        } else if (decl.type === 'VariableDeclaration') {
          for (const declarator of (decl as VariableDeclarationNode).declarations) {
            if (declarator.id.type === 'Identifier') names.push((declarator.id as Identifier).name);
          }
        }
      }
      // Grouped re-export form (e.g. `export { Carousel, CarouselContent };` at the
      // bottom of a file) has no `.declaration` at all - the names live in
      // `.specifiers` instead. Found missing while dogfooding on lts-commerce-site
      // (Plan 011 Task 4.2/4.3): Carousel.tsx uses exactly this shape and was still
      // being flagged for its own internal JSX despite exporting `Carousel`.
      for (const specifier of namedStmt.specifiers ?? []) {
        if (specifier.exported.type === 'Identifier') names.push((specifier.exported as Identifier).name);
      }
    }
  }
  return names;
}

function isComponentDefinitionFile(filename: string, exportedNames: string[], exemptSuffixes: string[]): boolean {
  if (exemptSuffixes.some((suffix) => filename.endsWith(suffix))) return true;
  const basenameNoExt = basename(filename, extname(filename));
  return exportedNames.includes(basenameNoExt);
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  return globs.some((glob) => filename.includes(glob.replace(/\*+$/, '')));
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw HTML elements in JSX outside designated component-definition files or UI dirs — the CDD flagship rule',
    },
    schema: [
      {
        type: 'object',
        properties: {
          scopeGlobs: { type: 'array', items: { type: 'string' } },
          allowedElements: { type: 'array', items: { type: 'string' } },
          exemptFileSuffixes: { type: 'array', items: { type: 'string' } },
          uiDirs: { type: 'array', items: { type: 'string' } },
          bannedElements: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      adHocHtml:
        'Raw <{{tag}}> is banned outside component-definition files (Component-Driven Development). Use or create a typed, variant-driven component instead.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const scopeGlobs = options.scopeGlobs ?? ['src/pages/', 'src/components/'];
    const allowedElements = new Set(options.allowedElements ?? []);
    const exemptFileSuffixes = options.exemptFileSuffixes ?? [];
    const uiDirs = options.uiDirs ?? [];
    const bannedElements = options.bannedElements ?? DEFAULT_BANNED_ELEMENTS;
    const banAll = bannedElements.includes(BAN_ALL);
    const bannedSet = new Set(bannedElements);

    // Allowlist-dir model: a file under any uiDir is fully exempt (raw HTML is
    // legal there); the per-file component-definition exemption is disabled for
    // every other in-scope file.
    const allowlistMode = uiDirs.length > 0;

    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};
    if (allowlistMode && pathIncludesAny(context.filename, uiDirs)) return {};

    // Computed once the Program node is visited (always the first node ESLint
    // visits, before any JSX inside it) - a file's own component-defining exports
    // aren't knowable from its filename alone, only from its AST. Only consulted
    // in the default (component-definition) model.
    let exempt = false;

    return {
      Program(node: ProgramNode) {
        exempt = allowlistMode
          ? false
          : isComponentDefinitionFile(context.filename, getExportedNames(node), exemptFileSuffixes);
      },
      JSXOpeningElement(node: JSXOpeningElement) {
        if (exempt) return;
        if (node.name.type !== 'JSXIdentifier') return;
        const tag = node.name.name;
        // PascalCase = custom component (always allowed); lowercase = raw HTML element.
        if (/^[A-Z]/.test(tag)) return;
        if (allowedElements.has(tag)) return;
        if (!banAll && !bannedSet.has(tag)) return;

        context.report({ node: node as unknown as Rule.Node, messageId: 'adHocHtml', data: { tag } });
      },
    };
  },
};

export default rule;
export type { JSXElement };
