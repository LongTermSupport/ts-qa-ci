function pathIncludesAny(filename, globs) {
    // Segment-anchored (shared shape with the other closed-styling rules): prefix a
    // leading slash so `src/ui/` matches `/proj/src/ui/…` but NOT `…/adsrc/ui/…`.
    const anchored = `/${filename.replace(/^\/+/, "")}`;
    return globs.some((glob) => anchored.includes(`/${glob.replace(/^\/+/, "").replace(/\*+$/, "")}`));
}
const rule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow imperative className / classList mutation outside the primitive dirs.",
            url: "https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md#no-dom-classname-mutation",
        },
        schema: [
            {
                type: "object",
                properties: {
                    scopeGlobs: { type: "array", items: { type: "string" } },
                    uiDirs: { type: "array", items: { type: "string" } },
                    allow: { type: "array", items: { type: "string" } },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            mutation: "Imperative className/classList mutation is ad-hoc CSS outside the primitive dirs — it smuggles arbitrary CSS past every JSX rule, the same infinite-state problem with worse visibility. Render through a primitive component's variant prop; if this is genuinely loader-level structure, it must be on the rule's reviewed `allow` list in the ESLint config. Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md",
        },
    },
    create(context) {
        const filename = context.filename;
        const options = (context.options[0] ?? {});
        const scopeGlobs = options.scopeGlobs ?? ["src/"];
        const uiDirs = options.uiDirs ?? ["src/ui/"];
        if (!pathIncludesAny(filename, scopeGlobs) ||
            pathIncludesAny(filename, uiDirs))
            return {};
        const allow = options.allow ?? [];
        if (allow.some((entry) => filename.includes(entry)))
            return {};
        return {
            AssignmentExpression(node) {
                const left = node.left;
                if (left.type === "MemberExpression" &&
                    !left.computed &&
                    left.property.type === "Identifier" &&
                    left.property.name === "className") {
                    context.report({
                        node: node,
                        messageId: "mutation",
                    });
                }
            },
            CallExpression(node) {
                const callee = node.callee;
                if (callee.type !== "MemberExpression")
                    return;
                const object = callee.object;
                if (object.type === "MemberExpression" &&
                    !object.computed &&
                    object.property.type === "Identifier" &&
                    object.property.name === "classList") {
                    const hasStringLiteralArg = node.arguments.some((arg) => arg.type === "Literal" && typeof arg.value === "string");
                    if (hasStringLiteralArg) {
                        context.report({
                            node: node,
                            messageId: "mutation",
                        });
                    }
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=noDomClassnameMutation.js.map