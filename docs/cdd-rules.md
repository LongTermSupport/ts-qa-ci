# CDD & Core ESLint Rules

`ts-qa-ci` ships ESLint rules in three tiers (see `PLAN.md` Decision 4/§4 in the design doc for the full rationale):

- **Tier A — always-on core.** Cannot be disabled file-by-file; the only sanctioned override is a justified entry in `tsQaConfig/tier-a-exemptions.json`. Never via inline suppression comments (see `no-eslint-disable` below).
- **Tier B — opt-in Component-Driven Development (CDD).** Presupposes a variant-prop component catalogue exists in your project. Enable once you have one.
- **Tier C — opt-in, framework/project-specific.** Architecture/convention rules that are generic but only apply to projects that have adopted the matching convention (e.g. a `~/`-aliased module layout). Enable per project.

The rule-severity maps are exported from the package for consumers to spread into `tsQaConfig/eslint.config.js`: `TIER_A_ESLINT_RULES` (also applied automatically by the always-on base config), `TIER_B_ESLINT_RULES`, `TIER_C_ESLINT_RULES`, plus the opt-in `STRICT_TYPESCRIPT_RULES` / `STRICT_TYPESCRIPT_STYLISTIC_RULES` presets (see [Strict-TypeScript baseline](#strict-typescript-baseline-preset)).

## Tier A rules

### `no-eslint-disable`

Bans all `eslint-disable*`, `eslint-enable`, `oxlint-disable*`, `oxlint-enable`, `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` suppression comments (the union of every directive form, including the phase 0 oxlint pre-filter's).

```js
// ❌ Banned
// eslint-disable-next-line no-unused-vars
const x = 1;

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

Requires **exported** top-level `const` object/array literals to carry an explicit type annotation rather than relying on inference — they are the module's API surface, where an inferred-and-widened type is a real hazard for consumers. **Non-exported** top-level consts are private implementation detail (e.g. an internal zod shape consumed by `z.object(...)`, where an explicit annotation would destroy precise inference) and are not policed.

```ts
// ❌ exported, inferred
export const config = { retries: 3 };

// ✅ exported, annotated
export const config: RetryConfig = { retries: 3 };

// ✅ not exported — private detail, left alone
const internalShape = { retries: 3 };

// ✅ explicit WITHOUT widening — `satisfies` / `as const` both satisfy the rule
export const config = { retries: 3 } satisfies RetryConfig;
export const codes = [400, 500] as const;
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
  return (
    <div className="hero">
      <button>Click</button>
    </div>
  );
}

// ✅ Use or create a typed component
function HomePage() {
  return (
    <Hero>
      <Button>Click</Button>
    </Hero>
  );
}
```

**Escape hatches**: `exemptFileSuffixes` config (a component's own definition file, e.g. `Button.tsx` defining `<button>`, is exempt by convention), `allowedElements` config for a narrow allowlist, or a `tsQaConfig/tier-a-exemptions.json` entry.

**Not a gap**: string/template-literal HTML content (e.g. an `articles.ts` data file) is invisible to this AST/JSX rule by construction — a separately-governed, sanctioned content surface, not something this rule is meant to police.

**Allowlist-dir mode** (opt-in, stricter): set `uiDirs` (e.g. `['src/ui/']`) to make raw HTML legal _only_ under those dirs and policed everywhere else in scope with **no** per-file component-definition exemption. Combine with `bannedElements: ['*']` to ban **every** lowercase JSX identifier (closing the fixed-list hole for `svg`, `path`, `main`, custom hyphenated elements). This is the stricter "base primitives live in one place, everything else composes them" doctrine.

**Composition roots**: if you want the strictness of "zero raw HTML" _only_ in your top-level composition roots (screens/pages) while leaving the primitive boundary to the default model here, use the opt-in [`no-html-in-front-controllers`](#no-html-in-front-controllers) — it closes the default-model self-exemption hole (a screen whose export matches its filename) without forcing allowlist-mode's blanket ban.

### `require-error-cause`

Flags `throw new SomeError(...)` inside a `catch` block when no argument carries a `{ cause }` property — losing the original error's stack and context.

```ts
// ❌ original error discarded
try {
  risky();
} catch (e) {
  throw new ApiError("failed");
}

// ✅ chain the cause
try {
  risky();
} catch (e) {
  throw new ApiError("failed", { cause: e });
}
```

### `no-typed-query-selector`

Bans `querySelector<T>()` / `querySelectorAll<T>()` generic type arguments — an unchecked cast in disguise (the DOM returns `Element`; the generic just lies about it). Use an `instanceof` filter instead. The `as`-cast ban's sibling. Skips `*.test.*` and generated dirs.

### `jsx-truthy-narrow`

Flags `{x && <Foo/>}` where `x` is not boolean-shaped — a non-boolean, non-empty LHS like `0` or `''` leaks straight to the DOM. Syntactic heuristic (comparison/`!`/`Boolean()`/`is*`-named, etc.); a type-aware superset is `@typescript-eslint/strict-boolean-expressions` (shipped in the strict-TS preset).

### `no-inline-component-decl-in-render`

Flags a PascalCase component declared inside another component/function — it is a brand-new type every render, remounting the whole subtree and destroying its state. Move it to module scope.

### `exhaustive-discriminated`

**Scaffolded stub** (reports nothing). Registered as Tier A so its severity slot is reserved; the real check (exhaustive discriminated-union narrowing) needs type-aware linting the package does not yet wire. Safe at `error` today — zero coverage, zero false positives.

### `no-restricted-syntax` as/enum ban (Tier A)

The generic base config wires `no-restricted-syntax` at `error` with three selectors: non-`const` `TSAsExpression`, angle-bracket `TSTypeAssertion`, and `TSEnumDeclaration`. An `as` cast is a typing lie — use a type guard, a schema parse, or fix the upstream type (`as const` is allowed); use unions / `as const` objects instead of enums. This is the one strict-TS-baseline rule that is **always-on** (not opt-in) because it is purely syntactic: it reads the TS AST your parser already emits, needs no `projectService`, and cannot crash. Compose extra patterns with the exported `AS_ENUM_BAN_SELECTORS` (`['error', ...AS_ENUM_BAN_SELECTORS, ...yourSelectors]`) rather than re-declaring `no-restricted-syntax`, which is single-instance/last-wins and would clobber the ban. Overriding it needs a `tsQaConfig/tier-a-exemptions.json` entry.

### Closed component styling (Tier A doctrine)

> **See [`closed-styling-doctrine.md`](./closed-styling-doctrine.md)** — the focused
> single source of truth for the _spirit_ of this doctrine (the test, why
> "just go green" bodges fail, and the only correct way to fix a violation). Every
> closed-styling rule links there from its `meta.docs.url`, and two specialist
> subagents (`ts-qa-ci_cdd-reviewer`, `ts-qa-ci_cdd-fixer`, shipped in `agents/`)
> apply it beyond what a linter can. The reference below stays the per-rule catalogue.

The established encapsulation pattern **"closed / encapsulated component styling"**: a component owns all its CSS **internally** (static or dynamic — either is fine) and exposes styling **only** through semantic variant props (`variant`, `size`, `tone`, …). There is **no `className`/`style` passthrough** — the styling API is _closed_, so the implementation can change once for the whole codebase and call-site intent stays explicit. It is plain encapsulation + Open/Closed applied to styling; the banned anti-pattern is "className passthrough" / style-prop drilling.

Three always-on rules enforce it together, and none of them touch a component's _internal_ classes:

- **`no-ad-hoc-html`** — raw HTML lives only in the base-primitive dir (the element half).
- **`no-classname-prop`** — no `className` passed _into_ a component (call-site half).
- **`no-classname-public-prop`** — no `className` _declared_ as a public prop (declaration-site half).

> This doctrine is **not** the same as `require-variant-resolver` (opt-in, Tier B), which is about _how internal classes are built_ (via a `cva`/`cn` resolver) — a separate, opinionated choice. A project can fully satisfy closed styling while writing plain static Tailwind strings internally. Do not conflate the two.

### `no-classname-prop` (closed styling — call-site)

`className` may not be passed to a custom component; components own presentation via typed variant props. Allowed on raw lowercase HTML tags, and (carve-out) on `Foo.Bar` member-expression targets inside `uiDirs` (third-party compound passthrough, e.g. Radix parts). Config: `scopeGlobs`, `uiDirs` (default `['src/ui/']`).

### `no-classname-public-prop` (closed styling — declaration-site)

Companion to `no-classname-prop`: bans _publishing_ `className` as a public prop, two ways — (1) **direct**: a `className` member on any interface or inline object type (`TSPropertySignature`); (2) **inherited**: a props type that `extends`/intersects a className-bearing DOM base (`React.HTMLAttributes<T>`, the per-element `*HTMLAttributes` family, `ComponentPropsWithoutRef<'div'>`, `HTMLProps`, `DetailedHTMLProps`, `SVGProps`), which re-publishes `className` transitively. Detection is syntactic (rightmost base-type name); a transitive re-publish through another component's props type is the `cdd-reviewer` agent's job. Config: `scopeGlobs`, `classNameBearingTypes`, `classNameBearingSuffixes`.

### `no-naive-datetime-template`

_Ported from CounselBook's `eslint-rules/no-naive-datetime-template.js` (Plan 00107 BUG-A)._ Bans template literals that build a `<...>T<...>:00<...>`-shaped datetime string with a **static or absent UTC offset** — a genuine RFC 3339 correctness hazard, not an opinionated style choice. Detection is shape-based: a template literal's quasis are joined (with a placeholder standing in for each `${expression}`) and checked for a `T…:00` boundary whose seconds marker is **not** immediately followed by another interpolated expression.

```ts
// ❌ no offset at all — rejected by a strict RFC 3339 API (422), or parsed
// in the reader's local timezone at runtime
const startsAt = `${dateStr}T${timeStr}:00`;

// ❌ hardcoded UTC offset — wrong whenever the subject isn't observing UTC
// (the BST/DST class of bug)
const startsAt = `${dateStr}T${timeStr}:00+00:00`;
const startsAt = `${dateStr}T${timeStr}:00Z`;

// ✅ the offset is a DYNAMIC expression — computed, not hardcoded/absent
const startsAt = `${dateStr}T${timeStr}:00${offset}`;
```

**Not flagged**: plain string literals (this rule only inspects `TemplateLiteral` nodes — e.g. a deliberate test fixture `"2020-01-01T10:00:00+00:00"`), a call to an offset-computing helper (no template literal at the call site), and unrelated template literals with no `T…:00` boundary at all (URLs, paths, a bare `` `${dateStr}T${timeStr}` `` with no seconds).

**Consuming-project concern, not part of this rule**: if your project's own offset-computing helper has an internal UTC probe that legitimately builds a static-`Z` template (to ask `Intl` what offset a timezone observes at a given instant, never sent to any API), grandfather that helper's definition file via a `tsQaConfig/tier-a-exemptions.json` entry — do not weaken this rule for everyone else.

## Tier B rules (opt-in CDD)

### `require-variant-resolver`

_Formerly `no-ad-hoc-classnames`._ Requires a component's **own internal** `className` strings to be built through an allowlisted variant-resolver call (`cva`, `cn`, `clsx`, `twMerge` by default — configurable via `variantResolverNames`) rather than a bare string/template literal. This is a _how-you-build-internal-classes_ opinion for projects that have adopted a CVA + tailwind-merge catalogue — **not** the closed-styling boundary (that is the Tier A trio above). Kept opt-in so a project using plain static Tailwind strings internally is not forced into meaningless `cn('static')` wrappers.

### `no-html-in-front-controllers`

Designates certain dirs as **front controllers** (composition roots — typically `screens/`, `pages/`) and bans **all** raw HTML there: a front controller must be assembled entirely from typed components. Distinct from `no-ad-hoc-html` (which self-exempts a screen whose export matches its filename in its default model, and bans raw HTML everywhere outside `uiDirs` in its allowlist model) — this rule pins only the declared roots to zero raw HTML, composing with the primitive-boundary rule rather than replacing it. Opt-in because the "which dirs are front controllers" convention is per-project. Config: `frontControllerDirs` (default `['src/screens/', 'src/pages/']`), `bannedElements` (default `['*']`), `allowedElements`, `exemptFileSuffixes` (default `['.stories.tsx', '.test.tsx']`). Enable as `["error", { frontControllerDirs: [...] }]`. See [`closed-styling-doctrine.md`](./closed-styling-doctrine.md#no-html-in-front-controllers).

### `variant-api-enforcement`

**Not yet implemented.** Scaffolded as a registered rule ID with `create()` reporting nothing, so config wiring and the Tier B `recommended: false` default are in place ahead of time. Its real logic (enforce every styleable component exposes typed variant props) is authored once a variant-prop catalogue actually exists to derive the convention from — see the parent plan's Task 4.6.

### `one-component-per-file`

Enforces one PascalCase component per `.tsx`, named after the file — so `find-references` and file navigation map 1:1 to components. Scope configurable via `enforcePattern` (default `src/(widgets|ui)/**.tsx`).

### `explicit-component-displayname`

Arrow-form components in scope need an explicit `Foo.displayName`, or minified React devtools shows `<Anonymous>`. Scope defaults to `src/(widgets|ui|core)/`.

### `no-error-hiding-fallback`

Bans silent empty-value fallbacks (`?? []`, `|| ''`, `?? 0`, …) that collapse the loading/error/empty distinction into "looks fine but empty". Where a fallback is genuinely correct (e.g. a nullable prop's `?? {}` initial state, not a masked query error), model it explicitly or add the file to the `allow` option — a reviewable list of path substrings, visible in the ESLint config (the same "config carve-out, not inline comment" model as `no-dom-classname-mutation`). There is no inline-comment escape hatch by design (it would collide with `no-eslint-disable`).

### `no-dom-classname-mutation`

Bans imperative `el.className = …` and `classList.add('literal')` — an end-run around the JSX-level className rules. Config: `scopeGlobs` (default `['src/']`), `uiDirs` (primitive dirs where mutation is allowed, default `['src/ui/']`), and `allow` (path fragments to exempt, e.g. a low-level DOM loader). The `allow` list is a reviewable config carve-out, not an inline comment.

## Tier C rules (opt-in, architecture/convention)

### `no-default-export`

Bans `export default` — named exports keep rename/find-refs tooling reliable. Widget-mount entry files (`src/widgets/*/index.[cm]?tsx?`) are carved out (a loader needs `module.default`).

### `no-cross-module-relative`

Bans `../`-climbing imports that cross a top-level module boundary; use the `~/`-style alias instead so module boundaries stay visible. Config: `modules` (the top-level module list), `alias`, `srcMarker`.

## Internal rules (ts-qa-ci's own source only)

### `no-hardcoded-tool-source-path`

Bans the literal `"src"` as an argument to `execTool()` inside `src/tools/*.ts`, the files that implement each `ToolModule`. Not in any tier and never active in a consumer project, because no consumer code calls `execTool()`; enforced on ts-qa-ci itself through `tsQaConfig/eslint.config.js`.

Why: a tool module must not bake a guess at the consumer's layout into the subprocess it spawns. `dependencyCruiser.ts` once passed a hardcoded `"src"` as depcruise's positional scan root, so any consumer whose sources live elsewhere (for example `apps/web/src/`) failed with `Can't open 'src' for reading`. Scope comes from the `RunContext` (`ctx.cwd`, `ctx.path`) or from the underlying tool's own config file.

Fix: pass `"."` (the tool already runs in `ctx.cwd`), or for a `pathSupporting` tool `ctx.path ?? "."` as `eslintReport.ts` does. Only the exact literal `"src"` is banned, because bare subcommand literals such as `"eslint"` or `"run"` are legitimate arguments.

## Strict-TypeScript baseline preset

Two opt-in severity maps exported from the package: `STRICT_TYPESCRIPT_RULES` (load-bearing) and `STRICT_TYPESCRIPT_STYLISTIC_RULES` (opinionated, further opt-in). They are **not** always-on Tier A because they are type-aware `@typescript-eslint` rules: they require the consumer's own `parserOptions.projectService`/`.project` (ESLint hard-crashes without it) and the `@typescript-eslint` plugin registered. Shipping them as plain severity maps keeps `ts-qa-ci` free of a `typescript-eslint` dependency — the consumer's own plugin supplies the rule definitions; the package supplies the opinion.

The **syntactic** half of the ban is **always-on Tier A**, not part of these opt-in maps: the generic base config wires `no-restricted-syntax` with the `TSAsExpression` (except `as const`) / `TSTypeAssertion` / `TSEnumDeclaration` selectors — a core-ESLint rule over the TS AST needing no type info, so it is safe to force on every consumer (see [as/enum ban](#no-restricted-syntax-asenum-ban-tier-a)). The exported `AS_ENUM_BAN_SELECTORS` constant lets you compose extra restricted-syntax patterns without clobbering it.

`STRICT_TYPESCRIPT_RULES` carries the **type-aware** half: `consistent-type-assertions` (forbids object-literal assertions — `as const` can't express that), `ban-ts-comment` lockdown, the cast-safety cluster, and the load-bearing severities (`no-explicit-any`, `no-non-null-assertion`, `no-unsafe-*`, `strict-boolean-expressions`, `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `restrict-template-expressions`, `no-unnecessary-condition`, `consistent-type-imports`, `promise-function-async`, `require-await`). Stylistic elevations (`explicit-module-boundary-types`, `method-signature-style`, `prefer-readonly`, type-export/import-side-effect hygiene) live in the stylistic map so the correctness ratchet doesn't force stylistic churn.

Adopt inside a type-aware, TS-scoped config block:

```js
import { STRICT_TYPESCRIPT_RULES } from "@longtermsupport/ts-qa-ci";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: true } },
    rules: { ...STRICT_TYPESCRIPT_RULES },
  },
];
```

`reportUnusedDisableDirectives: 'error'` is **not** in these maps — it is a linter option (not a rule) and ships always-on in the generic base config, complementing `no-eslint-disable`.

## Configuration

- `tsQaConfig/tier-a-exemptions.json` — array of `{ ruleId, files, justification }`. Every active exemption is logged on every `ts-qa` run.
- `tsQaConfig/eslint.config.js` — add rules or override non-Tier-A rules freely. Any attempt to override a Tier A rule ID without a matching exemption is rejected at config-resolution time, not silently allowed.
- `TSQA_DISABLE_CDD=1` — coarse, always-logged escape hatch for the CDD rule subset specifically.
