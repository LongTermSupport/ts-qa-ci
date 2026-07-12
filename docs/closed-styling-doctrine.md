# Closed-Styling Doctrine

The single source of truth for the closed-styling / component-driven-design
(CDD) rules in ts-qa-ci. Every closed-styling rule links here from its failure
message. When the letter of a rule and this doctrine disagree, **the doctrine
wins** and the rule is the bug.

## The principle

**Tailwind/CSS classes are a component's INTERNAL implementation concern.**

1. A component's **public API never accepts arbitrary CSS classes** — no
   `className` prop, no class passthrough, no free-form `style`/class-string
   props. The API exposes a **finite, named set of states** (variants, tones,
   sizes, booleans, discriminated `state` unions) and nothing open-ended.

2. A component **owns its raw HTML.** Rendering raw `<button>`, `<div>`,
   `<input>` — with Tailwind classes — _inside_ a component to style **its own
   states** is correct and expected. That markup and those classes are the
   component's internals. Raw HTML is not the problem.

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

| Layer                                                           | May author class-string literals? | Why                                                                                                                                                     |
| --------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive dirs (`ui/`, `layout/`, `composite/` — configurable)  | **YES**                           | The component owns its raw HTML and styles its own finite states; the literals are its internals.                                                       |
| Composing dirs (`feature/`, `screens/`, `pages/`, providers, …) | **NO**                            | These compose primitives; a class literal here is styling imposed at a call site. The fix is to extend/extract a primitive and consume its typed props. |

If you need a class literal and you are **not** in a primitive directory, you are
in the wrong file: move the markup into a primitive.

## Why "just go green" is a failure

The rules must be satisfied by **honouring** the standard, never by routing
around it. The classic bodge wraps an arbitrary class pile in a resolver call so
a naive rule waves it through:

```tsx
// ❌ BODGE — passes a rule that only checks the callee name, not the arguments.
// The state space is still infinite; the <button> is untestable.
<button className={cn("h-12 text-base font-semibold border-red-200", urgent && "bg-red-50")} />
```

```tsx
// ❌ BODGE — deleting <Button> and pasting its variant classes onto raw HTML.
// The button's DNA now lives in two files and will silently drift.
<button className="focus-visible:ring-ring inline-flex h-9 items-center rounded-md ..." />
```

Both pass a linter that inspects only shapes. Both **destroy the benefit** the
linter exists to protect. Wrapping styling in `cn()`, or moving it onto a
lowercase tag, does not make it a finite state — it just hides it. The goal is
the benefit of the standard, not the green tick.

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

### no-classname-prop

Forbids passing `className` to a custom component. A class passed from outside
makes the component's visual states unbounded and untestable. Use its
variant/size/tone props; if the look isn't expressible, **extend the component**
— never override at the call site. Raw HTML tags keep native `className` (that
is the component owning its own markup).

### no-classname-public-prop

Forbids declaring `className` (or re-publishing it via
`extends React.HTMLAttributes<…>` / `ComponentProps<…>`) as a public prop
outside primitive dirs. Declaring it opens the component to arbitrary CSS from
every caller, so no test or story can enumerate its states. Delete the prop and
model the needed looks as named variant/size/tone/state props.

### no-ad-hoc-html

Forbids raw HTML tags in composing files (page/feature/screen). Ad-hoc
markup+styling there reproduces what should be a primitive's finite, testable
state and cannot be enumerated in stories/tests. Use an existing typed
component, or extract the markup into a primitive with a closed variant API.

### no-ad-hoc-classnames

Forbids ad-hoc class-string literals outside primitive dirs — **including
literals wrapped in `cn()`/`clsx()`/`twMerge()`, ternary/logical branches,
arrays, `clsx` object keys, and same-file string consts.** Wrapping a class pile
in a resolver does not sanction it. Only variant-catalogue references (a `cva()`
product, a `VARIANT[x]` map lookup, a prop/identifier that is not a raw string)
are allowed on a composing surface. Inside primitive dirs the rule does not
fire — the primitive owns its literals.

### variant-api-enforcement

Scaffold; real logic lands once a project's variant-prop catalogue exists. It
will enforce that styleable components resolve presentation through a variant
API rather than ad-hoc classes.

### no-dom-classname-mutation

Forbids imperative `el.className = …` / `el.classList.add("literal")` outside
primitive dirs. Imperative mutation smuggles ad-hoc CSS past every JSX rule —
the same infinite-state problem with worse visibility. Render the state through
a primitive's variant prop; genuinely structural loader-level cases go on the
rule's reviewed allowlist.

## Configuration

The rules that police the composing/primitive boundary take a `sanctionedDirs`
option (the primitive directories). Set it to your project's primitive layout,
e.g.:

```js
// eslint.config.js
{
  rules: {
    "ts-qa/no-ad-hoc-classnames": ["error", {
      sanctionedDirs: [
        "src/components/ui/",
        "src/components/layout/",
        "src/components/composite/",
      ],
    }],
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
