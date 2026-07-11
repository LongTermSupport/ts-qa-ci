import type { Rule } from "eslint";
import type { JSXAttribute, JSXOpeningElement } from "estree-jsx";

/**
 * Tier B (opt-in CDD) — companion to variant-api-enforcement, axis 2 of the
 * className doctrine (rule-classification.md §2b). Ported from admin-ts's
 * dbf/no-className-prop (Plan 00004).
 *
 * WHY: a styleable component owns its presentation via typed variant props
 * (variant/size/tone/density/…). Letting a caller pass `className="…"` re-opens
 * the ad-hoc-utility pattern the variant API exists to close — the same visual
 * intent then diverges string-by-string across call sites.
 *
 * Rule: `className` may appear on a JSX opening element ONLY when
 *   (a) the target is a raw HTML/SVG tag (lowercase JSXIdentifier — `className`
 *       is the native DOM attribute there), OR
 *   (b) the file is under a `uiDirs` entry AND the target is a JSXMemberExpression
 *       (e.g. `<RadixDialog.Title className=…>`). This narrow carve-out lets a UI
 *       wrapper pass internally-derived className into a third-party compound
 *       primitive (Radix parts, etc.) — the third-party API contract, not an
 *       ad-hoc override. Own-code never uses `Foo.Bar` compound targets
 *       (one-component-per-file forbids it), so member targets are always
 *       third-party.
 * Passing `className` to a custom component (PascalCase / member target) outside
 * that carve-out is reported.
 *
 * The hardcoded admin-ts `/src/ui/` carve-out is generalised to the `uiDirs`
 * option (§2b: the carve-out must be reviewable config, not baked in).
 */
interface RuleOptions {
  /** Path fragments the rule polices (default ['src/']). */
  scopeGlobs?: string[];
  /** Dirs where a JSXMemberExpression target may receive className (default ['src/ui/']). */
  uiDirs?: string[];
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  // Segment-anchored: prefix a leading slash to both the filename and each glob
  // so `src/ui/` matches `/proj/src/ui/…` but NOT `…/adsrc/ui/…` (which merely
  // contains the substring). Reproduces the dbf originals' /\/src\/…\// anchoring
  // — an unanchored `includes` would wrongly carve out any dir ending in `src`.
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
        "`className` may not be passed to a custom component. Express presentation via variant/size/tone/density props on the component itself.",
    },
    schema: [
      {
        type: "object",
        properties: {
          scopeGlobs: { type: "array", items: { type: "string" } },
          uiDirs: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      classNameOnComponent:
        "`className` may not be passed to `<{{component}}>`. Use the component's variant props (variant/size/tone/density/align/gap/wrap/justify). If the desired visual isn't expressible as a variant, extend the component rather than overriding at the call site.",
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const scopeGlobs = options.scopeGlobs ?? ["src/"];
    const uiDirs = options.uiDirs ?? ["src/ui/"];

    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};
    const insideUi = pathIncludesAny(context.filename, uiDirs);

    return {
      JSXAttribute(node: JSXAttribute) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "className"
        )
          return;
        const opening = (node as unknown as { parent?: JSXOpeningElement })
          .parent;
        if (!opening || opening.type !== "JSXOpeningElement") return;
        const name = opening.name;

        // `<Foo.Bar />` — always a component, never raw HTML.
        if (name.type === "JSXMemberExpression") {
          if (insideUi) return; // third-party compound passthrough carve-out
          const src = context.sourceCode.getText(name as unknown as Rule.Node);
          context.report({
            node: node as unknown as Rule.Node,
            messageId: "classNameOnComponent",
            data: { component: src },
          });
          return;
        }

        if (name.type !== "JSXIdentifier") return;
        const tag = name.name;
        if (tag.length === 0) return;
        // Lowercase first char → raw HTML/SVG; native className is allowed.
        // ASCII-only by design: a unicode-lowercase tag (`<über>`) is treated as
        // a component and flagged. Stricter than the dbf original's locale-aware
        // test — ratchet-legal, and no real HTML/JSX tag starts non-ASCII.
        if (/^[a-z]/.test(tag)) return;
        context.report({
          node: node as unknown as Rule.Node,
          messageId: "classNameOnComponent",
          data: { component: tag },
        });
      },
    };
  },
};

export default rule;
