import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noHtmlInFrontControllers.js";

const ruleTester = makeRuleTester();

const SCREEN = "/proj/src/screens/LoginScreen.tsx";
const PAGE = "/proj/src/pages/HomePage.tsx";
const FEATURE = "/proj/src/components/feature/booking/Slot.tsx";

ruleTester.run("no-html-in-front-controllers", rule, {
  valid: [
    // A front controller composed ENTIRELY of typed components — the goal.
    {
      code: "export function LoginScreen() { return <AppLayout><LoginForm /></AppLayout>; }\n",
      filename: SCREEN,
    },
    // Fragments are not raw HTML — allowed.
    {
      code: "export function LoginScreen() { return <><Header /><Body /></>; }\n",
      filename: SCREEN,
    },
    // Out of scope: a feature/primitive file may own raw HTML (that boundary is
    // no-ad-hoc-html's job, not this rule's).
    {
      code: "export function Slot() { return <button>book</button>; }\n",
      filename: FEATURE,
    },
    // Stories are exempt by default suffix.
    {
      code: "export const Default = () => <div>demo</div>;\n",
      filename: "/proj/src/screens/LoginScreen.stories.tsx",
    },
    // Colocated tests are exempt by default suffix (raw harness wrappers).
    {
      code: "it('renders', () => render(<div><LoginScreen /></div>));\n",
      filename: "/proj/src/screens/LoginScreen.test.tsx",
    },
    // Narrow allowedElements escape hatch.
    {
      code: "export function HomePage() { return <main><Hero /></main>; }\n",
      filename: PAGE,
      options: [{ allowedElements: ["main"] }],
    },
    // Custom front-controller dir config: a screen file is NOT policed when the
    // configured dirs don't include it.
    {
      code: "export function LoginScreen() { return <div>hi</div>; }\n",
      filename: SCREEN,
      options: [{ frontControllerDirs: ["src/routes/"] }],
    },
  ],
  invalid: [
    // The self-exemption hole no-ad-hoc-html's default model leaves open: the
    // screen's export matches its basename, yet its raw <div> IS flagged here.
    {
      code: "export function LoginScreen() { return <div>hi</div>; }\n",
      filename: SCREEN,
      errors: [{ messageId: "htmlInFrontController" }],
    },
    // Every lowercase tag banned by default (bannedElements defaults to ['*']).
    {
      code: "export function HomePage() { return <section><span>x</span></section>; }\n",
      filename: PAGE,
      errors: [
        { messageId: "htmlInFrontController" },
        { messageId: "htmlInFrontController" },
      ],
    },
    // A raw <button> in a screen — the classic bodge target.
    {
      code: "export function CheckoutScreen() { return <button onClick={pay}>Pay</button>; }\n",
      filename: "/proj/src/screens/CheckoutScreen.tsx",
      errors: [{ messageId: "htmlInFrontController" }],
    },
    // Fixed bannedElements list: only the listed tag fires; others pass.
    {
      code: "export function HomePage() { return <div><a href='/'>home</a></div>; }\n",
      filename: PAGE,
      options: [{ bannedElements: ["a"] }],
      errors: [{ messageId: "htmlInFrontController" }],
    },
    // Custom frontControllerDirs picks up a non-default dir.
    {
      code: "export function Root() { return <div>hi</div>; }\n",
      filename: "/proj/src/routes/Root.tsx",
      options: [{ frontControllerDirs: ["src/routes/"] }],
      errors: [{ messageId: "htmlInFrontController" }],
    },
  ],
});
