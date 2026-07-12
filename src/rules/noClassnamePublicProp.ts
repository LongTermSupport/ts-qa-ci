import type { Rule } from "eslint";

/**
 * Tier A always-on — the closed-styling BOUNDARY, declaration-site half (with
 * no-classname-prop = call-site half, and no-ad-hoc-html = element half). See
 * docs/closed-styling-doctrine.md. Ported from admin-ts's
 * dbf/ui-component-no-className-public-prop (Plan 00004).
 *
 * WHY: no-classname-prop closes the call site; this rule closes the declaration
 * site. Any `interface FooProps { className?: string }` or inline
 * `type Foo = { className?: string }` publishes `className` as a public surface —
 * IDE autocomplete offers it and the next person reaching for an override has a
 * hook to grab. Declaring the prop is the doctrine violation regardless of
 * whether anyone currently passes it.
 *
 * Rule, two ways `className` gets published:
 *   1. DIRECT — any `TSPropertySignature` (a member of an interface OR of an
 *      inline `TSTypeLiteral`) whose key is `className` (identifier or
 *      string-literal key).
 *   2. INHERITED — a props interface/type that `extends` (or intersects) a
 *      className-bearing DOM base type: `React.HTMLAttributes<T>`, the whole
 *      per-element family (`ButtonHTMLAttributes`, `InputHTMLAttributes`, …),
 *      `ComponentPropsWithoutRef<'div'>`, `HTMLProps`, `DetailedHTMLProps`,
 *      `SVGProps`, etc. Inheriting one re-publishes `className` (and every other
 *      DOM attribute) transitively — the same breach, just hidden behind an
 *      `extends`. Detection is SYNTACTIC (matches the base type's rightmost name
 *      against `classNameBearingTypes` / `classNameBearingSuffixes`); a transitive
 *      re-publish through ANOTHER component's props type needs type resolution and
 *      is the `ts-qa-ci_cdd-reviewer` agent's job, not this lint's.
 *
 * The hardcoded admin-ts `/src/` scope is generalised to the `scopeGlobs`
 * option so non-`src/`-rooted consumers can point it at their own tree.
 */
interface RuleOptions {
  /** Path fragments the rule polices (default ['src/']). */
  scopeGlobs?: string[];
  /**
   * Base-type names whose `extends`/intersection re-publishes `className` (and
   * the rest of a DOM element's props). Exact-match names (default: the React
   * `ComponentProps` family + `HTMLProps`/`DetailedHTMLProps`/`SVGProps`).
   */
  classNameBearingTypes?: string[];
  /**
   * Base-type name SUFFIXES that re-publish `className` — matches the whole
   * per-element React family in one shot (default: `HTMLAttributes`,
   * `SVGAttributes`, so `ButtonHTMLAttributes`, `InputHTMLAttributes`, … all hit).
   */
  classNameBearingSuffixes?: string[];
}

const DEFAULT_BEARING_TYPES = [
  "HTMLProps",
  "AllHTMLProps",
  "DetailedHTMLProps",
  "ComponentProps",
  "ComponentPropsWithoutRef",
  "ComponentPropsWithRef",
  "SVGProps",
];
const DEFAULT_BEARING_SUFFIXES = ["HTMLAttributes", "SVGAttributes"];

interface PropertyKeyNode {
  type: string;
  name?: string;
  value?: unknown;
}
interface TSPropertySignatureNode {
  key?: PropertyKeyNode;
}

// Minimal shapes for the type-reference forms a heritage/intersection can take.
interface NamedNode {
  type: string;
  name?: string;
  property?: NamedNode;
  right?: NamedNode;
  expression?: NamedNode;
  typeName?: NamedNode;
}

/**
 * The rightmost identifier of a heritage expression / type reference:
 *   `HTMLAttributes`               (Identifier)                → "HTMLAttributes"
 *   `React.HTMLAttributes`         (MemberExpression / TSQualifiedName) → "HTMLAttributes"
 *   `React.ComponentPropsWithoutRef` (TSQualifiedName)         → "ComponentPropsWithoutRef"
 */
