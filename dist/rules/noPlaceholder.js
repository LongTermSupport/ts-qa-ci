/**
 * Tier A core rule: bans the literal string "PLACEHOLDER" anywhere in
 * string/template literals — repo-wide, including data files like
 * articles.ts. Fully generic, zero coupling; catches forgotten
 * placeholder content before it ships.
 */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description: 'Disallow the literal string "PLACEHOLDER" in string and template literals',
        },
        schema: [],
        messages: {
            placeholder: 'Found literal "PLACEHOLDER" content — replace with real content before shipping.',
        },
    },
    create(context) {
        return {
            Literal(node) {
                if (typeof node.value === "string" &&
                    node.value.includes("PLACEHOLDER")) {
                    context.report({ node, messageId: "placeholder" });
                }
            },
            TemplateElement(node) {
                if (node.value.raw.includes("PLACEHOLDER")) {
                    context.report({ node, messageId: "placeholder" });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=noPlaceholder.js.map