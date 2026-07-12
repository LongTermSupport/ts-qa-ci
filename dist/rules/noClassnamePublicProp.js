const DEFAULT_BEARING_TYPES = [
  "HTMLProps",
  "DetailedHTMLProps",
  "ComponentProps",
  "ComponentPropsWithoutRef",
  "ComponentPropsWithRef",
  "SVGProps",
];
const DEFAULT_BEARING_SUFFIXES = ["HTMLAttributes", "SVGAttributes"];
/**
 * Flatten a type-alias annotation into its leaf members, recursing through
 * nested `TSIntersectionType` / `TSUnionType` (so `A & (B | C)` and
 * `A | B | C` all yield their leaf references). Each leaf is a candidate base
 * type to test for className-bearing. Union is included because a polymorphic
 * `type P = ButtonHTMLAttributes<X> | AnchorHTMLAttributes<Y>` re-publishes
 * className on every branch.
 */
function flattenTypeMembers(node) {
  if (!node) return [];
  if (node.type === "TSIntersectionType" || node.type === "TSUnionType") {
    return (node.types ?? []).flatMap(flattenTypeMembers);
  }
  return [node];
}
/**
 * The rightmost identifier of a heritage expression / type reference:
 *   `HTMLAttributes`               (Identifier)                → "HTMLAttributes"
 *   `React.HTMLAttributes`         (MemberExpression / TSQualifiedName) → "HTMLAttributes"
 *   `React.ComponentPropsWithoutRef` (TSQualifiedName)         → "ComponentPropsWithoutRef"
 */
function rightmostName(node) {
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
function pathIncludesAny(filename, globs) {
  // Segment-anchored (see noClassnameProp.ts): prefix a leading slash to both
  // sides so `src/` matches `/proj/src/…` but NOT `…/adsrc/…`. Reproduces the
  // dbf original's /\/src\// anchoring; an unanchored `includes` over-matches.
  const anchored = `/${filename.replace(/^\/+/, "")}`;
  return globs.some((glob) =>
    anchored.includes(`/${glob.replace(/^\/+/, "").replace(/\*+$/, "")}`),
  );
}
const rule = {
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
    const options = context.options[0] ?? {};
    const scopeGlobs = options.scopeGlobs ?? ["src/"];
    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};
    const bearingTypes = new Set(
      options.classNameBearingTypes ?? DEFAULT_BEARING_TYPES,
    );
    const bearingSuffixes =
      options.classNameBearingSuffixes ?? DEFAULT_BEARING_SUFFIXES;
    function isClassNameBearing(name) {
      if (!name) return false;
      if (bearingTypes.has(name)) return true;
      return bearingSuffixes.some((suffix) => name.endsWith(suffix));
    }
    function reportBearing(base, atNode) {
      const name = rightmostName(base);
      if (!isClassNameBearing(name)) return;
      context.report({
        node: atNode,
        messageId: "classNameInherited",
        data: { base: name ?? "a DOM-attribute type" },
      });
    }
    return {
      TSPropertySignature(node) {
        const key = node.key;
        if (!key) return;
        // `className: ...` (Identifier key) vs `'className': ...` (Literal key).
        let name;
        if (key.type === "Identifier") name = key.name;
        else if (key.type === "Literal") name = key.value;
        else return;
        if (name !== "className") return;
        context.report({
          node: node,
          messageId: "classNameDeclared",
        });
      },
      // `interface FooProps extends React.HTMLAttributes<HTMLDivElement> {}`
      TSInterfaceDeclaration(node) {
        const heritage = node.extends ?? [];
        for (const clause of heritage) reportBearing(clause, clause);
      },
      // `type FooProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {...}`,
      // `A & (B | C)`, `ButtonHTMLAttributes<X> | AnchorHTMLAttributes<Y>`, or a
      // bare `type FooProps = HTMLAttributes<HTMLDivElement>` (alias IS the base).
      TSTypeAliasDeclaration(node) {
        const ann = node.typeAnnotation;
        for (const member of flattenTypeMembers(ann))
          reportBearing(member, member);
      },
    };
  },
};
export default rule;
//# sourceMappingURL=noClassnamePublicProp.js.map
