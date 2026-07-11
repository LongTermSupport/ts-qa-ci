import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noAdHocHtml.js";

const ruleTester = makeRuleTester();

ruleTester.run("no-ad-hoc-html", rule, {
  valid: [
    // --- default (component-definition) model — backwards-compatible ---
    // A component-definition file (export name matches basename) may use raw HTML.
    {
      code: "export function Card() { return <div>hi</div>; }\n",
      filename: "/proj/src/components/Card.tsx",
    },
    // Out of scope entirely — not policed.
    {
      code: "export function Whatever() { return <div>hi</div>; }\n",
      filename: "/proj/lib/misc.tsx",
    },
    // PascalCase custom components are always allowed.
    {
      code: "export function Home() { return <Hero><Button>x</Button></Hero>; }\n",
      filename: "/proj/src/pages/home.tsx",
    },
    // --- allowlist-dir model ---
    // A file under a uiDir may use raw HTML freely.
    {
      code: "export function Box() { return <div><span>x</span></div>; }\n",
      filename: "/proj/src/ui/Box.tsx",
      options: [{ scopeGlobs: ["src/"], uiDirs: ["src/ui/"] }],
    },
    // banAll: PascalCase still allowed even when every lowercase tag is banned.
    {
      code: "export function Icon() { return <Glyph />; }\n",
      filename: "/proj/src/widgets/Icon.tsx",
      options: [
        { scopeGlobs: ["src/"], uiDirs: ["src/ui/"], bannedElements: ["*"] },
      ],
    },
  ],
  invalid: [
    // --- default model ---
    // In scope, NOT a component-definition file (export name != basename) → flagged.
    {
      code: "export function HomePage() { return <div>hi</div>; }\n",
      filename: "/proj/src/pages/home.tsx",
      errors: [{ messageId: "adHocHtml" }],
    },
    // --- allowlist-dir model: stricter, no per-file exemption ---
    // In scope, outside uiDirs — flagged EVEN THOUGH the export matches the basename
    // (proves the component-definition exemption is disabled in allowlist mode).
    {
      code: "export function Panel() { return <div>hi</div>; }\n",
      filename: "/proj/src/widgets/Panel.tsx",
      options: [{ scopeGlobs: ["src/"], uiDirs: ["src/ui/"] }],
      errors: [{ messageId: "adHocHtml" }],
    },
    // banAll closes the fixed-list hole: <svg> is not in DEFAULT_BANNED_ELEMENTS
    // but is still a lowercase tag, so it is flagged when bannedElements: ['*'].
    {
      code: "export function Icon() { return <svg />; }\n",
      filename: "/proj/src/widgets/Icon.tsx",
      options: [
        { scopeGlobs: ["src/"], uiDirs: ["src/ui/"], bannedElements: ["*"] },
      ],
      errors: [{ messageId: "adHocHtml" }],
    },
  ],
});
