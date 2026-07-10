# CDD & Core ESLint Rules

`ts-qa-ci` ships ESLint rules in three tiers (see `PLAN.md` Decision 4/§4 in the design doc for the full rationale):

- **Tier A — always-on core.** Cannot be disabled file-by-file; the only sanctioned override is a justified entry in `tsQaConfig/tier-a-exemptions.json`. Never via inline suppression comments (see `no-eslint-disable` below).
- **Tier B — opt-in Component-Driven Development (CDD).** Presupposes a variant-prop component catalogue exists in your project. Enable once you have one.
- **Tier C — opt-in, framework/project-specific.** Architecture/convention rules that are generic but only apply to projects that have adopted the matching convention (e.g. a `~/`-aliased module layout). Enable per project.

The rule-severity maps are exported from the package for consumers to spread into `tsQaConfig/eslint.config.js`: `TIER_A_ESLINT_RULES` (also applied automatically by the always-on base config), `TIER_B_ESLINT_RULES`, `TIER_C_ESLINT_RULES`, plus the opt-in `STRICT_TYPESCRIPT_RULES` / `STRICT_TYPESCRIPT_STYLISTIC_RULES` presets (see [Strict-TypeScript baseline](#strict-typescript-baseline-preset)).

## Tier A rules

### `no-eslint-disable`

Bans all `eslint-disable*`, `eslint-enable`, `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` suppression comments (the union of every directive form).

```js
// ❌ Banned
// eslint-disable-next-line no-unused-vars
const x = 1

// ✅ Fix the underlying issue, or add a justified exemption
```

**Escape hatch**: add an entry to `tsQaConfig/tier-a-exemptions.json` — never a suppression comment (a governance mechanism whose own escape hatch is a suppression comment can't coexist with a rule that bans them).

### `no-duplicate-section-ids`

Flags duplicate literal `id="..."` JSX attributes within one file (breaks same-page anchors and accessibility).

```jsx
// ❌ Banned
<section id="pricing">...</section>
<div id="pricing">...</div>

// ✅
<section id="pricing">...</section>
<div id="pricing-details">...</div>
```

### `no-placeholder`

Bans the literal string `"PLACEHOLDER"` anywhere in string or template literals — repo-wide, including data files.

### `require-explicit-type-annotations`

Requires top-level `const` object/array literals to carry an explicit type annotation rather than relying on inference.

```ts
// ❌
const config = { retries: 3 }

// ✅
const config: RetryConfig = { retries: 3 }
```

### `require-exported-component-types`

Requires `*Props` types declared under `src/components/` to be exported, so consumers can import the type alongside the component. Configurable via `componentsPath`.

### `ssr-safe-hooks`

Flags direct reads of `window`/`document`/`localStorage`/`sessionStorage`/`navigator`, and non-deterministic values (`new Date()`, `Math.random()`) during render — both cause server/client hydration mismatches under SSR/SSG.

```jsx
// ❌ Banned during render
function Widget() {
  const width = window.innerWidth
  return <div>{width}</div>
}

// ✅ Read it in an effect
function Widget() {
  const [width, setWidth] = useState<number>()
  useEffect(() => setWidth(window.innerWidth), [])
  return <div>{width}</div>
}
```

### `validate-lazy-imports`

Validates that `React.lazy(() => import('...'))` paths resolve to a real file. TypeScript does not check dynamic `import()` paths at all — a typo here is a silent runtime 404. Configurable `aliasRoot` for `@/`-style path aliases.

### `no-ad-hoc-html` (CDD flagship, Tier A)

Bans raw HTML elements (`div`, `span`, `button`, etc.) in `.tsx` JSX under `src/pages/**` and `src/components/**`, outside a component's own definition file. Custom (PascalCase) components are always allowed.

```jsx
// ❌ Banned in a page/composing component
function HomePage() {
  return <div className="hero"><button>Click</button></div>
}

// ✅ Use or create a typed component
function HomePage() {
  return <Hero><Button>Click</Button></Hero>
}
```

**Escape hatches**: `exemptFileSuffixes` config (a component's own definition file, e.g. `Button.tsx` defining `<button>`, is exempt by convention), `allowedElements` config for a narrow allowlist, or a `tsQaConfig/tier-a-exemptions.json` entry.

**Not a gap**: string/template-literal HTML content (e.g. an `articles.ts` data file) is invisible to this AST/JSX rule by construction — a separately-governed, sanctioned content surface, not something this rule is meant to police.

**Allowlist-dir mode** (opt-in, stricter): set `uiDirs` (e.g. `['src/ui/']`) to make raw HTML legal *only* under those dirs and policed everywhere else in scope with **no** per-file component-definition exemption. Combine with `bannedElements: ['*']` to ban **every** lowercase JSX identifier (closing the fixed-list hole for `svg`, `path`, `main`, custom hyphenated elements). This is the stricter "base primitives live in one place, everything else composes them" doctrine.

### `require-error-cause`

Flags `throw new SomeError(...)` inside a `catch` block when no argument carries a `{ cause }` property — losing the original error's stack and context.

```ts
// ❌ original error discarded
try { risky() } catch (e) { throw new ApiError('failed') }

// ✅ chain the cause
try { risky() } catch (e) { throw new ApiError('failed', { cause: e }) }
```

### `no-typed-query-selector`

Bans `querySelector<T>()` / `querySelectorAll<T>()` generic type arguments — an unchecked cast in disguise (the DOM returns `Element`; the generic just lies about it). Use an `instanceof` filter instead. The `as`-cast ban's sibling. Skips `*.test.*` and generated dirs.

### `jsx-truthy-narrow`

Flags `{x && <Foo/>}` where `x` is not boolean-shaped — a non-boolean, non-empty LHS like `0` or `''` leaks straight to the DOM. Syntactic heuristic (comparison/`!`/`Boolean()`/`is*`-named, etc.); a type-aware superset is `@typescript-eslint/strict-boolean-expressions` (shipped in the strict-TS preset).

### `no-inline-component-decl-in-render`

Flags a PascalCase component declared inside another component/function — it is a brand-new type every render, remounting the whole subtree and destroying its state. Move it to module scope.

### `exhaustive-discriminated`

**Scaffolded stub** (reports nothing). Registered as Tier A so its severity slot is reserved; the real check (exhaustive discriminated-union narrowing) needs type-aware linting the package does not yet wire. Safe at `error` today — zero coverage, zero false positives.

## Tier B rules (opt-in CDD)

### `no-ad-hoc-classnames`

Bans arbitrary `className="..."` string/template literals outside a call to an allowlisted variant-resolver function (`cva`, `cn`, `clsx`, `twMerge` by default — configurable via `variantResolverNames`). Presupposes a variant-prop component catalogue; enabling before one exists will fail everywhere with no fix path.

### `variant-api-enforcement`

**Not yet implemented.** Scaffolded as a registered rule ID with `create()` reporting nothing, so config wiring and the Tier B `recommended: false` default are in place ahead of time. Its real logic (enforce every styleable component exposes typed variant props) is authored once a variant-prop catalogue actually exists to derive the convention from — see the parent plan's Task 4.6.

### `one-component-per-file`

Enforces one PascalCase component per `.tsx`, named after the file — so `find-references` and file navigation map 1:1 to components. Scope configurable via `enforcePattern` (default `src/(widgets|ui)/**.tsx`).

### `explicit-component-displayname`

Arrow-form components in scope need an explicit `Foo.displayName`, or minified React devtools shows `<Anonymous>`. Scope defaults to `src/(widgets|ui|core)/`.

### `no-error-hiding-fallback`

Bans silent empty-value fallbacks (`?? []`, `|| ''`, `?? 0`, …) that collapse the loading/error/empty distinction into "looks fine but empty". The escape hatch is a `tsQaConfig/tier-a-exemptions.json`-style config surface, never an inline comment.

### `no-dom-classname-mutation`

Bans imperative `el.className = …` and `classList.add('literal')` — an end-run around the JSX-level className rules. `allow` option accepts path fragments to exempt (e.g. a low-level DOM loader).

### `no-classname-prop` (className doctrine, axis 2 — call-site)

`className` may not be passed to a custom component; components own presentation via typed variant props. Allowed on raw lowercase HTML tags, and (carve-out) on `Foo.Bar` member-expression targets inside `uiDirs` (third-party compound passthrough, e.g. Radix parts). Config: `scopeGlobs`, `uiDirs` (default `['src/ui/']`).

### `no-classname-public-prop` (className doctrine, axis 3 — declaration-site)

Companion to `no-classname-prop`: bans a `className` member on any interface or inline object type (`TSPropertySignature`), so the prop is never *published* as a public surface even if unused. Config: `scopeGlobs`.

## Tier C rules (opt-in, architecture/convention)

### `no-default-export`

Bans `export default` — named exports keep rename/find-refs tooling reliable. Widget-mount entry files (`src/widgets/*/index.[cm]?tsx?`) are carved out (a loader needs `module.default`).

### `no-cross-module-relative`

Bans `../`-climbing imports that cross a top-level module boundary; use the `~/`-style alias instead so module boundaries stay visible. Config: `modules` (the top-level module list), `alias`, `srcMarker`.

## Strict-TypeScript baseline preset

Two opt-in severity maps exported from the package: `STRICT_TYPESCRIPT_RULES` (load-bearing) and `STRICT_TYPESCRIPT_STYLISTIC_RULES` (opinionated, further opt-in). They are **not** always-on Tier A because they are type-aware `@typescript-eslint` rules: they require the consumer's own `parserOptions.projectService`/`.project` (ESLint hard-crashes without it) and the `@typescript-eslint` plugin registered. Shipping them as plain severity maps keeps `ts-qa-ci` free of a `typescript-eslint` dependency — the consumer's own plugin supplies the rule definitions; the package supplies the opinion.

`STRICT_TYPESCRIPT_RULES` includes: the total `as`/enum ban (`no-restricted-syntax` on `TSAsExpression`/`TSTypeAssertion`/`TSEnumDeclaration`, except `as const`, plus `consistent-type-assertions`), `ban-ts-comment` lockdown, the cast-safety cluster, and the load-bearing severities (`no-explicit-any`, `no-non-null-assertion`, `no-unsafe-*`, `strict-boolean-expressions`, `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `restrict-template-expressions`, `no-unnecessary-condition`, `consistent-type-imports`, `promise-function-async`, `require-await`). Stylistic elevations (`explicit-module-boundary-types`, `method-signature-style`, `prefer-readonly`, type-export/import-side-effect hygiene) live in the stylistic map so the correctness ratchet doesn't force stylistic churn.

Adopt inside a type-aware, TS-scoped config block:

```js
import tseslint from 'typescript-eslint'
import { STRICT_TYPESCRIPT_RULES } from '@longtermsupport/ts-qa-ci'

export default [
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true } },
    rules: { ...STRICT_TYPESCRIPT_RULES },
  },
]
```

`reportUnusedDisableDirectives: 'error'` is **not** in these maps — it is a linter option (not a rule) and ships always-on in the generic base config, complementing `no-eslint-disable`.

## Configuration

- `tsQaConfig/tier-a-exemptions.json` — array of `{ ruleId, files, justification }`. Every active exemption is logged on every `ts-qa` run.
- `tsQaConfig/eslint.config.js` — add rules or override non-Tier-A rules freely. Any attempt to override a Tier A rule ID without a matching exemption is rejected at config-resolution time, not silently allowed.
- `TSQA_DISABLE_CDD=1` — coarse, always-logged escape hatch for the CDD rule subset specifically.
