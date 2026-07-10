import rule from './noDomClassnameMutation.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('no-dom-classname-mutation', rule, {
  valid: [
    // Outside /src/ — the rule only governs source files.
    {
      code: "el.className = 'p-4';\n",
      filename: '/repo/scripts/build.ts',
    },
    // Inside /src/ui/ — className composition is the sanctioned surface there.
    {
      code: "el.className = 'p-4';\n",
      filename: '/repo/src/ui/Button.ts',
    },
    // classList call with a non-string argument (a variable) is not ad-hoc CSS.
    {
      code: 'el.classList.add(dynamicClass);\n',
      filename: '/repo/src/core/widget.ts',
    },
    // Assignment to a property other than className is fine.
    {
      code: "el.id = 'main';\n",
      filename: '/repo/src/core/widget.ts',
    },
    // The allow-listed loader path is exempt via the `allow` option.
    {
      code: "inner.className = 'mount';\n",
      filename: '/repo/src/core/loader.ts',
      options: [{ allow: ['src/core/loader.ts'] }],
    },
  ],
  invalid: [
    {
      code: "el.className = 'p-4';\n",
      filename: '/repo/src/core/widget.ts',
      errors: [{ messageId: 'mutation' }],
    },
    {
      code: "el.classList.add('p-4');\n",
      filename: '/repo/src/core/widget.ts',
      errors: [{ messageId: 'mutation' }],
    },
    {
      code: "el.classList.toggle('open');\n",
      filename: '/repo/src/core/widget.ts',
      errors: [{ messageId: 'mutation' }],
    },
    // An allow list that does not cover this file must still flag it.
    {
      code: "el.className = 'p-4';\n",
      filename: '/repo/src/core/widget.ts',
      options: [{ allow: ['src/core/loader.ts'] }],
      errors: [{ messageId: 'mutation' }],
    },
  ],
});
