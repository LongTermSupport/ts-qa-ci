import type { Rule } from "eslint";
import type { AssignmentExpression, CallExpression } from "estree";

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
 * The hardcoded `/\/src\/ui\//` exemption is generalised to the configurable
 * `sanctionedDirs` option (default `['src/ui/', 'src/components/ui/']`), matched
 * with the same segment-anchored `pathIncludesAny` helper used by
 * noClassnameProp.ts — an unanchored `includes` would wrongly exempt any dir
 * merely ending in one of those segments.
 *
 * Not auto-fixable.
 */
const SRC_PATTERN = /\/src\//;

interface RuleOptions {
  allow?: string[];
  /** Dirs where className/classList mutation is sanctioned (default ['src/ui/', 'src/components/ui/']). */
  sanctionedDirs?: string[];
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  // Segment-anchored (see noClassnameProp.ts): prefix a leading slash to both
  // sides so `src/ui/` matches `/proj/src/ui/…` but NOT `…/adsrc/ui/…` (which
  // merely contains the substring). An unanchored `includes` over-matches.
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
        "Disallow imperative className / classList mutation outside ~/ui.",
      url: "https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md#no-dom-classname-mutation",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: { type: "array", items: { type: "string" } },
          sanctionedDirs: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mutation:
        "Imperative className/classList mutation smuggles ad-hoc CSS past every JSX rule — the same infinite-state problem with worse visibility. Render the state through a primitive's variant prop; genuinely structural loader-level cases go on the rule's reviewed allowlist. Doctrine: https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md#no-dom-classname-mutation",
    },
  },
  create(context) {
    const filename = context.filename;
    const options = (context.options[0] ?? {}) as RuleOptions;
    const sanctionedDirs = options.sanctionedDirs ?? [
      "src/ui/",
      "src/components/ui/",
    ];
    if (!SRC_PATTERN.test(filename) || pathIncludesAny(filename, sanctionedDirs))
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
