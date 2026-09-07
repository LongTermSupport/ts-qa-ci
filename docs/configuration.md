# Configuration

Run `npx ts-qa init` to scaffold everything below into `tsQaConfig/` in your project root.

## The config cascade

For every tool's config file, `ts-qa` looks in three places, first match wins:

1. `tsQaConfig/<file>` — your project override
2. `ts-qa-ci`'s platform-specific default (e.g. Vite-specific tweaks)
3. `ts-qa-ci`'s generic default

**Exception**: `eslint.config.js` does not work this way — see below.

## ESLint: one config, two entrypoints (SSoT)

ESLint is special because it has **two** ways to run — `npx eslint` (and your editor's inline lint) and `npx ts-qa` — and the whole promise of qa-ci is that they run the **identical** rule set. If they diverge, a green result from either proves nothing.

### `tsQaConfig/eslint.config.js` is the single home for ALL project lint opinion

Everything project-specific goes here — extra plugins, your own rules, a strict-TypeScript preset, per-directory overrides. `ts-qa` composes it **after** its always-on Tier A core (see [`cdd-rules.md`](cdd-rules.md)) into one resolved config, and runs ESLint against that. Because the Tier A base is the delivery mechanism for the always-on guarantee, your additions can only **add**:

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

The justification is checked for content, not only presence: it must be long enough to name the hazard being accepted and the scope of the exemption, and a phrase that could be pasted onto any exemption unchanged (`needed for now`, `legacy`, `TODO`, `temporary` and the like) is rejected with the entry named. The check cannot tell whether a sentence is true; that is the reviewer's judgement, which is why every justification is printed where a vacuous one sits next to its neighbours.

### The project-root `eslint.config.js` is an OPTIONAL delegator that MUST stay in sync

A project-root `eslint.config.js` is **not required** — you can lint solely through `npx ts-qa` (it uses its own generated config under `node_modules/.cache/ts-qa/`). But most projects want `npx eslint` and IDE inline lint to work too. If you keep a root config, it **must** be a thin delegator to ts-qa's resolved config — never a hand-rolled second rule set:

```js
// eslint.config.js (project root) — scaffolded by `ts-qa init`
import { projectEslintConfig } from "@longtermsupport/ts-qa-ci";

export default await projectEslintConfig(import.meta.url);
```

`projectEslintConfig` returns the **same** composed config ts-qa runs, so `npx eslint`, your editor, and `npx ts-qa` are identical by construction. The `eslintConfigParity` Phase 0 check enforces this: if a root config is present but does **not** delegate, the pipeline fails immediately with migration guidance. (No root config at all is fine — nothing can diverge.)

**Do not** put project rules in the root config. Put them in `tsQaConfig/eslint.config.js`; the root delegator picks them up automatically for both entrypoints.

### `nonAppSurfaces`: lint stories/tests/scripts without the component-authoring rules

Stories, tests, and dev scripts legitimately break the closed-styling / component-authoring doctrine (a story renders raw HTML on purpose; a test passes a `className` to probe a primitive). The wrong fix is an ESLint `ignores` entry — that drops the files from **all** linting, so safety and type rules stop covering them too. Instead list them under `nonAppSurfaces` in `tsQaConfig/ts-qa.json`:

```json
// tsQaConfig/ts-qa.json
{
  "nonAppSurfaces": [
    "**/*.stories.tsx",
    "**/*.test.{ts,tsx}",
    "e2e/**",
    "scripts/**"
  ]
}
```

ts-qa appends a final override that turns **only** the component-authoring CDD rules off on those globs (`no-ad-hoc-html`, `no-classname-prop`, `no-classname-public-prop`, `no-html-in-front-controllers`, `require-exported-component-types`, `no-inline-component-decl-in-render`, `no-duplicate-section-ids`, `jsx-truthy-narrow`) — every safety/correctness rule stays live. Override the disabled set with an optional `nonAppSurfaceRules` array.

### `surfaces`: the named-surface model (recommended over hand-rolled globs)

`nonAppSurfaces` above is the raw, low-level escape hatch: you list every glob yourself and you only ever get one behaviour (turn the CDD rules off). Every project ends up re-typing the same stories/tests/e2e/scripts globs, and the machine-generated dir still has to be `ignore`d separately in `eslint.config.js` — exactly the blind-spot generator that lets files silently fall out of linting.

The `surfaces` key replaces that with a **standard taxonomy owned by ts-qa-ci**. Every project has the same handful of code surfaces, each wanting a different QA posture, so ts-qa-ci ships the defaults and you only NAME the dirs that differ:

```json
// tsQaConfig/ts-qa.json
{
  "surfaces": true
}
```

`"surfaces": true` (or `{}`) opts in to all the built-in defaults. Override just what differs — a surface value is a **directory** (`"e2e"` → `e2e/**`), an explicit **glob array**, `false` to disable a surface, or `{ "globs": …, "rules": [...] }` to also customise which rules switch off:

```json
{
  "surfaces": {
    "e2e": "tests/e2e",
    "scripts": ["scripts/**", "*.config.ts", "capture-*.ts"],
    "stories": false
  }
}
```

The built-in surfaces and their default globs:

| Surface     | Posture                    | Default globs                                                                |
| ----------- | -------------------------- | ---------------------------------------------------------------------------- |
| `source`    | ALL ts-qa rules **ON**     | `src/**`                                                                     |
| `tests`     | ts-qa's own rules **off**  | `**/*.test.{ts,tsx}`, `**/*.spec.{ts,tsx}`, `src/test/**`, `**/__tests__/**` |
| `stories`   | ts-qa's own rules **off**  | `**/*.stories.{ts,tsx}`, `**/*.mdx`                                          |
| `e2e`       | ts-qa's own rules **off**  | `e2e/**`, `tests/e2e/**`, `**/*.e2e.{ts,tsx}`                                |
| `scripts`   | ts-qa's own rules **off**  | `scripts/**`, `*.config.{ts,js,mjs,cts,mts}`, `capture-*.ts`                 |
| `generated` | **IGNORED** (not authored) | `src/generated/**`, `**/*.gen.ts`                                            |

- **source** is the shipped app — every ts-qa rule applies (the whole point). (The type-aware strict-TS block stays in your `eslint.config.js` because it depends on your tsconfig layout; `source` just names the app dir.)
- **non-app** surfaces (tests/stories/e2e/scripts) get **all** ts-qa rule ids turned off — computed from the plugin's own tier maps, so a newly-shipped rule is covered automatically — appended after the Tier A override guard (ts-qa's sanctioned carve-out, no exemption needed). The files are **still fully linted** by your own rules (strict-TS, `local/*`, storybook); ts-qa's component-authoring doctrine simply doesn't apply to non-app code. **No blind spot.**
- **generated** surfaces contribute to the resolved config's global `ignores` — machine-generated code is not authored, so it is not linted.