function rightmostName(node: NamedNode | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === "Identifier") return node.name;
  // TSTypeReference wraps the name under `.typeName`.
  if (node.typeName) return rightmostName(node.typeName);
  // Heritage `TSInterfaceHeritage`/`TSExpressionWithTypeArguments` wraps `.expression`.
  if (node.expression) return rightmostName(node.expression);
  // `React.HTMLAttributes`: MemberExpression(.property) / TSQualifiedName(.right).
  if (node.property) return rightmostName(node.property);
  if (node.right) return rightmostName(node.right);
  return undefined;
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  // Segment-anchored (see noClassnameProp.ts): prefix a leading slash to both
  // sides so `src/` matches `/proj/src/…` but NOT `…/adsrc/…`. Reproduces the
  // dbf original's /\/src\// anchoring; an unanchored `includes` over-matches.
  const anchored = `/${filename.replace(/^\/+/, "")}`;
  return globs.some((glob) =>
    anchored.includes(`/${glob.replace(/^\/+/, "").replace(/\*+$/, "")}`),
  );
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "`className` may not appear as a member of any interface or object type. Components own their styling via variant props; never accept className.",
      url: "https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md#no-classname-public-prop",
    },
    schema: [
      {
        type: "object",
        properties: {
          scopeGlobs: { type: "array", items: { type: "string" } },
          classNameBearingTypes: { type: "array", items: { type: "string" } },
          classNameBearingSuffixes: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      classNameDeclared:
        "`className` may not be declared as a public prop — publishing it opens the component to arbitrary CSS from every caller, so no test or story can enumerate its states. Remove it from this interface/type and express the desired presentation as a variant/size/tone/density prop on the component. Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md",
      classNameInherited:
        "Extending `{{base}}` re-publishes `className` (and the whole DOM element's attributes) as public props — the same closed-styling breach as declaring `className` directly, just transitive. Do not inherit a DOM-attribute base type on a component's public props; model presentation as named variant/size/tone props and pass only the specific attributes you need internally. Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md",
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const scopeGlobs = options.scopeGlobs ?? ["src/"];
    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};

    const bearingTypes = new Set(
      options.classNameBearingTypes ?? DEFAULT_BEARING_TYPES,
    );
    const bearingSuffixes =
      options.classNameBearingSuffixes ?? DEFAULT_BEARING_SUFFIXES;

    function isClassNameBearing(name: string | undefined): boolean {
      if (!name) return false;
      if (bearingTypes.has(name)) return true;
      return bearingSuffixes.some((suffix) => name.endsWith(suffix));
    }

    function reportBearing(base: NamedNode, atNode: object): void {
      const name = rightmostName(base);
      if (!isClassNameBearing(name)) return;
      context.report({
        node: atNode as unknown as Rule.Node,
        messageId: "classNameInherited",
        data: { base: name ?? "a DOM-attribute type" },
      });
    }

    return {
      TSPropertySignature(node: object) {
        const key = (node as TSPropertySignatureNode).key;
        if (!key) return;
        // `className: ...` (Identifier key) vs `'className': ...` (Literal key).
        let name: unknown;
        if (key.type === "Identifier") name = key.name;
        else if (key.type === "Literal") name = key.value;
        else return;
        if (name !== "className") return;
        context.report({
          node: node as unknown as Rule.Node,
          messageId: "classNameDeclared",
        });
      },
      // `interface FooProps extends React.HTMLAttributes<HTMLDivElement> {}`
      TSInterfaceDeclaration(node: object) {
        const heritage = (node as { extends?: NamedNode[] }).extends ?? [];
        for (const clause of heritage) reportBearing(clause, clause);
      },
      // `type FooProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {...}`
      TSTypeAliasDeclaration(node: object) {
        const ann = (node as { typeAnnotation?: NamedNode }).typeAnnotation;
        if (!ann) return;
        if (ann.type === "TSIntersectionType") {
          const members = (ann as unknown as { types?: NamedNode[] }).types ?? [];
          for (const member of members) reportBearing(member, member);
        } else if (ann.type === "TSTypeReference") {
          // `type FooProps = HTMLAttributes<HTMLDivElement>` (alias IS the base).
          reportBearing(ann, ann);
        }
      },
    };
  },
};

export default rule;
