/**
 * WHY: the wedge's JSX-side CSS discipline is airtight — `className` is not a
 * prop (dbf/no-className-prop), raw HTML lives only in `~/ui` (dbf/no-raw-html-
 * outside-ui), and utility strings are composed via `cn()` inside `~/ui`. But
 * an imperative `el.className = 'p-4'` or `el.classList.add('p-4')` smuggles
 * ad-hoc CSS straight past every JSX-attribute rule. The one sanctioned site is
 * the shadow-mount node in `src/core/loader.ts` (`inner.className = 'mount'` —
 * structural, not styling); everything else is a bypass.
 *
 * Detects (outside `src/ui/**`):
 *   - `<expr>.className = …`            (AssignmentExpression)
 *   - `<expr>.classList.<m>('literal')` (CallExpression with a string literal
 *     arg — add/remove/toggle/replace)
 *
 * The single sanctioned site is allow-listed via the rule's `allow` option in
 * `eslint.config.mjs` (`{ allow: ['src/core/loader.ts'] }`) — reviewable in the
 * config diff, unlike an inline comment the author grants themselves.
 *
 * Not auto-fixable.
 */
const SRC_PATTERN = /\/src\//;
const UI_PATTERN = /\/src\/ui\//;
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow imperative className / classList mutation outside ~/ui.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mutation:
        "Imperative className/classList mutation is ad-hoc CSS outside ~/ui. Render through a ~/ui component; if this is loader-level structure, it must be on the rule allowlist in eslint.config.mjs (reviewed).",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!SRC_PATTERN.test(filename) || UI_PATTERN.test(filename)) return {};
    const options = context.options[0] ?? {};
    const allow = options.allow ?? [];
    if (allow.some((entry) => filename.includes(entry))) return {};
    return {
      AssignmentExpression(node) {
        const left = node.left;
        if (
          left.type === "MemberExpression" &&
          !left.computed &&
          left.property.type === "Identifier" &&
          left.property.name === "className"
        ) {
          context.report({
            node: node,
            messageId: "mutation",
          });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;
        const object = callee.object;
        if (
          object.type === "MemberExpression" &&
          !object.computed &&
          object.property.type === "Identifier" &&
          object.property.name === "classList"
        ) {
          const hasStringLiteralArg = node.arguments.some(
            (arg) => arg.type === "Literal" && typeof arg.value === "string",
          );
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
