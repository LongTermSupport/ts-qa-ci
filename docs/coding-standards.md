# Coding Standards

What `ts-qa`'s always-on rules assume about your codebase, and why.

## No suppression comments

`no-eslint-disable` bans `eslint-disable*`, `eslint-enable`, `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` outright. If a rule genuinely doesn't apply to your case, the fix is a justified entry in `tsQaConfig/tier-a-exemptions.json` — reviewable in a diff, logged on every run — not a comment that silently rots. The always-on base config additionally sets `reportUnusedDisableDirectives: 'error'`, so a directive that suppresses nothing is itself an error.

## Explicit types over inference for data literals

Top-level `const` object/array literals need an explicit type annotation. This isn't about distrust of inference generally — it's specifically that a data literal's *shape* is usually the contract other code depends on, and inference can silently widen or narrow that shape as the literal changes.

## No browser globals during render

`window`, `document`, `localStorage`, and non-deterministic values (`new Date()`, `Math.random()`) can't be read directly in a component's render path — only inside `useEffect`/`useLayoutEffect`/`useSyncExternalStore`. If your project doesn't do SSR/SSG at all, this rule still catches real bugs (React strict-mode double-invocation, for one) — it's not solely an SSR concern.

## No type assertions or enums (strict-TS preset)

The opt-in `STRICT_TYPESCRIPT_RULES` preset bans every non-`const` `as` assertion, angle-bracket assertions, and `enum` declarations, and pins the load-bearing `@typescript-eslint` type-aware severities at `error`. It's opt-in (not always-on) because those rules need your project's own type-aware parser wiring; see [`cdd-rules.md`](cdd-rules.md#strict-typescript-baseline-preset). The doctrine: an `as` cast is a typing lie — reach for a type guard, a schema parse (Zod), or fix the upstream type; use `as const` and union-of-literals instead of enums.

## Component-Driven Development

See [`cdd-rules.md`](cdd-rules.md) for the full CDD rule set. The short version: raw HTML elements and raw `className` strings are banned in page/component JSX outside a component's own definition file, and `className` is never accepted as a component prop (call-site or declaration-site). Everything routes through typed, variant-driven components.

## Why not just Biome?

Biome doesn't have a plugin story for arbitrary custom rules (GritQL can't express the CDD checks above), so it's off the table as an ESLint replacement here. Nothing stops you running Biome as an additional formatter alongside Prettier if you want to — `ts-qa` doesn't own that decision.