A custom surface name you invent (not in the table) defaults to the **non-app** posture. Prefer `surfaces` for the standard case; drop to `nonAppSurfaces` only for a bespoke off-list that doesn't fit the taxonomy.

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
- An unknown tool name **fails loudly** rather than silently disabling nothing. Valid names: `eslintConfigParity`, `oxlint`, `prettier`, `eslintFix`, `eslintReport`, `remarkValidateLinks`, `knip`, `tsc`, `dependencyCruiser`, `vitest`, `playwright`, `stryker`.

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

**`npx eslint` reports differently from `ts-qa -t eslintReport` (a Tier A/CDD rule fires in one but not the other).** They **must** be equivalent — that is the SSoT invariant. `ts-qa` runs ESLint against a generated resolved config (`node_modules/.cache/ts-qa/eslint.config.generated.mjs`, passed via `--config`); `npx eslint` uses native discovery of your project-root `eslint.config.js`. They agree **only** when the root config delegates to `projectEslintConfig` (see "ESLint: one config, two entrypoints" above). If they disagree, your root config is hand-rolling its own rules — the `eslintConfigParity` Phase 0 check exists to catch exactly this and will fail the pipeline. Fix it by replacing the root config with the two-line delegator and moving any project rules into `tsQaConfig/eslint.config.js`; or delete the root config to lint solely through `ts-qa`.

**The first real run reports a huge number of CDD violations (hundreds, not a handful).** Treat this as at least as likely to be a rule bug as real debt. Spot-check 5-10 flagged files by hand before assuming the codebase needs mass remediation — an exemption-logic bug that makes a rule fire on files it should skip produces exactly this signature (see Plan 011's retrospective: an early run reported 320 violations from one such bug; the true count was 0).

**A tool (`oxlint`, `knip`, `dependency-cruiser`, `remark-validate-links`) reports on files you expected it to ignore** (vendored code, build output, archived directories). Each of these resolves its own config file (`.oxlintrc.json`, `knip.json`, `dependency-cruiser.config.cjs`, `remark-ignore.json`) through the same cascade as everything else in this doc — add or extend a `tsQaConfig/<file>` override rather than assuming the generic default's ignore list matches your repo's layout.

**Installing against an existing codebase fails on peer-dependency conflicts.** Check the _actual_ constraining package, not just `ts-qa-ci`'s own floors — a peer plugin one level removed (e.g. `typescript-eslint` capping `typescript`, `eslint-plugin-react` capping `eslint`) can lag behind the tool it wraps by a major version or more. `npm view <the-actual-constraining-package> peerDependencies` tells you the real floor.
