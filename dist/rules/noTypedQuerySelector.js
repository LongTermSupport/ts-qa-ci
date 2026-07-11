const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explicit type arguments on querySelector/querySelectorAll; use a runtime instanceof filter.",
    },
    schema: [],
    messages: {
      typed:
        "`{{name}}<T>(...)` is an unchecked cast — the runtime returns whatever matches the CSS selector, not necessarily a T. Filter with `instanceof` after, e.g. `Array.from(...).filter((el): el is HTMLElement => el instanceof HTMLElement)`.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (filename.includes("/src/api-client/generated/")) return {};
    if (/\.test\.[cm]?[jt]sx?$/.test(filename)) return {};
    return {
      CallExpression(node) {
        const call = node;
        const callee = call.callee;
        if (callee.type !== "MemberExpression") return;
        const member = callee;
        if (member.property.type !== "Identifier") return;
        const name = member.property.name;
        if (name !== "querySelector" && name !== "querySelectorAll") return;
        // typescript-eslint exposes the type-argument list as
        // `typeArguments` on the CallExpression node.
        const args = call.typeArguments;
        if (args === undefined || args === null) return;
        if (args.type !== "TSTypeParameterInstantiation") return;
        if (args.params.length === 0) return;
        context.report({ node, messageId: "typed", data: { name } });
      },
    };
  },
};
export default rule;
//# sourceMappingURL=noTypedQuerySelector.js.map
