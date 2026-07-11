import type { Rule } from "eslint";
import type { JSXAttribute } from "estree-jsx";

/**
 * require-variant-resolver (formerly `no-ad-hoc-classnames`) — Tier B, OPT-IN.
 *
 * Requires a component's OWN internal className strings to be built through a
 * variant-resolver call (cva/cn/clsx/twMerge) rather than a bare string/template
 * literal. It is a HOW-you-build-internal-classes opinion for projects that have
 * adopted a CVA + tailwind-merge + clsx catalogue.
 *
 * IMPORTANT — this is NOT the "closed component styling" boundary. That doctrine
 * (a component owns its CSS internally and exposes only variant props; no
 * className/style passthrough) is enforced by the Tier A rules `no-classname-prop`
 * (call-site) + `no-classname-public-prop` (declaration-site) + `no-ad-hoc-html`.
 * A project may fully satisfy the closed-styling doctrine while using plain
 * static Tailwind strings internally — for which this rule's cn('static')
 * wrapping would be meaningless ceremony. Hence it stays OPT-IN, distinct from
 * the always-on boundary, and must never be mistaken for it.
 *
 * Mechanism: flag any `className="..."` JSX attribute whose value is a plain
 * string/template literal (not a call to an allowlisted resolver). Consumers
 * configure variantResolverNames to match their own catalogue's helper names.
 */
interface RuleOptions {
  variantResolverNames?: string[];
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow arbitrary className string/template literals outside a variant-resolver call (Tier B, opt-in CDD)",
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
        "className is a raw string literal, not a variant-resolver call ({{resolvers}}). Route styling through the component variant-prop catalogue instead.",
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const resolvers = options.variantResolverNames ?? [
      "cva",
      "cn",
      "clsx",
      "twMerge",
    ];

    return {
      JSXAttribute(node: JSXAttribute) {
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
            node: node as unknown as Rule.Node,
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
              node: node as unknown as Rule.Node,
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
