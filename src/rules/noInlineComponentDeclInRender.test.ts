import { makeRuleTester } from '../testSupport/ruleTester.js';
import rule from './noInlineComponentDeclInRender.js';

const ruleTester = makeRuleTester();

// The rule only enforces under `/src/`; RuleTester needs an explicit filename
// so the ENFORCE_PATTERN gate resolves the way each fixture intends.
const SRC = '/project/src/Widget.tsx';
const OUTSIDE = '/project/lib/Widget.tsx';

ruleTester.run('no-inline-component-decl-in-render', rule, {
  valid: [
    // Module-scope arrow component — the normal, correct case.
    {
      filename: SRC,
      code: 'const Card = () => <div>hi</div>;\n',
    },
    // Module-scope function-declaration component.
    {
      filename: SRC,
      code: 'function Card() {\n  return <div>hi</div>;\n}\n',
    },
    // A non-component arrow (camelCase) inside a component body is fine — only
    // PascalCase declarations are treated as components.
    {
      filename: SRC,
      code: 'function Card() {\n  const helper = () => <div>hi</div>;\n  return helper();\n}\n',
    },
    // Per-call inline JSX in an anonymous callback is not a named component decl.
    {
      filename: SRC,
      code: 'function List({ rows }: { rows: string[] }) {\n  return <ul>{rows.map((r) => <li key={r}>{r}</li>)}</ul>;\n}\n',
    },
    // Same offending shape, but outside `/src/` — the rule does not enforce here.
    {
      filename: OUTSIDE,
      code: 'function Card() {\n  const Inner = () => <div>hi</div>;\n  return <Inner />;\n}\n',
    },
    // Module-scope FunctionExpression assigned to a PascalCase const — the init
    // is a function expression, but the declarator is NOT inside another
    // function, so it is the correct module-scope case and is not flagged.
    {
      filename: SRC,
      code: 'const Card = function () {\n  return <div>hi</div>;\n};\n',
    },
    // A camelCase nested FunctionDeclaration inside a component is a plain helper,
    // not a component — only PascalCase names are treated as components.
    {
      filename: SRC,
      code: 'function Card() {\n  function helper() {\n    return <div>hi</div>;\n  }\n  return helper();\n}\n',
    },
    // Deeply nested anonymous inline JSX (map inside map) has no named component
    // declaration anywhere — anonymous callbacks are never flagged.
    {
      filename: SRC,
      code: 'function Grid({ rows }: { rows: string[][] }) {\n  return <table>{rows.map((row) => <tr>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</table>;\n}\n',
    },
  ],
  invalid: [
    // PascalCase arrow component declared inside another component's body.
    {
      filename: SRC,
      code: 'function Card() {\n  const Inner = () => <div>hi</div>;\n  return <Inner />;\n}\n',
      errors: [{ messageId: 'inlineComponent' }],
    },
    // PascalCase FunctionExpression assigned inside another component's body.
    {
      filename: SRC,
      code: 'function Card() {\n  const Inner = function () {\n    return <div>hi</div>;\n  };\n  return <Inner />;\n}\n',
      errors: [{ messageId: 'inlineComponent' }],
    },
    // Nested PascalCase FunctionDeclaration inside another function.
    {
      filename: SRC,
      code: 'function Card() {\n  function Inner() {\n    return <div>hi</div>;\n  }\n  return <Inner />;\n}\n',
      errors: [{ messageId: 'inlineComponent' }],
    },
    // PascalCase arrow component declared inside a module-scope ARROW component —
    // the parent-chain walk must find the enclosing arrow function, not just a
    // FunctionDeclaration.
    {
      filename: SRC,
      code: 'const Outer = () => {\n  const Inner = () => <div>hi</div>;\n  return <Inner />;\n};\n',
      errors: [{ messageId: 'inlineComponent' }],
    },
    // PascalCase component buried inside a nested render callback (a `.map`
    // callback nested inside a component). The declarator is several function
    // scopes deep — the parent-chain walk must still reach an enclosing function.
    {
      filename: SRC,
      code: 'function List({ items }: { items: string[] }) {\n  return <ul>{items.map((item) => {\n    const Row = () => <li>{item}</li>;\n    return <Row key={item} />;\n  })}</ul>;\n}\n',
      errors: [{ messageId: 'inlineComponent' }],
    },
    // PascalCase component declared inside a custom hook body — still an inline
    // component declaration inside a function.
    {
      filename: SRC,
      code: 'function useThing() {\n  const Panel = () => <div>panel</div>;\n  return Panel;\n}\n',
      errors: [{ messageId: 'inlineComponent' }],
    },
  ],
});
