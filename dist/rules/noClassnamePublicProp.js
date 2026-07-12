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
        },
        additionalProperties: false,
      },
    ],
    messages: {
      classNameDeclared:
        "`className` may not be declared as a public prop — publishing it opens the component to arbitrary CSS from every caller, so no test or story can enumerate its states. Remove it from this interface/type and express the desired presentation as a variant/size/tone/density prop on the component. Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const scopeGlobs = options.scopeGlobs ?? ["src/"];
    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};
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
    };
  },
};
export default rule;
//# sourceMappingURL=noClassnamePublicProp.js.map
