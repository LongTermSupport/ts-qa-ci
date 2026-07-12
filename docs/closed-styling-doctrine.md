# Closed-Styling Doctrine

The single source of truth for the **closed component styling** doctrine that the
component-driven-design (CDD) rules in ts-qa-ci enforce. Every closed-styling
rule links here from its `meta.docs.url` so a failure routes the reader straight
to the _why_ and the _fix_.

This is the focused "spirit + how to fix" companion to the per-rule reference in
[`cdd-rules.md`](./cdd-rules.md). When the letter of a rule and this doctrine
disagree, **the doctrine wins** and the rule is the bug.

## The principle

**Tailwind/CSS classes are a component's INTERNAL implementation concern.**

1. A component's **public API never accepts arbitrary CSS classes** — no
   `className` prop, no class passthrough, no free-form `style`/class-string
   props. The API exposes a **finite, named set of states** (variants, tones,
   sizes, booleans, discriminated `state` unions) and nothing open-ended.

2. A component **owns its raw HTML.** Rendering raw `<button>`, `<div>`,
   `<input>` — with Tailwind classes — _inside_ a component to style **its own
   states** is correct and expected. That markup and those classes are the
   component's internals. Raw HTML is not the problem — where it lives is.

3. Every component has a **finite, enumerable set of visual states**, styled
   internally. Because the set is closed, the component can be **rendered in
   every possible state** — Storybook stories and unit tests enumerate them
   exhaustively. That guarantee is the entire benefit of the standard.

4. The moment **arbitrary CSS enters** — via a prop, or via an open-ended class
   string authored at a call site — the state space becomes **infinite and
   untestable.** That is the loss the rules refuse.

## The test (every finding reduces to this)

> **Is this the component styling one of ITS OWN finite, named states?
> Or is it open-ended styling imposed from outside / authored ad-hoc,
> that should instead be a defined state on a primitive?**

- **Former → allowed.** A primitive rendering raw HTML and mapping
  `variant="ghost"` / `state="unavailable"` to internal class strings is exactly
  right.
- **Latter → violation.** A `className` prop; a class string passed into a
  component; or a composing file (feature/screen/page) reproducing an ad-hoc
  class pile on raw HTML that is really a distinct control with its own finite
  states.

## The enforceable line: directory ownership

"Raw HTML vs component" is **not** the line — ownership and finiteness are. In
practice that resolves to **which directory the file lives in**:

| Layer                                                     | Owns raw HTML + authors class strings? | Why                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Base-primitive dirs** (`ui/`, and any project `uiDirs`) | **YES**                                | The component owns its raw HTML and styles its own finite states; the literals are its internals.                           |
| **Composing dirs** (`feature/`, `screens/`, `pages/`, …)  | **NO**                                 | These compose primitives. Raw HTML or a class pile here is styling imposed at a call site. Fix: extend/extract a primitive. |

If you need raw HTML or a class literal and you are **not** in a primitive
directory, you are in the wrong file: move the markup into a primitive and
consume its typed props.

## How the rules draw that line

Three **always-on Tier A** rules enforce the boundary together — and none of
them touch a component's _internal_ classes:

