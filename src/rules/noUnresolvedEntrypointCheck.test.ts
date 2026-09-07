import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noUnresolvedEntrypointCheck.js";

const ruleTester = makeRuleTester();

/**
 * A Node CLI script gates main() behind "was I invoked directly" by comparing
 * import.meta.url with process.argv[1]. The module URL is the real path and
 * argv[1] is the path as typed, so behind the symlink every package manager
 * installs the two never match, main() never runs, and the process exits 0
 * in silence. Proven against the originating instance (bin/ts-qa.js) and
 * against the other ways the same idiom is commonly spelt.
 */
ruleTester.run("no-unresolved-entrypoint-check", rule, {
  valid: [
    { code: "const x = 1;\n" },
    { code: 'if (import.meta.url === "file:///x.js") {}\n' },
    { code: 'if (process.argv[1] === "x") {}\n' },
    {
      code:
        'import { realpathSync } from "node:fs";\n' +
        'import { pathToFileURL } from "node:url";\n' +
        "const invoked = import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;\n",
    },
    {
      code:
        'import { realpathSync } from "node:fs";\n' +
        'import { fileURLToPath } from "node:url";\n' +
        "const invoked = fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);\n",
    },
  ],
  invalid: [
    {
      code:
        'import { pathToFileURL } from "node:url";\n' +
        "const invokedDirectly =\n" +
        "  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;\n",
      errors: [{ messageId: "unresolvedEntrypointCheck" }],
    },
    {
      code:
        'import { pathToFileURL } from "node:url";\n' +
        "const invoked = pathToFileURL(process.argv[1]).href === import.meta.url;\n",
      errors: [{ messageId: "unresolvedEntrypointCheck" }],
    },
    {
      code:
        'import { pathToFileURL } from "node:url";\n' +
        "const notInvoked = import.meta.url !== pathToFileURL(process.argv[1]).href;\n",
      errors: [{ messageId: "unresolvedEntrypointCheck" }],
    },
    {
      code:
        'import { fileURLToPath } from "node:url";\n' +
        "const invoked = fileURLToPath(import.meta.url) === process.argv[1];\n",
      errors: [{ messageId: "unresolvedEntrypointCheck" }],
    },
    {
      code:
        'import { fileURLToPath } from "node:url";\n' +
        'import { resolve } from "node:path";\n' +
        "const invoked = resolve(process.argv[1]) === fileURLToPath(import.meta.url);\n",
      errors: [{ messageId: "unresolvedEntrypointCheck" }],
    },
  ],
});
