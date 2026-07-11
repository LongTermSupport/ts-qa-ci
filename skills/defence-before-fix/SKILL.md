---
name: defence-before-fix
description: |
  Defence Before Fix workflow for TypeScript/React projects using ts-qa-ci.
  Implements the ratcheting pattern: analyse bug -> author a CDD ESLint rule
  -> red test (ruleTester) -> fix -> verify.

  Use when:
  - A bug has been found and you want to prevent the entire bug class
  - "defence before fix", "create an ESLint rule for this bug"
  - "detect this pattern with static analysis", "ratchet this bug class"
  - User wants to encode institutional knowledge as a CDD ESLint rule

  This skill orchestrates 4 phases:
  1. ANALYSE - Understand the bug pattern
  2. DETECT  - Author a CDD ESLint rule that catches the pattern
  3. TDD     - Write a failing RuleTester case reproducing the specific bug
  4. FIX     - Implement the fix, verify the rule and the pipeline pass
allowed-tools: Read, Write, Edit, Grep, Glob, Task
---

# Defence Before Fix (TypeScript variant)

**Never fix a bug in isolation.** A bug found once will recur unless the pattern is encoded as a static-analysis rule that fails the build the next time it appears. This is the TS/ESLint analogue of `php-qa-ci`'s `defence-before-fix` skill — same philosophy (`Analyse Pattern -> Create/Enable Rule -> Red Test -> Green Fix -> Verify QA`), applied via `ts-qa-ci`'s CDD ESLint rule system instead of PHPStan.

## Phase 1: ANALYSE

Before writing any rule, understand the pattern precisely enough to state it as an AST shape:

1. **Read the bug** — the actual diff/commit that introduced it, or the failing scenario the human reported.
2. **Generalise the pattern** — not "this specific line was wrong" but "this SHAPE of code is always wrong". E.g. not "`paymentService.ts:42` threw without cause" but "any `new *Error(...)` thrown inside a `catch` without a `{ cause }` argument".
3. **Check it isn't already covered** — read `docs/cdd-rules.md` and `src/rules/index.ts` for an existing rule that's close but has a gap (a scope bug, a missed AST node type) rather than authoring a duplicate. If an existing rule has a gap, widening it is usually better than a new rule with overlapping intent.
4. **Decide the tier** (see `docs/cdd-rules.md`):
   - **Tier A** (always-on) — universal correctness, no project presuppositions. Most bug-class defences belong here.
   - **Tier B** (opt-in CDD) — presupposes a variant-prop component catalogue.
   - **Tier C** (opt-in, architecture/convention) — project/framework-specific.

## Phase 2: DETECT — author the rule

Rules live in `src/rules/<camelCaseName>.ts` as plain ESLint `Rule.RuleModule` objects (parser-agnostic, over ESTree/estree-jsx types — no `@typescript-eslint`-specific type-aware machinery unless the pattern truly needs type info, in which case see the `STRICT_TYPESCRIPT_RULES` preset instead of a bespoke rule).

Read an existing rule of similar shape as your template — e.g. `src/rules/requireErrorCause.ts` for a `catch`/`throw` AST pattern, `src/rules/noClassnameProp.ts` for a JSX-prop pattern. Structure:

```ts
import type { Rule } from "eslint";

/**
 * JSDoc: state the pattern, the bad example, the good example, and WHY
 * (what breaks if this pattern ships). This comment is read by both humans
 * and the eslint-fixer agent before it attempts a fix.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "..." },
    schema: [],
    messages: { violationId: "..." },
  },
  create(context) {
    return {
      // AST visitor(s) matching the pattern from Phase 1
    };
  },
};

export default rule;
```

Register it in `src/rules/index.ts`:

1. Import the rule module.
2. Add it to the `tsQaPlugin.rules` map under its kebab-case ID (`ts-qa/<rule-id>`).
3. Add the ID to the appropriate tier export (`TIER_A_ESLINT_RULES` / `TIER_B_ESLINT_RULES` / `TIER_C_ESLINT_RULES`) at severity `"error"` (Tier A/C) or `"warn"`/`"off"` (Tier B, matching sibling conventions).

Document it in `docs/cdd-rules.md` under the matching tier section: one bad/good example pair, one sentence of why.

## Phase 3: TDD — red test first

Write `src/rules/<camelCaseName>.test.ts` using the shared `RuleTester` from `src/testSupport/ruleTester.ts`:

```ts
import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./<camelCaseName>.js";

const ruleTester = makeRuleTester();

ruleTester.run("<rule-id>", rule, {
  valid: [
    // The sanctioned form(s) — including edge cases the rule must NOT flag
  ],
  invalid: [
    // The EXACT bug that was found, reduced to a minimal reproduction
    { code: "...", errors: [{ messageId: "violationId" }] },
    // Plus adjacent variations of the same pattern (nested scope, different
    // error subclass, etc.) so the rule doesn't just match the one snippet
  ],
});
```

Run it and confirm RED (the invalid cases the rule is meant to catch must fail until `create()` is implemented, and the specific bug's reproduction must be among them):

```bash
npx vitest run src/rules/<camelCaseName>.test.ts
```

If `create()` already exists (you're widening an existing rule's gap), the new `invalid` case you add for the missed shape should fail FIRST, proving the gap existed, before you touch the visitor logic.

## Phase 4: FIX

1. Implement/extend `create()` until the RuleTester suite is green.
2. Run the rule against the real codebase to find existing occurrences of the pattern (not just the test fixtures):
   ```bash
   npx ts-qa -t eslintReport --llm
   ```
   Route any real occurrences found through the `eslint-fixer` skill/agent, or fix directly if this IS the bug's own fix commit.
3. Verify the pipeline is clean end-to-end — invoke the `ts-qa` orchestrator skill (or `ts-qa-runner` directly) rather than assuming green from the rule test alone; the new rule must not have introduced false positives elsewhere in the codebase.
4. If the bug being fixed pre-dates the rule (this is the common case — you found a live bug, not a hypothetical), fix that specific instance as part of the same change; the rule's job is to stop it recurring, not to retroactively fix history you haven't touched.

## Escalation / Scope Boundaries

- **A pattern needs real type information** (not just syntactic AST shape) — e.g. "this value's inferred type is a union that includes `null`" — check whether `STRICT_TYPESCRIPT_RULES` (a `@typescript-eslint` type-aware preset) already covers it before authoring a bespoke type-aware rule; `ts-qa-ci` deliberately keeps its OWN rules parser-agnostic and non-type-aware (see `docs/cdd-rules.md` "Strict-TypeScript baseline preset") so it stays a plain-ESLint-only dependency.
- **The pattern is genuinely project-specific**, not something every `ts-qa-ci` consumer would want — author it in the CONSUMING project's own `tsQaConfig/eslint.config.js` instead of upstreaming it into `ts-qa-ci`'s Tier A/B/C.
- **Never suppress instead of fixing**: `no-eslint-disable` (Tier A) exists precisely so a rule you just wrote can't be inline-suppressed away — the only sanctioned override is a justified `tsQaConfig/tier-a-exemptions.json` entry, which is a project-owner decision, not something this workflow does silently.
