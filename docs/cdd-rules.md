# CDD & Core ESLint Rules

`ts-qa-ci` ships ESLint rules in three tiers (see `PLAN.md` Decision 4/§4 in the design doc for the full rationale):

- **Tier A — always-on core.** Cannot be disabled file-by-file; the only sanctioned override is a justified entry in `tsQaConfig/tier-a-exemptions.json`. Never via inline suppression comments (see `no-eslint-disable` below).
- **Tier B — opt-in Component-Driven Development (CDD).** Presupposes a variant-prop component catalogue exists in your project. Enable once you have one.
- **Tier C — opt-in, framework/project-specific.** Not built yet in v1 (see PLAN.md Phase 3/4).

## Tier A rules

### `no-eslint-disable`

Bans all `eslint-disable*`, `@ts-ignore`, and `@ts-expect-error` suppression comments.

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

## Tier B rules (opt-in CDD)

### `no-ad-hoc-classnames`

Bans arbitrary `className="..."` string/template literals outside a call to an allowlisted variant-resolver function (`cva`, `cn`, `clsx`, `twMerge` by default — configurable via `variantResolverNames`). Presupposes a variant-prop component catalogue; enabling before one exists will fail everywhere with no fix path.

### `variant-api-enforcement`

**Not yet implemented.** Scaffolded as a registered rule ID with `create()` reporting nothing, so config wiring and the Tier B `recommended: false` default are in place ahead of time. Its real logic (enforce every styleable component exposes typed variant props) is authored once a variant-prop catalogue actually exists to derive the convention from — see the parent plan's Task 4.6.

## Configuration

- `tsQaConfig/tier-a-exemptions.json` — array of `{ ruleId, files, justification }`. Every active exemption is logged on every `ts-qa` run.
- `tsQaConfig/eslint.config.js` — add rules or override non-Tier-A rules freely. Any attempt to override a Tier A rule ID without a matching exemption is rejected at config-resolution time, not silently allowed.
- `TSQA_DISABLE_CDD=1` — coarse, always-logged escape hatch for the CDD rule subset specifically.
