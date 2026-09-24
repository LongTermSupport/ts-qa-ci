import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noDevOnlyImport.js";

const ruleTester = makeRuleTester();

// Everything here is filename-relative: the rule decides whether the IMPORTER
// is shipped source and whether the IMPORTED module is dev-only.
ruleTester.run("no-dev-only-import", rule, {
  valid: [
    // Shipped source importing shipped source.
    {
      code: "import { useOrder } from '~/api-client/admin/index.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
    },
    // A test file may import dev-only source — it IS dev-only.
    {
      code: "import { handlers } from '~dev/msw/accounts/handlers.js';\n",
      filename: "/proj/src/widgets/accounts/__tests__/Widget.test.tsx",
    },
    {
      code: "import { server } from '~tests/msw/server.js';\n",
      filename: "/proj/src/api-client/admin/hooks/accounts.test.ts",
    },
    // A story may import dev-only source.
    {
      code: "import { handlers } from '~dev/msw/accounts/handlers.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.stories.tsx",
    },
    // Dev-only source may import dev-only source and shipped source.
    {
      code: "import { scenario } from './scenarios.js';\nimport { Widget } from '~/widgets/accounts/Widget.js';\n",
      filename: "/proj/src-dev/msw/accounts/handlers.ts",
    },
    // Files outside src/ (tooling, config) are not policed.
    {
      code: "import { handlers } from '~dev/msw/accounts/handlers.js';\n",
      filename: "/proj/.storybook/preview.tsx",
    },
    {
      code: "import { handlers } from '../src-dev/msw/handlers.js';\n",
      filename: "/proj/tools/capture.ts",
    },
    // A path that merely CONTAINS a dev-looking word is not a dev import.
    {
      code: "import { x } from './devices.js';\nimport { y } from './latest-results.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
    },
    // Bare packages are never dev-only by path.
    {
      code: "import { http } from 'msw';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
    },
    // Configurable: a project with no src-dev convention that names its own dir.
    {
      code: "import { fx } from '~dev/x.js';\n",
      filename: "/proj/src/a.ts",
      options: [{ devAliases: ["~fixtures"], devSourceDirs: ["fixtures"] }],
    },
  ],
  invalid: [
    // Shipped source importing dev-only source via the alias.
    {
      code: "import { handlers } from '~dev/msw/accounts/handlers.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [
        {
          messageId: "devOnly",
          data: { source: "~dev/msw/accounts/handlers.js" },
        },
      ],
    },
    // Shipped source importing the tests tree via its alias.
    {
      code: "import { server } from '~tests/msw/server.js';\n",
      filename: "/proj/src/core/queryClient.ts",
      errors: [{ messageId: "devOnly" }],
    },
    // Relative escape into src-dev/.
    {
      code: "import { scenario } from '../../../src-dev/msw/accounts/scenarios.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [{ messageId: "devOnly" }],
    },
    // Relative import of a sibling test or story module.
    {
      code: "import { fixture } from './__tests__/fixtures.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [{ messageId: "devOnly" }],
    },
    {
      code: "import { Synced } from './Widget.stories.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [{ messageId: "devOnly" }],
    },
    {
      code: "import { helper } from './Widget.test.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [{ messageId: "devOnly" }],
    },
    // Type-only imports are still a dependency on dev-only source.
    {
      code: "import type { Scenario } from '~dev/msw/accounts/scenarios.js';\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [{ messageId: "devOnly" }],
    },
    // Dynamic import and re-export forms.
    {
      code: "const m = await import('~dev/msw/accounts/handlers.js');\n",
      filename: "/proj/src/widgets/accounts/Widget.tsx",
      errors: [{ messageId: "devOnly" }],
    },
    {
      code: "export { handlers } from '~dev/msw/accounts/handlers.js';\n",
      filename: "/proj/src/widgets/accounts/index.ts",
      errors: [{ messageId: "devOnly" }],
    },
    {
      code: "export * from '~tests/helpers/index.js';\n",
      filename: "/proj/src/widgets/accounts/index.ts",
      errors: [{ messageId: "devOnly" }],
    },
    // Configurable alias list applies.
    {
      code: "import { fx } from '~fixtures/x.js';\n",
      filename: "/proj/src/a.ts",
      options: [{ devAliases: ["~fixtures"] }],
      errors: [{ messageId: "devOnly" }],
    },
  ],
});
