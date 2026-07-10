import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import rule from './validateLazyImports.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

// Resolve relative to this test's own directory so the rule's fs lookups hit
// real files: this very rule module (validateLazyImports.ts) is a guaranteed
// sibling that any relative-import fixture can point at.
const here = dirname(fileURLToPath(import.meta.url));
const fixtureFile = join(here, 'fixture.tsx');

ruleTester.run('validate-lazy-imports', rule, {
  valid: [
    // React.lazy() pointing at a real sibling file — resolves, so allowed.
    {
      code: "import React from 'react';\nconst C = React.lazy(() => import('./validateLazyImports'));\n",
      filename: fixtureFile,
    },
    // BUG A: bare `lazy` imported from react, pointing at a real file — allowed.
    {
      code: "import { lazy } from 'react';\nconst C = lazy(() => import('./validateLazyImports'));\n",
      filename: fixtureFile,
    },
    // A bare `lazy()` NOT imported from react is out of scope — not flagged even
    // with a bogus path (avoids false positives on unrelated helpers).
    {
      code: "const lazy = (f) => f;\nconst C = lazy(() => import('./does-not-exist'));\n",
      filename: fixtureFile,
    },
  ],
  invalid: [
    // React.lazy() with a non-existent path — the original caught case.
    {
      code: "import React from 'react';\nconst C = React.lazy(() => import('./does-not-exist'));\n",
      filename: fixtureFile,
      errors: [{ messageId: 'unresolvedImport' }],
    },
    // BUG A: bare `lazy()` imported from react with a non-existent path — flagged.
    {
      code: "import { lazy } from 'react';\nconst C = lazy(() => import('./does-not-exist'));\n",
      filename: fixtureFile,
      errors: [{ messageId: 'unresolvedImport' }],
    },
  ],
});
