# Configuration

Run `npx ts-qa init` to scaffold everything below into `tsQaConfig/` in your project root.

## The config cascade

For every tool's config file, `ts-qa` looks in three places, first match wins:

1. `tsQaConfig/<file>` — your project override
2. `ts-qa-ci`'s platform-specific default (e.g. Vite-specific tweaks)
3. `ts-qa-ci`'s generic default

**Exception**: `eslint.config.js` does not work this way — see below.

## The one exception: `eslint.config.js`

ESLint carries `ts-qa-ci`'s always-on core rules (Tier A — see [`cdd-rules.md`](cdd-rules.md)). If your own `eslint.config.js` could wholesale-replace the base config, you could silently drop the entire core tier. Instead:

- `tsQaConfig/eslint.config.js` is **merged after** the base config — it can add rules, but not replace the base.
- Any rule object in your file that touches a Tier A rule ID is **rejected** unless you have a matching entry in `tsQaConfig/tier-a-exemptions.json`.

```json
// tsQaConfig/tier-a-exemptions.json
[
  {
    "ruleId": "ts-qa/no-ad-hoc-html",
    "files": ["src/pages/design-system/**"],
    "justification": "Design system catalogue page intentionally shows raw HTML for reference."
  }
]
```

Every active exemption is printed on every `ts-qa` run — never silent.

## Scalar/list config values

Things like banned-classname lists or path globs use a plain merge, highest precedence wins:

```
env var override  >  tsQaConfig/*.json  >  built-in default
```

## Hooks

`tsQaConfig/hookPre.ts` runs after config resolution, before any tool executes. `tsQaConfig/hookPost.ts` runs only if every phase succeeded. Both are optional — delete them if unused.

## Platform detection

`ts-qa` checks for `vite.config.{ts,js,mjs}` + a `vite` dependency to pick the Vite-specific config tier; otherwise it uses the generic tier. No manual configuration needed.
