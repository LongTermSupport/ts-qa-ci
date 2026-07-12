const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow arbitrary className string/template literals outside a variant-resolver call (Tier B, opt-in CDD)",
      url: "https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md#require-variant-resolver",
    },
    schema: [
      {
        type: "object",
        properties: {
          variantResolverNames: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      adHocClassname:
        "className is a raw string literal, not a variant-resolver call ({{resolvers}}). Route styling through the component variant-prop catalogue instead. NOTE: this opt-in rule governs HOW a primitive builds its OWN internal classes — it is not the closed-styling boundary (that is no-ad-hoc-html + no-classname-prop + no-classname-public-prop). Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const resolvers = options.variantResolverNames ?? [
      "cva",
      "cn",
      "clsx",
      "twMerge",
    ];
    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "className"
        )
          return;
        if (!node.value) return;
        if (
          node.value.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          context.report({
            node: node,
            messageId: "adHocClassname",
            data: { resolvers: resolvers.join("/") },
          });
          return;
        }
        if (node.value.type === "JSXExpressionContainer") {
          const expr = node.value.expression;
          if (
            expr.type === "TemplateLiteral" ||
            (expr.type === "Literal" && typeof expr.value === "string")
          ) {
            context.report({
              node: node,
              messageId: "adHocClassname",
              data: { resolvers: resolvers.join("/") },
            });
            return;
          }
          if (
            expr.type === "CallExpression" &&
            expr.callee.type === "Identifier" &&
            resolvers.includes(expr.callee.name)
          ) {
            return; // sanctioned variant-resolver call
          }
        }
      },
    };
  },
};
export default rule;
//# sourceMappingURL=requireVariantResolver.js.map
