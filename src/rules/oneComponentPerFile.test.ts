import rule from './oneComponentPerFile.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('one-component-per-file', rule, {
  valid: [
    // A single component named after the file is the whole point of the rule.
    {
      code: 'export const Frame = () => <div>frame</div>;\n',
      filename: '/project/src/ui/Frame.tsx',
    },
    // Same, via a function declaration.
    {
      code: 'export function StatsBar() {\n  return <div>stats</div>;\n}\n',
      filename: '/project/src/widgets/StatsBar.tsx',
    },
    // Type-only exports are not components — they do not count against the file.
    {
      code:
        'export type FrameProps = { title: string };\n' +
        'export const Frame = (props: FrameProps) => <div>{props.title}</div>;\n',
      filename: '/project/src/ui/Frame.tsx',
    },
    // Out of scope: not under widgets/ or ui/.
    {
      code: 'export const Foo = () => <div />;\nexport const Bar = () => <div />;\n',
      filename: '/project/src/pages/Page.tsx',
    },
    // Out of scope: index re-export pivot file.
    {
      code: 'export { Frame } from "./Frame.js";\nexport { StatsBar } from "./StatsBar.js";\n',
      filename: '/project/src/ui/index.tsx',
    },
    // Out of scope: lowercase basename (utility file).
    {
      code: 'export const cn = () => "x";\nexport const clsx = () => "y";\n',
      filename: '/project/src/ui/cn.tsx',
    },
  ],
  invalid: [
    // The driving incident: two PascalCase components in one file.
    {
      code:
        'export const Widget = () => <div>widget</div>;\n' +
        'export const TicketRow = () => <div>row</div>;\n',
      filename: '/project/src/widgets/Widget.tsx',
      errors: [{ messageId: 'tooMany' }],
    },
    // A component whose name does not match the file.
    {
      code: 'export const TicketRow = () => <div>row</div>;\n',
      filename: '/project/src/widgets/Widget.tsx',
      errors: [{ messageId: 'wrongName' }],
    },
    // A PascalCase-named file with no component export at all.
    {
      code: 'export const helper = () => 1;\n',
      filename: '/project/src/ui/Frame.tsx',
      errors: [{ messageId: 'none' }],
    },
  ],
});
