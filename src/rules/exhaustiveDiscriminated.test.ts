import rule from './exhaustiveDiscriminated.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

// exhaustive-discriminated is a scaffolded STUB: it needs type-aware lint
// (getTypeChecker) which ts-qa-ci does not wire, so it reports nothing today.
// There are therefore NO invalid cases — the valid cases assert that even the
// exact pattern the rule will eventually flag (a non-exhaustive if-ladder over
// a discriminated union) is currently accepted, proving the stub is inert.
ruleTester.run('exhaustive-discriminated', rule, {
  valid: [
    { code: 'const x = 1;\n' },
    {
      code: [
        "type Event = { kind: 'open' } | { kind: 'close' } | { kind: 'pending' };",
        'function handle(e: Event): string {',
        "  if (e.kind === 'open') return 'o';",
        "  if (e.kind === 'close') return 'c';",
        "  return 'unhandled';",
        '}',
        '',
      ].join('\n'),
    },
  ],
  invalid: [],
});
