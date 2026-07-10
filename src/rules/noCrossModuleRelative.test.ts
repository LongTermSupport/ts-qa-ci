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
    // Another same-module relative that lands on a non-module directory — the
    // `../` climbs but `components` is not a boundary, so it is allowed.
    {
      code: "import { Btn } from '../components/Btn';\n",
      filename: '/proj/src/ui/widgets/a.ts',
    },
    // A second aliased cross-module form — the sanctioned way to reach ui.
    { code: "import { theme } from '~/ui/theme';\n", filename: '/proj/src/domain/a.ts' },
    // Non-relative bare-package import is never a boundary crossing.
    { code: "import React from 'react';\n", filename: '/proj/src/widgets/a.ts' },
    // Bare `../..` (no landing segment) resolves to no top-level module — allowed.
    { code: "import x from '../../index';\n", filename: '/proj/src/index.ts' },
    // Custom srcMarker: with a non-default marker, a file under /src/ is NOT
    // policed because it does not contain the configured marker.
    {
      code: "import x from '../../api-client/foo';\n",
      filename: '/proj/src/widgets/a.ts',
      options: [{ srcMarker: '/app/' }],
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
    // Deeper cross-module crossing (many `../` then a boundary module) still flagged.
    {
      code: "import x from '../../../core/config';\n",
      filename: '/proj/src/widgets/zoho/nested/a.ts',
      errors: [{ messageId: 'cross', data: { path: '../../../core/config', module: 'core', alias: '~' } }],
    },
    // Configurability can be STRICTER: adding `services` to the module list makes
    // a previously-allowed `../../services/x` a boundary crossing.
    {
      code: "import x from '../../services/http';\n",
      filename: '/proj/src/widgets/a.ts',
      options: [{ modules: ['core', 'services'] }],
      errors: [{ messageId: 'cross', data: { path: '../../services/http', module: 'services', alias: '~' } }],
    },
    // Custom srcMarker gates policing IN: a file matching the configured marker
    // is policed just like the default `/src/` case.
    {
      code: "import x from '../../auth/token';\n",
      filename: '/proj/app/widgets/a.ts',
      options: [{ srcMarker: '/app/' }],
      errors: [{ messageId: 'cross', data: { path: '../../auth/token', module: 'auth', alias: '~' } }],
    },
  ],
});
