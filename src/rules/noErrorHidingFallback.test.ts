import rule from './noErrorHidingFallback.js';
import { makeRuleTester } from '../testSupport/ruleTester.js';

const ruleTester = makeRuleTester();

// The rule only fires inside widgets/core/api-client-hooks, so every fixture
// sets an explicit filename to place it in (or out of) scope.
const IN_SCOPE = '/repo/src/widgets/zoho-tickets/Widget.tsx';

ruleTester.run('no-error-hiding-fallback', rule, {
  valid: [
    // Out of scope entirely — a top-level src file is not policed.
    { code: 'const rows = data ?? [];\n', filename: '/repo/src/App.tsx' },
    // Generated api-client code is explicitly excluded even though it is under api-client.
    {
      code: 'const rows = data ?? [];\n',
      filename: '/repo/src/api-client/generated/Api.ts',
    },
    // A test file within scope is excluded.
    {
      code: 'const rows = data ?? [];\n',
      filename: '/repo/src/widgets/zoho-tickets/Widget.test.tsx',
    },
    // In scope but not an empty-literal fallback: a real default value is fine.
    { code: 'const name = user.name ?? "Anonymous";\n', filename: IN_SCOPE },
    // In scope, fallback to another expression (not an empty literal) is fine.
    { code: 'const list = primary ?? secondary;\n', filename: IN_SCOPE },
    // The Map upsert idiom is allowlisted: `m.get(k) ?? 0` feeding a `.set(...)`.
    {
      code: 'counts.set(key, (counts.get(key) ?? 0) + 1);\n',
      filename: IN_SCOPE,
    },
  ],
  invalid: [
    // The core bug: `?? []` masks loading/error/empty for a list.
    {
      code: 'const rows = tickets ?? [];\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    // `|| []` form — same hidden state, different operator.
    {
      code: 'const rows = tickets || [];\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    // `?? {}` hides a missing object.
    {
      code: 'const meta = response ?? {};\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    // `|| ''` masks the difference between "no value yet" and "empty string".
    {
      code: 'const label = title || "";\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    // `?? 0` NOT part of a Map upsert — a plain error-hiding numeric fallback.
    {
      code: 'const total = amount ?? 0;\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    // `?? false`, `?? null`, `?? undefined` are all banned empty-literal shapes.
    {
      code: 'const ok = flag ?? false;\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    {
      code: 'const value = maybe ?? null;\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    {
      code: 'const value = maybe ?? undefined;\n',
      filename: IN_SCOPE,
      errors: [{ messageId: 'hiding' }],
    },
    // Also fires under src/core and src/api-client/hooks (both in scope).
    {
      code: 'const rows = data ?? [];\n',
      filename: '/repo/src/core/loader.ts',
      errors: [{ messageId: 'hiding' }],
    },
    {
      code: 'const rows = data ?? [];\n',
      filename: '/repo/src/api-client/hooks/useTickets.ts',
      errors: [{ messageId: 'hiding' }],
    },
  ],
});
