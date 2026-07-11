import { makeRuleTester } from '../testSupport/ruleTester.js';
import rule from './noAdHocClassnames.js';

const ruleTester = makeRuleTester();

ruleTester.run('no-ad-hoc-classnames', rule, {
  valid: [
    // Sanctioned variant-resolver call — the whole point of the rule.
    {
      code: "const a = <div className={cn('p-4')} />;\n",
    },
    // Another default resolver (clsx) — allowed.
    {
      code: "const a = <div className={clsx('p-4', active && 'font-bold')} />;\n",
    },
    // Non-className attributes are out of scope.
    {
      code: 'const a = <div id="p-4" />;\n',
    },
    // A bare identifier expression (variable) is not a raw literal — allowed.
    {
      code: 'const a = <div className={styles} />;\n',
    },
  ],
  invalid: [
    // Plain string attribute — the original caught case.
    {
      code: 'const a = <div className="p-4" />;\n',
      errors: [{ messageId: 'adHocClassname' }],
    },
    // BUG D: a plain string Literal inside a JSXExpressionContainer must also be flagged.
    {
      code: "const a = <div className={'p-4'} />;\n",
      errors: [{ messageId: 'adHocClassname' }],
    },
    // Template literal inside a container — flagged (existing behaviour).
    {
      code: 'const a = <div className={`p-4 ${active}`} />;\n',
      errors: [{ messageId: 'adHocClassname' }],
    },
  ],
});
