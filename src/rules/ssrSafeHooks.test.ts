import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./ssrSafeHooks.js";

const ruleTester = makeRuleTester();

ruleTester.run("ssr-safe-hooks", rule, {
  valid: [
    // BUG B: an object-literal key named `document` is not a browser-global read.
    {
      code: "const x = { document: 1 };\n",
    },
    // BUG B: a method definition named `window` is likewise a key, not a read.
    {
      code: "class A { window() { return 1; } }\n",
    },
    // Member-expression property position (`foo.document`) is not the global — allowed.
    {
      code: "function C() { return foo.document; }\n",
    },
    // Read deferred inside useEffect callback (two function boundaries) — safe.
    {
      code: "function C() { useEffect(() => { const t = document.title; }); return t; }\n",
    },
  ],
  invalid: [
    // A real `document.title` read during render must still be flagged.
    {
      code: "function C() { const t = document.title; return t; }\n",
      errors: [{ messageId: "browserGlobal" }],
    },
    // A COMPUTED object-literal key genuinely reads the global — still flagged
    // (proves the key carve-out is limited to non-computed keys).
    {
      code: "const x = { [window]: 1 };\n",
      errors: [{ messageId: "browserGlobal" }],
    },
  ],
});
