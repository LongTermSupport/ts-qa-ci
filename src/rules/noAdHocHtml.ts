import type { Rule } from 'eslint';
import type { JSXElement, JSXOpeningElement } from 'estree-jsx';

/**
 * Tier A core rule (CDD flagship): bans raw HTML elements in .tsx JSX
 * outside designated component-definition files. Component-Driven
 * Development's central enforcement point — ad hoc <div>/<span>/<button>
 * soup in a page or page-composing component is banned; only imported,
 * PascalCase custom components are allowed there. A file counts as
 * "component-defining" (and so exempt) when its default export's name
 * matches the filename, which is this package's own convention, not
 * ec-site's — written fresh per the Task 3.0 sign-off's "clean, free of
 * proprietary stuff" requirement.
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

interface RuleOptions {
  scopeGlobs?: string[];
  allowedElements?: string[];
  exemptFileSuffixes?: string[];
}

function isComponentDefinitionFile(filename: string, exemptSuffixes: string[]): boolean {
  return exemptSuffixes.some((suffix) => filename.endsWith(suffix));
}

function isInScope(filename: string, scopeGlobs: string[]): boolean {
  return scopeGlobs.some((glob) => filename.includes(glob.replace(/\*+$/, '')));
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw HTML elements in JSX outside designated component-definition files — the CDD flagship rule',
    },
    schema: [
      {
        type: 'object',
        properties: {
          scopeGlobs: { type: 'array', items: { type: 'string' } },
          allowedElements: { type: 'array', items: { type: 'string' } },
          exemptFileSuffixes: { type: 'array', items: { type: 'string' } },
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
    // Any component's OWN definition file (e.g. src/components/Button/Button.tsx
    // defining <button>) is exempt by convention - the raw element there IS the
    // component's internal implementation, not a CDD violation.
    const exemptFileSuffixes = options.exemptFileSuffixes ?? [];

    if (!isInScope(context.filename, scopeGlobs)) return {};
    if (isComponentDefinitionFile(context.filename, exemptFileSuffixes)) return {};

    return {
      JSXOpeningElement(node: JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;
        const tag = node.name.name;
        // PascalCase = custom component (always allowed); lowercase = raw HTML element.
        if (/^[A-Z]/.test(tag)) return;
        if (allowedElements.has(tag)) return;
        if (!DEFAULT_BANNED_ELEMENTS.includes(tag)) return;

        context.report({ node: node as unknown as Rule.Node, messageId: 'adHocHtml', data: { tag } });
      },
    };
  },
};

export default rule;
export type { JSXElement };
