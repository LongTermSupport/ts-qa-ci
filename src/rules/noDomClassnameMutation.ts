import type { Rule } from "eslint";
import type { AssignmentExpression, CallExpression } from "estree";

/**
 * Tier B (opt-in CDD). The closed-styling boundary's JSX-side discipline is
 * airtight — `className` is not a public prop (no-classname-prop /
 * no-classname-public-prop), raw HTML lives only in the primitive dirs
 * (no-ad-hoc-html). But an imperative `el.className = 'p-4'` or
 * `el.classList.add('p-4')` smuggles ad-hoc CSS straight past every JSX-attribute
 * rule — the same infinite-state problem with worse visibility. See
 * docs/closed-styling-doctrine.md.
 *
 * Detects (in `scopeGlobs`, outside `uiDirs`):
 *   - `<expr>.className = …`            (AssignmentExpression)
 *   - `<expr>.classList.<m>('literal')` (CallExpression with a string literal
 *     arg — add/remove/toggle/replace)
 *
 * Genuinely structural loader-level sites (e.g. a shadow-mount node's
 * `inner.className = 'mount'`) are allow-listed via the `allow` option in the
 * ESLint config — reviewable in the config diff, unlike an inline comment the
 * author grants themselves.
 *
 * The originally-hardcoded `/src/` scope and `/src/ui/` carve-out are generalised
 * to the `scopeGlobs` / `uiDirs` options (defaults preserve the old behaviour).
 *
 * Not auto-fixable.
 */
interface RuleOptions {
  /** Path fragments the rule polices (default ['src/']). */
  scopeGlobs?: string[];
  /** Primitive dirs where imperative mutation is allowed (default ['src/ui/']). */
  uiDirs?: string[];
  /** Reviewed path fragments exempt from the rule (structural loader sites). */
  allow?: string[];
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  // Segment-anchored (shared shape with the other closed-styling rules): prefix a
  // leading slash so `src/ui/` matches `/proj/src/ui/…` but NOT `…/adsrc/ui/…`.
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
        "Disallow imperative className / classList mutation outside the primitive dirs.",
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
      mutation:
        "Imperative className/classList mutation is ad-hoc CSS outside the primitive dirs — it smuggles arbitrary CSS past every JSX rule, the same infinite-state problem with worse visibility. Render through a primitive component's variant prop; if this is genuinely loader-level structure, it must be on the rule's reviewed `allow` list in the ESLint config. Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md",
    },
  },
  create(context) {
    const filename = context.filename;
    const options = (context.options[0] ?? {}) as RuleOptions;
    const scopeGlobs = options.scopeGlobs ?? ["src/"];
    const uiDirs = options.uiDirs ?? ["src/ui/"];
    if (
      !pathIncludesAny(filename, scopeGlobs) ||
      pathIncludesAny(filename, uiDirs)
    )
      return {};
    const allow = options.allow ?? [];
    if (allow.some((entry) => filename.includes(entry))) return {};
    return {
      AssignmentExpression(node: AssignmentExpression) {
        const left = node.left;
        if (
          left.type === "MemberExpression" &&
          !left.computed &&
          left.property.type === "Identifier" &&
          left.property.name === "className"
        ) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: "mutation",
          });
        }
      },
      CallExpression(node: CallExpression) {
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
              node: node as unknown as Rule.Node,
              messageId: "mutation",
            });
          }
        }
      },
    };
  },
};

export default rule;
