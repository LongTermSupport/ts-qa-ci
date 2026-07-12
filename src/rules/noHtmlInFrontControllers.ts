import type { Rule } from "eslint";
import type { JSXOpeningElement } from "estree-jsx";

/**
 * no-html-in-front-controllers — Tier B, OPT-IN (needs project config).
 *
 * Designates certain directories as **front-controller surfaces** — the
 * top-level composition roots of the app (typically `screens/`, `pages/`) — and
 * forbids **all** raw HTML there. A front controller's only job is to compose
 * typed components; it must contain zero `<div>`/`<span>`/`<button>`/… of its
 * own. See docs/closed-styling-doctrine.md.
 *
 * WHY this is distinct from `no-ad-hoc-html` (and not redundant):
 *
 *   - `no-ad-hoc-html`'s DEFAULT (component-definition) model EXEMPTS a file
 *     whose export name matches its filename. A screen `LoginScreen.tsx`
 *     exporting `LoginScreen` is therefore self-exempt, and its own raw HTML
 *     sails through — exactly the surface this rule is meant to keep pure.
 *   - `no-ad-hoc-html`'s allowlist-dir model bans raw HTML everywhere outside
 *     `uiDirs`, which is often too aggressive: composite/feature primitives may
 *     legitimately own raw HTML. This rule targets ONLY the declared
 *     front-controller dirs, leaving the primitive/feature boundary to
 *     `no-ad-hoc-html`.
 *
 * So the two compose: `no-ad-hoc-html` governs the primitive boundary; this rule
 * additionally pins the composition ROOTS to zero raw HTML. Opt-in because
 * "which dirs are front controllers" is a per-project convention.
 *
 * Config:
 *   - `frontControllerDirs` (default ['src/screens/', 'src/pages/']) — the dirs
 *     whose `.tsx` files must be pure composition.
 *   - `bannedElements` (default ['*'] — ban EVERY lowercase JSX identifier).
 *     Provide a fixed list to ban only those tags.
 *   - `allowedElements` (default []) — a narrow escape hatch for specific tags.
 *   - `exemptFileSuffixes` (default ['.stories.tsx']) — files exempt by suffix.
 */
const DOCTRINE_URL =
  "https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md#no-html-in-front-controllers";

// Sentinel in `bannedElements` meaning "ban every lowercase JSX identifier".
const BAN_ALL = "*";

interface RuleOptions {
  frontControllerDirs?: string[];
  bannedElements?: string[];
  allowedElements?: string[];
  exemptFileSuffixes?: string[];
}

function pathIncludesAny(filename: string, globs: string[]): boolean {
  // Segment-anchored (shared shape with no-ad-hoc-html): prefix a leading slash
  // so `src/screens/` matches `/proj/src/screens/…` but NOT `…/adsrc/screens/…`.
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
        "Forbid all raw HTML in declared front-controller dirs (screens/pages) — composition roots must be pure component composition.",
      url: DOCTRINE_URL,
    },
    schema: [
      {
        type: "object",
        properties: {
          frontControllerDirs: { type: "array", items: { type: "string" } },
          bannedElements: { type: "array", items: { type: "string" } },
          allowedElements: { type: "array", items: { type: "string" } },
          exemptFileSuffixes: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      htmlInFrontController:
        "Raw <{{tag}}> is banned in front-controller files ({{dirs}}) — a composition root must be built ENTIRELY from typed components so its every state is enumerable and testable. Move this markup into a primitive (a variant-driven component that owns its raw HTML) and compose it here. Doctrine: " +
        DOCTRINE_URL,
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const frontControllerDirs = options.frontControllerDirs ?? [
      "src/screens/",
      "src/pages/",
    ];
    const bannedElements = options.bannedElements ?? [BAN_ALL];
    const allowedElements = new Set(options.allowedElements ?? []);
    const exemptFileSuffixes = options.exemptFileSuffixes ?? [".stories.tsx"];
    const banAll = bannedElements.includes(BAN_ALL);
    const bannedSet = new Set(bannedElements);

    if (!pathIncludesAny(context.filename, frontControllerDirs)) return {};
    if (exemptFileSuffixes.some((suffix) => context.filename.endsWith(suffix)))
      return {};

    return {
      JSXOpeningElement(node: JSXOpeningElement) {
        if (node.name.type !== "JSXIdentifier") return;
        const tag = node.name.name;
        // PascalCase = custom component (always allowed); lowercase = raw HTML.
        if (/^[A-Z]/.test(tag)) return;
        if (allowedElements.has(tag)) return;
        if (!banAll && !bannedSet.has(tag)) return;

        context.report({
          node: node as unknown as Rule.Node,
          messageId: "htmlInFrontController",
          data: { tag, dirs: frontControllerDirs.join(", ") },
        });
      },
    };
  },
};

export default rule;
