import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noDomClassnameMutation.js";

const ruleTester = makeRuleTester();

ruleTester.run("no-dom-classname-mutation", rule, {
  valid: [
    // Outside /src/ — the rule only governs source files.
    {
      code: "el.className = 'p-4';\n",
      filename: "/repo/scripts/build.ts",
    },
    // Inside /src/ui/ — className composition is the sanctioned surface there.
    {
      code: "el.className = 'p-4';\n",
      filename: "/repo/src/ui/Button.ts",
    },
    // classList call with a non-string argument (a variable) is not ad-hoc CSS.
    {
      code: "el.classList.add(dynamicClass);\n",
      filename: "/repo/src/core/widget.ts",
    },
    // classList call with a numeric literal is not a string — not ad-hoc CSS.
    {
      code: "el.classList.toggle(0);\n",
      filename: "/repo/src/core/widget.ts",
    },
    // classList call with no arguments (e.g. length read pattern) is not flagged.
    {
      code: "el.classList.add();\n",
      filename: "/repo/src/core/widget.ts",
    },
    // Computed className assignment (bracket access) is not the flat `.className`
    // member the rule targets — mirrors the original's `!left.computed` guard.
    {
      code: "el['className'] = 'p-4';\n",
      filename: "/repo/src/core/widget.ts",
    },
    // Computed classList access is likewise outside the `!object.computed` guard.
    {
      code: "el['classList'].add('p-4');\n",
      filename: "/repo/src/core/widget.ts",
    },
    // Assignment to a property other than className is fine.
    {
      code: "el.id = 'main';\n",
      filename: "/repo/src/core/widget.ts",
    },
    // The allow-listed loader path is exempt via the `allow` option.
    {
      code: "inner.className = 'mount';\n",
      filename: "/repo/src/core/loader.ts",
      options: [{ allow: ["src/core/loader.ts"] }],
    },
    // The allow match is a substring test — a partial entry still exempts the file.
    {
      code: "inner.className = 'mount';\n",
      filename: "/repo/src/core/loader.ts",
      options: [{ allow: ["loader.ts"] }],
    },
    // A classList mutation on the allow-listed path is also exempt.
    {
      code: "inner.classList.add('mount');\n",
      filename: "/repo/src/core/loader.ts",
      options: [{ allow: ["src/core/loader.ts"] }],
    },
  ],
  invalid: [
    {
      code: "el.className = 'p-4';\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    {
      code: "el.classList.add('p-4');\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    {
      code: "el.classList.toggle('open');\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    // remove() with a string literal is just as much ad-hoc CSS as add().
    {
      code: "el.classList.remove('p-4');\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    // replace() with string literals — the method name is not restricted.
    {
      code: "el.classList.replace('a', 'b');\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    // Mixed args: a dynamic value AND a string literal still flags (`.some`).
    {
      code: "el.classList.add(dynamicClass, 'p-4');\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    // A nested member chain still resolves to a flat `.className` assignment.
    {
      code: "this.root.className = 'p-4';\n",
      filename: "/repo/src/core/widget.ts",
      errors: [{ messageId: "mutation" }],
    },
    // An allow list that does not cover this file must still flag it.
    {
      code: "el.className = 'p-4';\n",
      filename: "/repo/src/core/widget.ts",
      options: [{ allow: ["src/core/loader.ts"] }],
      errors: [{ messageId: "mutation" }],
    },
    // A non-matching allow entry does not exempt a classList mutation either.
    {
      code: "el.classList.add('p-4');\n",
      filename: "/repo/src/core/widget.ts",
      options: [{ allow: ["src/core/loader.ts"] }],
      errors: [{ messageId: "mutation" }],
    },
  ],
});
