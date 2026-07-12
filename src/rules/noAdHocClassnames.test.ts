import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noAdHocClassnames.js";

const ruleTester = makeRuleTester();

// A composing (non-primitive) surface — literals here are violations.
const FEATURE = "src/components/feature/booking/X/X.tsx";
// A primitive-boundary file — literals here are the component's internals.
const PRIMITIVE = "src/components/ui/button.tsx";

ruleTester.run("no-ad-hoc-classnames", rule, {
  valid: [
    // The SAME literal pile is fine INSIDE a primitive dir — the component
    // owns its raw HTML and styles its own finite states.
    {
      filename: PRIMITIVE,
      code: "const a = <button className={cn('h-12 text-base font-semibold', VARIANT[variant])} />;\n",
    },
    // A cva product / variant-resolver call with NO authored literals, on a
    // composing surface — a catalogue reference, allowed.
    {
      filename: FEATURE,
      code: "const a = <div className={buttonVariants({ variant })} />;\n",
    },
    // Map lookups composed via cn() — named states, not authored classes.
    {
      filename: FEATURE,
      code: "const a = <div className={cn(VARIANT[variant], SIZE[size])} />;\n",
    },
    // Non-className attributes are never inspected.
    {
      filename: FEATURE,
      code: 'const a = <div id="p-4" data-state="open" aria-label="close" role="button" />;\n',
    },
    // Bare identifier that does not resolve to a same-file string const — a
    // prop/import; not an authored literal here.
    {
      filename: FEATURE,
      code: "const a = <div className={styles} />;\n",
    },
    // Out of scope entirely (not under scopeGlobs) — not policed.
    {
      filename: "scripts/build.tsx",
      code: 'const a = <div className="p-4 text-sm" />;\n',
    },
  ],
  invalid: [
    // THE BODGE: a class pile wrapped in cn() — v1 sanctioned this blindly.
    {
      filename: FEATURE,
      code: "const a = <button className={cn('h-12 text-base font-semibold border-red-200', urgent && 'bg-red-50')} />;\n",
      errors: [
        { messageId: "literalInResolver" },
        { messageId: "literalInResolver" },
      ],
    },
    // Raw literal on a composing surface.
    {
      filename: FEATURE,
      code: "const a = <span className=\"bg-primary inline-flex h-7 w-7 rounded-full\" />;\n",
      errors: [{ messageId: "rawLiteral" }],
    },
    // Plain string Literal inside a JSXExpressionContainer.
    {
      filename: FEATURE,
      code: "const a = <div className={'p-4'} />;\n",
      errors: [{ messageId: "rawLiteral" }],
    },
    // Template literal with content.
    {
      filename: FEATURE,
      code: "const a = <div className={`p-4 ${x}`} />;\n",
      errors: [{ messageId: "rawLiteral" }],
    },
    // clsx object-key form: the keys are class names.
    {
      filename: FEATURE,
      code: "const a = <div className={clsx({ 'font-bold': active })} />;\n",
      errors: [{ messageId: "literalObjectKey" }],
    },
    // Ternary branches inside cn().
    {
      filename: FEATURE,
      code: "const a = <div className={cn(open ? 'block' : 'hidden')} />;\n",
      errors: [
        { messageId: "literalInResolver" },
        { messageId: "literalInResolver" },
      ],
    },
    // Same-file const indirection (the module-const evasion).
    {
      filename: FEATURE,
      code: "const S = 'p-4 text-sm';\nconst a = <div className={S} />;\n",
      errors: [{ messageId: "rawLiteral" }],
    },
    // Member-callee resolver (utils.cn) no longer falls through silently.
    {
      filename: FEATURE,
      code: "const a = <div className={utils.cn('p-4')} />;\n",
      errors: [{ messageId: "literalInResolver" }],
    },
    // Same pile is STILL a violation on a composing surface even though a
    // primitive elsewhere may carry it — proves directory scoping, not content.
    {
      filename: "src/pages/subscriber/DashboardPage.tsx",
      code: "const a = <button className=\"rounded-md bg-primary px-4 py-2\" />;\n",
      errors: [{ messageId: "rawLiteral" }],
    },
  ],
});