- **[`no-ad-hoc-html`](#no-ad-hoc-html)** — raw HTML lives only in the
  base-primitive dir (the element half). In its strict **allowlist-dir mode**
  (`uiDirs` + `bannedElements: ['*']`) raw HTML is legal _only_ under those dirs;
  every composing file is policed with no per-file exemption. This is what makes
  "paste a class pile onto a raw `<button>` in a feature file" **impossible** —
  there is no raw `<button>` to paste onto.
- **[`no-classname-prop`](#no-classname-prop)** — no `className` passed _into_ a
  component (the call-site half).
- **[`no-classname-public-prop`](#no-classname-public-prop)** — no `className`
  _declared_ as a public prop (the declaration-site half).

Together they close the loop: composing files cannot author raw HTML, and
components cannot receive or publish a `className`. The only place a class string
can live is inside a primitive, styling its own finite states.

> **`require-variant-resolver` is NOT this boundary.** It is a separate, **opt-in
> (Tier B)** opinion about _how a primitive builds its own internal classes_
> (through a `cva`/`cn`/`clsx`/`twMerge` resolver rather than a bare string). A
> project can fully satisfy closed styling while writing plain static Tailwind
> strings internally. Never mistake the opt-in "how" for the always-on boundary.

## Why "just go green" is a failure

The rules must be satisfied by **honouring** the standard, never by routing
around it. The classic bodge deletes a `<Button>` and pastes its classes onto raw
HTML, or wraps an arbitrary class pile in a resolver call so a naive check waves
it through:

```tsx
// ❌ BODGE — a primitive's DNA copied onto raw HTML in a composing file.
// The button's styling now lives in two files and will silently drift.
// (Blocked by no-ad-hoc-html allowlist mode: raw <button> is illegal here.)
<button className="focus-visible:ring-ring inline-flex h-9 items-center rounded-md …" />
```

```tsx
// ❌ BODGE — wrapping the pile in cn() does not make it a finite state.
// The state space is still infinite; the <button> is still untestable.
<button
  className={cn(
    "h-12 text-base font-semibold border-red-200",
    urgent && "bg-red-50",
  )}
/>
```

Wrapping styling in `cn()`, or moving it onto a lowercase tag, does not make it a
finite state — it just hides it. The goal is the benefit of the standard, not the
green tick. A linter checks shapes; the [specialist agents](#specialist-agents)
below check the spirit.

## How to fix a violation (the only correct move)

1. **Never copy a primitive's class string.** If a call site needs a look the
   primitive can't express, the primitive is **missing a state** — add the
   finite state (`flush`, `tone="warningStrong"`, `size="inline"`, an
   `emphasis` variant) and use the primitive. The class string lives in exactly
   one file.
2. **When a `cn()` ternary encodes a control's states, extract the control.** A
   3-state tile becomes `<TimeSlotButton state={"selected"|"available"|"unavailable"}>`
   with a story per state — not a ternary buried in a feature component.
3. **Layout stays in layout.** `ml-auto`, `mb-4`, `flex-1`, responsive hiding
   belong to layout primitives (`Flex`/`Stack`/`Grid`) or finite
   `fullWidth`/`grow`/`hideBelow` props — never inside a class pile.
4. **Adornments are slots.** Overlaying a button on an input is the input's
   geometry to own: `<Input trailing={…}>`, not absolute-positioning classes at
   the call site.

## The rules

### no-ad-hoc-html

Bans raw HTML tags in composing files (page/feature/screen). Ad-hoc
markup+styling there reproduces what should be a primitive's finite, testable
state and cannot be enumerated in stories/tests. Use an existing typed component,
or extract the markup into a primitive with a closed variant API. Adopt the
**allowlist-dir mode** (`uiDirs` + `bannedElements: ['*']`) to make the boundary
airtight — raw HTML legal only in primitive dirs, everything else policed.

### no-html-in-front-controllers

**Opt-in (Tier B) — the composition-root axis.** Designates certain dirs as
**front controllers** (typically `screens/`, `pages/`) and forbids **all** raw
HTML there: a composition root's only job is to assemble typed components, so its
every state stays enumerable. This is distinct from — and composes with —
`no-ad-hoc-html`: that rule's default model _self-exempts_ a screen whose export
matches its filename (so its raw HTML slips through), while its allowlist-dir mode
bans raw HTML everywhere outside `uiDirs` (often too aggressive — feature/composite
primitives may legitimately own raw HTML). This rule instead pins **only** the
declared roots to zero raw HTML, leaving the primitive boundary to `no-ad-hoc-html`.
Enable as `["error", { frontControllerDirs: ["src/screens/", "src/pages/"] }]`.

### no-classname-prop

Forbids passing `className` to a custom component. A class passed from outside
makes the component's visual states unbounded and untestable. Use its
variant/size/tone props; if the look isn't expressible, **extend the component**
— never override at the call site. Raw HTML tags keep native `className` (that is
the component owning its own markup).

### no-classname-public-prop

Bans publishing `className` as a public prop, **everywhere in scope — primitive
dirs included** (even a primitive exposes variants, never a raw `className`;
config is `scopeGlobs` only, no primitive carve-out). Two ways it fires:

1. **Direct** — a `className` member on any interface or inline object type.
2. **Inherited** — a props interface/type that `extends` (or intersects) a
   className-bearing DOM base: `React.HTMLAttributes<T>`, the per-element family
   (`ButtonHTMLAttributes`, `InputHTMLAttributes`, …), `ComponentPropsWithoutRef<'div'>`,
   `HTMLProps`, `DetailedHTMLProps`, `SVGProps`, etc. Inheriting one re-publishes
   `className` (and every other DOM attribute) transitively — the same breach
   hidden behind an `extends`. Configurable via `classNameBearingTypes` /
   `classNameBearingSuffixes`.

Delete the member / drop the DOM-base inheritance and model the needed looks as
named variant/size/tone/state props; pass only the specific DOM attributes you
need internally. (A transitive re-publish through **another component's** props
type needs type resolution and is the `ts-qa-ci_cdd-reviewer` agent's job, not
this syntactic lint's.)

### require-variant-resolver

**Opt-in (Tier B) — NOT the boundary.** Requires a primitive's own internal
`className` strings to be built through a variant-resolver call
(`cva`/`cn`/`clsx`/`twMerge`) rather than a bare string/template literal. A
_how-you-build-internal-classes_ opinion for projects that have adopted a CVA +
tailwind-merge catalogue. It does not, and is not meant to, police the
composing/primitive boundary — that is the Tier A trio above.

### no-dom-classname-mutation

Forbids imperative `el.className = …` / `el.classList.add("literal")` outside
primitive dirs. Imperative mutation smuggles ad-hoc CSS past every JSX rule — the
same infinite-state problem with worse visibility. Render the state through a
primitive's variant prop; genuinely structural loader-level cases go on the
rule's reviewed `allow` list.

### variant-api-enforcement

Scaffold; real logic lands once a project's variant-prop catalogue exists. It
will enforce that styleable components resolve presentation through a variant API
rather than ad-hoc classes.

## Configuration

The boundary rules take `uiDirs` / `scopeGlobs` options (your project's primitive
directories and policed scope). Wire the strict, airtight boundary like this:

```js
// tsQaConfig/eslint.config.js
{
  rules: {
    // Airtight boundary: raw HTML ONLY in primitive dirs, everything policed.
    "ts-qa/no-ad-hoc-html": ["error", {
      uiDirs: ["src/components/ui/", "src/components/layout/"],
      bannedElements: ["*"],
    }],
    "ts-qa/no-classname-prop": ["error", { uiDirs: ["src/components/ui/"] }],
    "ts-qa/no-classname-public-prop": "error",
    // Opt-in "how": build internal classes through a resolver.
    "ts-qa/require-variant-resolver": ["warn", { variantResolverNames: ["cva", "cn", "clsx", "twMerge"] }],
    // Opt-in composition-root axis: screens/pages must be pure component composition.
    "ts-qa/no-html-in-front-controllers": ["error", { frontControllerDirs: ["src/screens/", "src/pages/"] }],
  },
}
```

Roll out warn → burn down (extract primitives) → error, so the ratchet only ever
tightens.

## Specialist agents

ts-qa-ci ships two subagents (in `agents/`, installed into a consumer's
`.claude/agents/`) that apply this doctrine beyond what a linter can:

- **`ts-qa-ci_cdd-reviewer`** — read-only. Judges code against the _spirit_ of
  this doctrine, catching bodges a green lint misses (a `cn()`-wrapped class
  pile, a primitive's DNA copied onto raw HTML, a control that should be a
  primitive). Use it in LLM-driven PR reviews and before merging UI changes.
- **`ts-qa-ci_cdd-fixer`** — resolves closed-styling violations the correct way:
  by extending an existing primitive or extracting a new one, never by adding a
  `className` prop or wrapping a pile in `cn()`.

A green linter is necessary but not sufficient — the reviewer exists because the
rules check shapes while the doctrine is about _finite, testable state_. Reach
for these agents whenever ts-qa reports a closed-styling rule.
