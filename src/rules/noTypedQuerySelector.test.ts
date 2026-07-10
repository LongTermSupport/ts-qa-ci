import rule from './noTypedQuerySelector.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

ruleTester.run('no-typed-query-selector', rule, {
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
  ],
  invalid: [
    {
      code: 'const els = document.querySelectorAll<HTMLElement>("[data-bw-widget]");\n',
      errors: [{ messageId: 'typed' }],
    },
    {
      code: 'const els = root.querySelectorAll<HTMLLIElement>("li");\n',
      errors: [{ messageId: 'typed' }],
    },
    {
      code: 'const el = document.querySelector<HTMLInputElement>("#name");\n',
      errors: [{ messageId: 'typed' }],
    },
  ],
});
