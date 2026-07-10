import rule from './noCrossModuleRelative.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

// Cross-module logic is filename-relative, so every fixture sets `filename`.
ruleTester.run('no-cross-module-relative', rule, {
  valid: [
    // Same-module relative import — allowed.
    { code: "import { props } from './props';\n", filename: '/proj/src/widgets/a.ts' },
    // Deeper same-module relative that does not resolve into a top-level module.
    { code: "import { helper } from '../lib/helper';\n", filename: '/proj/src/widgets/zoho/a.ts' },
    // ~/-aliased import — the sanctioned cross-module form.
    { code: "import { client } from '~/api-client/foo';\n", filename: '/proj/src/widgets/a.ts' },
    // File outside src/ is not policed at all.
    { code: "import x from '../../api-client/foo';\n", filename: '/proj/tools/build.ts' },
    // Configurable module list: with a custom `modules` option, `widgets` is no
    // longer a boundary and a ../../widgets import is allowed.
    {
      code: "import x from '../../widgets/foo';\n",
      filename: '/proj/src/core/a.ts',
      options: [{ modules: ['core', 'api-client'] }],
    },
  ],
  invalid: [
    // ../../ crossing from widgets into another top-level module (api-client).
    {
      code: "import x from '../../api-client/foo';\n",
      filename: '/proj/src/widgets/zoho-tickets/a.ts',
      errors: [{ messageId: 'cross' }],
    },
    // Single ../ that still lands on a top-level module.
    {
      code: "import { theme } from '../ui/theme';\n",
      filename: '/proj/src/core/a.ts',
      errors: [{ messageId: 'cross' }],
    },
    // Custom alias is reflected in the message data.
    {
      code: "import x from '../../domain/model';\n",
      filename: '/proj/src/ui/a.ts',
      options: [{ alias: '@app' }],
      errors: [{ messageId: 'cross', data: { path: '../../domain/model', module: 'domain', alias: '@app' } }],
    },
  ],
});
