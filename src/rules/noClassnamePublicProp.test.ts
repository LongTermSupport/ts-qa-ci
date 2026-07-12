import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noClassnamePublicProp.js";

const ruleTester = makeRuleTester();

ruleTester.run("no-classname-public-prop", rule, {
  valid: [
    // No className member — allowed.
    {
      code: "interface FooProps { variant: string; size: number; }\n",
      filename: "/proj/src/ui/Foo.tsx",
    },
    // className declared out of scope — not policed.
    {
      code: "interface FooProps { className?: string; }\n",
      filename: "/proj/lib/Foo.ts",
    },
    // A prop merely containing the substring is not `className`.
    {
      code: "interface FooProps { classNames?: string[]; }\n",
      filename: "/proj/src/ui/Foo.tsx",
    },
    // Custom scopeGlobs: file not under the configured scope → not policed.
    {
      code: "interface FooProps { className?: string; }\n",
      filename: "/proj/src/ui/Foo.tsx",
      options: [{ scopeGlobs: ["packages/"] }],
    },
    // Anchoring: `adsrc/` must NOT satisfy the default `src/` scope.
    {
      code: "interface FooProps { className?: string; }\n",
      filename: "/proj/adsrc/Foo.tsx",
    },
    // Extending a NON-DOM base type (another plain props type) is fine — it does
    // not syntactically re-publish className.
    {
      code: "interface FooProps extends BaseProps { variant: string; }\n",
      filename: "/proj/src/ui/Foo.tsx",
    },
    // A type ending in a bearing suffix can be disabled by narrowing the config.
    {
      code: "interface FooProps extends ButtonHTMLAttributes<HTMLButtonElement> {}\n",
      filename: "/proj/src/ui/Foo.tsx",
      options: [
        {
          classNameBearingTypes: [],
          classNameBearingSuffixes: ["SVGAttributes"],
        },
      ],
    },
  ],
  invalid: [
    // Interface member — flagged.
    {
      code: "interface FooProps { className?: string; }\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameDeclared" }],
    },
    // Inline type-literal member (also a TSPropertySignature) — flagged.
    {
      code: "type FooProps = { className?: string; variant: string };\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameDeclared" }],
    },
    // String-literal key — flagged.
    {
      code: "interface FooProps { 'className': string; }\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameDeclared" }],
    },
    // Custom scopeGlobs matching the file → policed, flagged.
    {
      code: "interface FooProps { className?: string; }\n",
      filename: "/proj/packages/ui/Foo.tsx",
      options: [{ scopeGlobs: ["packages/"] }],
      errors: [{ messageId: "classNameDeclared" }],
    },
    // INHERITED: extends React.HTMLAttributes — re-publishes className.
    {
      code: "interface FooProps extends React.HTMLAttributes<HTMLDivElement> {}\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameInherited" }],
    },
    // INHERITED: bare per-element family name via the suffix heuristic.
    {
      code: "interface FooProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant: string; }\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameInherited" }],
    },
    // INHERITED: intersection type with a DOM base — flagged on the base member.
    {
      code: "type FooProps = React.ComponentPropsWithoutRef<'div'> & { variant: string };\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameInherited" }],
    },
    // INHERITED: type alias that IS the base reference directly.
    {
      code: "type FooProps = HTMLAttributes<HTMLDivElement>;\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameInherited" }],
    },
    // INHERITED: polymorphic UNION — className re-published on every branch.
    {
      code: "type FooProps = ButtonHTMLAttributes<HTMLButtonElement> | AnchorHTMLAttributes<HTMLAnchorElement>;\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [
        { messageId: "classNameInherited" },
        { messageId: "classNameInherited" },
      ],
    },
    // INHERITED: NESTED intersection member is flattened and still caught.
    {
      code: "type FooProps = ({ variant: string } & React.HTMLAttributes<HTMLDivElement>) & { size: number };\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [{ messageId: "classNameInherited" }],
    },
    // Both breaches at once: inherited base + an explicit className member.
    {
      code: "interface FooProps extends React.SVGProps<SVGSVGElement> { className?: string; }\n",
      filename: "/proj/src/ui/Foo.tsx",
      errors: [
        { messageId: "classNameInherited" },
        { messageId: "classNameDeclared" },
      ],
    },
  ],
});
