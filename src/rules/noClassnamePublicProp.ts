import type { Rule } from 'eslint';

/**
 * Tier B (opt-in CDD) — companion to no-classname-prop, axis 3 of the className
 * doctrine (rule-classification.md §2b). Ported from admin-ts's
 * dbf/ui-component-no-className-public-prop (Plan 00004).
 *
 * WHY: no-classname-prop closes the call site; this rule closes the declaration
 * site. Any `interface FooProps { className?: string }` or inline
 * `type Foo = { className?: string }` publishes `className` as a public surface —
 * IDE autocomplete offers it and the next person reaching for an override has a
 * hook to grab. Declaring the prop is the doctrine violation regardless of
 * whether anyone currently passes it.
 *
 * Rule: any `TSPropertySignature` (a member of an interface OR of an inline
 * `TSTypeLiteral` — both surface as TSPropertySignature in the TS-ESTree AST)
 * whose key is `className` (identifier or string-literal key) is reported.
 *
 * The hardcoded admin-ts `/src/` scope is generalised to the `scopeGlobs`
 * option so non-`src/`-rooted consumers can point it at their own tree.
 */
interface RuleOptions {
  /** Path fragments the rule polices (default ['src/']). */
  scopeGlobs?: string[];
}

interface PropertyKeyNode {
  type: string;
  name?: string;
  value?: unknown;
}
interface TSPropertySignatureNode {
  key?: PropertyKeyNode;
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  // Segment-anchored (see noClassnameProp.ts): prefix a leading slash to both
  // sides so `src/` matches `/proj/src/…` but NOT `…/adsrc/…`. Reproduces the
  // dbf original's /\/src\// anchoring; an unanchored `includes` over-matches.
  const anchored = `/${filename.replace(/^\/+/, '')}`;
  return globs.some((glob) => anchored.includes(`/${glob.replace(/^\/+/, '').replace(/\*+$/, '')}`));
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '`className` may not appear as a member of any interface or object type. Components own their styling via variant props; never accept className.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          scopeGlobs: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      classNameDeclared:
        '`className` may not be declared as a public prop. Remove it from this interface/type and express the desired presentation as a variant/size/tone/density prop on the component.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const scopeGlobs = options.scopeGlobs ?? ['src/'];
    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};

    return {
      TSPropertySignature(node: object) {
        const key = (node as TSPropertySignatureNode).key;
        if (!key) return;
        // `className: ...` (Identifier key) vs `'className': ...` (Literal key).
        let name: unknown;
        if (key.type === 'Identifier') name = key.name;
        else if (key.type === 'Literal') name = key.value;
        else return;
        if (name !== 'className') return;
        context.report({ node: node as unknown as Rule.Node, messageId: 'classNameDeclared' });
      },
    };
  },
};

export default rule;
