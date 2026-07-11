import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./oneComponentPerFile.js";

const ruleTester = makeRuleTester();

ruleTester.run("one-component-per-file", rule, {
  valid: [
    // A single component named after the file is the whole point of the rule.
    {
      code: "export const Frame = () => <div>frame</div>;\n",
      filename: "/project/src/ui/Frame.tsx",
    },
    // Same, via a function declaration.
    {
      code: "export function StatsBar() {\n  return <div>stats</div>;\n}\n",
      filename: "/project/src/widgets/StatsBar.tsx",
    },
    // Type-only exports are not components — they do not count against the file.
    {
      code:
        "export type FrameProps = { title: string };\n" +
        "export const Frame = (props: FrameProps) => <div>{props.title}</div>;\n",
      filename: "/project/src/ui/Frame.tsx",
    },
    // Out of scope: not under widgets/ or ui/.
    {
      code: "export const Foo = () => <div />;\nexport const Bar = () => <div />;\n",
      filename: "/project/src/pages/Page.tsx",
    },
    // Out of scope: index re-export pivot file.
    {
      code: 'export { Frame } from "./Frame.js";\nexport { StatsBar } from "./StatsBar.js";\n',
      filename: "/project/src/ui/index.tsx",
    },
    // Out of scope: lowercase basename (utility file).
    {
      code: 'export const cn = () => "x";\nexport const clsx = () => "y";\n',
      filename: "/project/src/ui/cn.tsx",
    },
    // Re-export pivot form in a component-named file: one PascalCase specifier
    // matching the basename is the single component this file "owns".
    {
      code: 'export { Frame } from "./internal.js";\n',
      filename: "/project/src/ui/Frame.tsx",
    },
    // Renamed re-export whose EXPORTED name matches the file basename.
    {
      code: 'export { Internal as Frame } from "./internal.js";\n',
      filename: "/project/src/ui/Frame.tsx",
    },
    // A PascalCase interface declaration is type-only — it does not count as a
    // component, so the lone `Frame` const remains the single component.
    {
      code:
        "export interface FrameProps { title: string }\n" +
        "export const Frame = (props: FrameProps) => <div>{props.title}</div>;\n",
      filename: "/project/src/ui/Frame.tsx",
    },
    // A PascalCase enum is runtime but NOT a component — only `Frame` counts.
    {
      code: "export const Frame = () => <div />;\nexport enum Mode { A, B }\n",
      filename: "/project/src/ui/Frame.tsx",
    },
    // Out of scope: `.ts` (not `.tsx`) is never enforced, even with two
    // PascalCase components under ui/.
    {
      code: "export const Frame = () => 1;\nexport const StatsBar = () => 2;\n",
      filename: "/project/src/ui/Frame.ts",
    },
    // Out of scope: `.spec.tsx` test file.
    {
      code: "export const Widget = () => <div />;\nexport const TicketRow = () => <div />;\n",
      filename: "/project/src/widgets/Widget.spec.tsx",
    },
    // Out of scope: `index.ts` re-export pivot (non-tsx variant).
    {
      code: 'export { Frame } from "./Frame.js";\nexport { StatsBar } from "./StatsBar.js";\n',
      filename: "/project/src/ui/index.ts",
    },
    // Custom scope: with the default pattern, `src/components/` is out of scope
    // so two components there are allowed.
    {
      code: "export const Foo = () => <div />;\nexport const Bar = () => <div />;\n",
      filename: "/project/src/components/Card.tsx",
    },
    // Custom enforcePattern that keeps ui/ in scope still passes a good file.
    {
      code: "export const Frame = () => <div />;\n",
      filename: "/project/src/ui/Frame.tsx",
      options: [{ enforcePattern: "/src/(components|ui)/.+\\.tsx$" }],
    },
  ],
  invalid: [
    // The driving incident: two PascalCase components in one file.
    {
      code:
        "export const Widget = () => <div>widget</div>;\n" +
        "export const TicketRow = () => <div>row</div>;\n",
      filename: "/project/src/widgets/Widget.tsx",
      errors: [{ messageId: "tooMany" }],
    },
    // A component whose name does not match the file.
    {
      code: "export const TicketRow = () => <div>row</div>;\n",
      filename: "/project/src/widgets/Widget.tsx",
      errors: [{ messageId: "wrongName" }],
    },
    // A PascalCase-named file with no component export at all.
    {
      code: "export const helper = () => 1;\n",
      filename: "/project/src/ui/Frame.tsx",
      errors: [{ messageId: "none" }],
    },
    // A wrong-named component declared via `function` (not just `const`).
    {
      code: "export function TicketRow() {\n  return <div>row</div>;\n}\n",
      filename: "/project/src/widgets/Widget.tsx",
      errors: [{ messageId: "wrongName" }],
    },
    // Mixed forms — a `function` component plus a `const` component — still
    // trips the too-many branch.
    {
      code:
        "export function Widget() {\n  return <div />;\n}\n" +
        "export const TicketRow = () => <div />;\n",
      filename: "/project/src/widgets/Widget.tsx",
      errors: [{ messageId: "tooMany" }],
    },
    // Re-export pivot with two PascalCase specifiers in a component file.
    {
      code: 'export { Frame, StatsBar } from "./internal.js";\n',
      filename: "/project/src/ui/Frame.tsx",
      errors: [{ messageId: "tooMany" }],
    },
    // Single re-export specifier whose exported name mismatches the file.
    {
      code: 'export { StatsBar } from "./internal.js";\n',
      filename: "/project/src/ui/Frame.tsx",
      errors: [{ messageId: "wrongName" }],
    },
    // Renamed re-export whose EXPORTED name mismatches the file basename.
    {
      code: 'export { Internal as StatsBar } from "./internal.js";\n',
      filename: "/project/src/ui/Frame.tsx",
      errors: [{ messageId: "wrongName" }],
    },
    // A PascalCase class export is NOT a component, so a file that exports only
    // a class named after itself still has zero components.
    {
      code: "export class Frame {}\n",
      filename: "/project/src/ui/Frame.tsx",
      errors: [{ messageId: "none" }],
    },
    // A PascalCase interface export is type-only — a file exporting only that
    // has no component.
    {
      code: "export interface Frame { title: string }\n",
      filename: "/project/src/ui/Frame.tsx",
      errors: [{ messageId: "none" }],
    },
    // Custom enforcePattern brings `src/components/` into scope, so two
    // components there now trip too-many.
    {
      code: "export const Foo = () => <div />;\nexport const Bar = () => <div />;\n",
      filename: "/project/src/components/Card.tsx",
      options: [{ enforcePattern: "/src/components/.+\\.tsx$" }],
      errors: [{ messageId: "tooMany" }],
    },
  ],
});
