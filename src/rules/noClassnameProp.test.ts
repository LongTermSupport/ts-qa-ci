import rule from './noClassnameProp.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('no-classname-prop', rule, {
  valid: [
    // className on a raw HTML tag is the native DOM attribute — allowed.
    {
      code: 'const a = <div className="p-4" />;\n',
      filename: '/proj/src/pages/Home.tsx',
    },
    // Member-expression target inside a uiDir (Radix compound passthrough) — allowed.
    {
      code: 'const a = <Dialog.Title className={cls} />;\n',
      filename: '/proj/src/ui/Modal.tsx',
    },
    // Out of scope entirely — not policed.
    {
      code: 'const a = <Button className="p-4" />;\n',
      filename: '/proj/lib/Widget.tsx',
    },
    // Lowercase custom element (web component) treated as raw HTML — allowed.
    {
      code: 'const a = <my-widget className="x" />;\n',
      filename: '/proj/src/pages/Home.tsx',
    },
    // Custom scope: file not under configured scope → not policed.
    {
      code: 'const a = <Button className="x" />;\n',
      filename: '/proj/app/Home.tsx',
      options: [{ scopeGlobs: ['packages/'] }],
    },
  ],
  invalid: [
    // className passed to a PascalCase component in scope — flagged.
    {
      code: 'const a = <Button className="p-4" />;\n',
      filename: '/proj/src/pages/Home.tsx',
      errors: [{ messageId: 'classNameOnComponent' }],
    },
    // Member-expression target OUTSIDE a uiDir — flagged (carve-out is ui-only).
    {
      code: 'const a = <Dialog.Title className={cls} />;\n',
      filename: '/proj/src/components/Panel.tsx',
      errors: [{ messageId: 'classNameOnComponent' }],
    },
    // Custom uiDirs: default src/ui/ carve-out gone when overridden — flagged.
    {
      code: 'const a = <Dialog.Title className={cls} />;\n',
      filename: '/proj/src/ui/Modal.tsx',
      options: [{ scopeGlobs: ['src/'], uiDirs: ['src/primitives/'] }],
      errors: [{ messageId: 'classNameOnComponent' }],
    },
    // The uiDir carve-out is MEMBER-EXPRESSION-only: a plain PascalCase component
    // inside a uiDir is still flagged (pins that `insideUi` is not a blanket skip).
    {
      code: 'const a = <Button className="x" />;\n',
      filename: '/proj/src/ui/Modal.tsx',
      errors: [{ messageId: 'classNameOnComponent' }],
    },
    // Anchoring: `adsrc/ui/` must NOT satisfy the `src/ui/` carve-out (it only
    // contains the substring) — member-expression className is still flagged.
    {
      code: 'const a = <Dialog.Title className={cls} />;\n',
      filename: '/proj/src/components/adsrc/ui/X.tsx',
      errors: [{ messageId: 'classNameOnComponent' }],
    },
  ],
});
