import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noEslintDisable.js";

const ruleTester = makeRuleTester();

ruleTester.run("no-eslint-disable", rule, {
  valid: [
    { code: "const x = 1;\n" },
    { code: "// an ordinary explanatory comment\nconst x = 1;\n" },
    { code: "/* a block comment describing intent */\nconst x = 1;\n" },
    // @ts-check opts INTO type-checking — not a suppression, must pass.
    { code: "// @ts-check\nconst x = 1;\n" },
    // A word that merely starts like a directive but is not one must not match.
    {
      code: "// eslint-disabler is a made-up word, not a directive\nconst x = 1;\n",
    },
  ],
  invalid: [
    {
      code: "// eslint-disable no-console\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "// eslint-disable-next-line no-console\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "const x = 1; // eslint-disable-line no-console\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "/* eslint-enable */\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "// @ts-ignore\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "// @ts-expect-error\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "// @ts-nocheck\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    // oxlint is the phase 0 pre-filter; its directive forms mirror ESLint's and
    // suppress its findings with nothing in the project record seeing them.
    {
      code: "// oxlint-disable no-unused-vars\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "// oxlint-disable-next-line no-unused-vars\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "const x = 1; // oxlint-disable-line no-unused-vars\n",
      errors: [{ messageId: "noSuppression" }],
    },
    {
      code: "/* oxlint-enable */\nconst x = 1;\n",
      errors: [{ messageId: "noSuppression" }],
    },
  ],
});
