import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noTypedQuerySelector.js";

const ruleTester = makeRuleTester();

ruleTester.run("no-typed-query-selector", rule, {
  valid: [
    // The sanctioned shape: no type argument, narrow at runtime with instanceof.
    {
      code: 'const els = Array.from(document.querySelectorAll(".foo")).filter((el): el is HTMLElement => el instanceof HTMLElement);\n',
    },
    // Plain untyped querySelector is fine.
    { code: 'const el = document.querySelector(".foo");\n' },
    // querySelectorAll without a type argument is fine.
    { code: 'const els = root.querySelectorAll("[data-bw-widget]");\n' },
    // A generic type argument on some OTHER method must not be flagged.
    { code: 'const x = container.getAttribute<string>("data-id");\n' },
    // Explicit instanceof guard downstream, no generic cast — allowed.
    {
      code: 'const node = root.querySelector("li");\nif (node instanceof HTMLLIElement) { node.value = 1; }\n',
    },
    // Carve-out: generated api-client code is exempt even with a type argument.
    {
      code: 'const els = document.querySelectorAll<HTMLElement>("[data-bw-widget]");\n',
      filename: "/repo/src/api-client/generated/dom.ts",
    },
    // Carve-out: test files are exempt even with a type argument.
    {
      code: 'const el = document.querySelector<HTMLInputElement>("#name");\n',
      filename: "/repo/src/widget/widget.test.ts",
    },
    // Computed (non-Identifier) property is not the querySelector shape — not flagged.
    {
      code: 'const els = document["querySelectorAll"]<HTMLElement>(".foo");\n',
    },
    // A bare (non-member) call named querySelector is not the DOM API shape.
    {
      code: 'const els = querySelectorAll<HTMLElement>(".foo");\n',
    },
    // Empty type-argument list (defensive) — nothing to flag.
    { code: 'const el = document.querySelector(".foo");\nconst n = 1;\n' },
  ],
  invalid: [
    {
      code: 'const els = document.querySelectorAll<HTMLElement>("[data-bw-widget]");\n',
      errors: [{ messageId: "typed" }],
    },
    {
      code: 'const els = root.querySelectorAll<HTMLLIElement>("li");\n',
      errors: [{ messageId: "typed" }],
    },
    {
      code: 'const el = document.querySelector<HTMLInputElement>("#name");\n',
      errors: [{ messageId: "typed" }],
    },
    // Chained member expression still resolves to a querySelector call.
    {
      code: 'const el = document.body.querySelector<HTMLElement>(".foo");\n',
      errors: [{ messageId: "typed" }],
    },
    // A typed call in a NON-generated src file is flagged (carve-out is path-specific).
    {
      code: 'const els = root.querySelectorAll<HTMLElement>("[data-bw-widget]");\n',
      filename: "/repo/src/api-client/manual/dom.ts",
      errors: [{ messageId: "typed" }],
    },
    // A .ts file that merely contains "test" in the name (not a *.test.ts) is NOT exempt.
    {
      code: 'const el = document.querySelector<HTMLInputElement>("#name");\n',
      filename: "/repo/src/testHelpers.ts",
      errors: [{ messageId: "typed" }],
    },
  ],
});
