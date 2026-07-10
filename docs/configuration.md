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

## Disabling tools (`tsQaConfig/ts-qa.json`)

Some projects can't run every tool in a single `ts-qa` invocation. The canonical case is **Playwright**: it needs a served site, so a project may run browser tests as a separate CI job (build → serve → `BASE_URL` → `playwright test`) and want `ts-qa` itself to cover only the static + unit surface.

Opt a tool out with a `disabledTools` array in `tsQaConfig/ts-qa.json` (a pipeline-level config, distinct from the per-tool config files above):

```json
// tsQaConfig/ts-qa.json
{
  "disabledTools": ["playwright"]
}
```

- A phase whose every tool is disabled is dropped entirely — so `disabledTools: ["playwright"]` leaves Phase 4 running just Vitest, and `["vitest", "playwright"]` skips Phase 4 altogether.
- Each disabled tool is **logged on every run** (`ts-qa: playwright: disabled (tsQaConfig/ts-qa.json)`) — never silently skipped, same principle as Tier A exemptions.
- An unknown tool name **fails loudly** rather than silently disabling nothing. Valid names: `oxlint`, `prettier`, `eslintFix`, `eslintReport`, `remarkValidateLinks`, `knip`, `tsc`, `dependencyCruiser`, `vitest`, `playwright`, `stryker`.

For a one-off run, `--skip <tool>` does the same without touching config (repeatable): `ts-qa --skip playwright`.

## Scalar/list config values

Things like banned-classname lists or path globs use a plain merge, highest precedence wins:

```
env var override  >  tsQaConfig/*.json  >  built-in default
```

## Hooks

`tsQaConfig/hookPre.ts` runs after config resolution, before any tool executes. `tsQaConfig/hookPost.ts` runs only if every phase succeeded. Both are optional — delete them if unused.

## Platform detection

`ts-qa` checks for `vite.config.{ts,js,mjs}` + a `vite` dependency to pick the Vite-specific config tier; otherwise it uses the generic tier. No manual configuration needed.

## Troubleshooting

Lessons from dogfooding `ts-qa-ci` on a real, pre-existing codebase (`lts-commerce-site`, Plan 011 Task 4.3) — the failure modes below were all real bugs, now fixed, but the symptoms are worth knowing if something in a fork or a future tool addition regresses the same way.

**ESLint seems to ignore your `tsQaConfig/eslint.config.js` entirely, or a Tier A rule you'd expect to fire doesn't.** Every `ts-qa` ESLint invocation generates a resolved config file under `node_modules/.cache/ts-qa/eslint.config.generated.mjs` and passes it explicitly via `--config`. If you're invoking `eslint` directly (bypassing `ts-qa`), you'll get ESLint's native config discovery instead — that's expected, not a bug, but it means `eslint .` and `ts-qa -t eslintReport` are not equivalent commands. Always go through `ts-qa` to get the Tier A guarantee.

**The first real run reports a huge number of CDD violations (hundreds, not a handful).** Treat this as at least as likely to be a rule bug as real debt. Spot-check 5-10 flagged files by hand before assuming the codebase needs mass remediation — an exemption-logic bug that makes a rule fire on files it should skip produces exactly this signature (see Plan 011's retrospective: an early run reported 320 violations from one such bug; the true count was 0).

**A tool (`oxlint`, `knip`, `dependency-cruiser`, `remark-validate-links`) reports on files you expected it to ignore** (vendored code, build output, archived directories). Each of these resolves its own config file (`.oxlintrc.json`, `knip.json`, `dependency-cruiser.config.cjs`, `remark-ignore.json`) through the same cascade as everything else in this doc — add or extend a `tsQaConfig/<file>` override rather than assuming the generic default's ignore list matches your repo's layout.

**Installing against an existing codebase fails on peer-dependency conflicts.** Check the *actual* constraining package, not just `ts-qa-ci`'s own floors — a peer plugin one level removed (e.g. `typescript-eslint` capping `typescript`, `eslint-plugin-react` capping `eslint`) can lag behind the tool it wraps by a major version or more. `npm view <the-actual-constraining-package> peerDependencies` tells you the real floor.
