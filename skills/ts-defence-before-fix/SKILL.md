---
name: ts-defence-before-fix
description: |
  ts-qa-ci mechanics for running Defence Before Fix (DBF) in a TypeScript/React
  project. The method itself is run by the Defence Before Fix plugin's dbf skill
  (/dbf); this skill only says where the method lives and how its steps map onto
  ts-qa-ci's commands, rule files and tests.

  Use when:
  - The user says "DBF" or "defence before fix", or a ts-qa failure prints the
    Defence Before Fix line, in a project that uses ts-qa-ci
  - A bug, defect or failing check is found in a ts-qa-ci project and a detector
    rule is to be written for its class
  - You need to list the active rules, look up a rule identifier, or add and
    test a ts-qa-ci ESLint rule
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill
---

# Defence Before Fix in a ts-qa-ci project

This skill does not describe the method. The method has one version, the specification at
https://defence-before-fix.github.io/, and it is run by the Defence Before Fix plugin's `dbf`
skill. Follow that, and use the mechanics below when it asks for this toolchain's rule listing,
rule documentation, single-rule harness or rule tests.

## Running the method

With the plugin installed, invoke `/dbf` or say "DBF". To install it in Claude Code:

```text
/plugin marketplace add Defence-Before-Fix/claude-plugin
/plugin install defence-before-fix@defence-before-fix
```

From a shell, the same is `claude plugin marketplace add Defence-Before-Fix/claude-plugin` then
`claude plugin install defence-before-fix@defence-before-fix`; add `--scope project` to both to
record it in the project's `.claude/settings.json`.

Without the plugin, fetch and follow the agent prompt:
https://defence-before-fix.github.io/defence-before-fix-project-prompt.md

Where anything here appears to disagree with the specification, the specification wins.

## ts-qa-ci mechanics

### Listing and looking up rules

```bash
npx ts-qa rules                                  # every active rule, from the resolved config
npx ts-qa rule-doc ts-qa/no-eslint-disable       # the docs for an identifier a failure printed
npx ts-qa rule ts-qa/no-eslint-disable src/a.ts  # does this ONE rule fire on this path
```

Each accepts `--json`. `rule` exits 0 when the rule did not fire, 1 when it fired (with every
location printed) and 2 when ESLint did not produce a run. The package's `docs/pipeline.md`
("Working with a single rule") is the reference, and the `knownGaps` in its `package.json`
`defenceBeforeFix` key list what these commands do not yet cover (the dependency-cruiser
`no-circular` defence, for one).

`rule-doc` resolves a bundled `ts-qa/<name>` to its section of `docs/cdd-rules.md`, which ships
in the package, and an ESLint core rule to its upstream URL.

### Sweeping

```bash
npx ts-qa -t eslintReport --llm                  # the ESLint report lane over the whole project
npx ts-qa -t eslintReport -p src/feature --llm   # the same lane over one path
npx ts-qa --llm                                  # the full pipeline
```

### Where a new ESLint rule goes

- **In a consuming project**, a project-specific rule belongs in the project's own
  `tsQaConfig/eslint.config.js`, which ts-qa merges after its Tier A core (see
  `docs/configuration.md`). A rule added there appears in `ts-qa rules` and runs under
  `ts-qa rule` like a bundled one. The project's own test runner tests it; ESLint's `RuleTester`
  works under vitest.
- **In ts-qa-ci itself**, a rule every consumer should get lives in `src/rules/<camelCaseName>.ts`
  as a plain, parser-agnostic ESLint `Rule.RuleModule` over ESTree/estree-jsx types (no type-aware
  machinery; for type-level patterns check the `STRICT_TYPESCRIPT_RULES` preset first). Register
  it in `src/rules/index.ts`: add it to the `tsQaPlugin.rules` map under its kebab-case name
  (identifier `ts-qa/<rule-id>`) and to `TIER_A_ESLINT_RULES`, `TIER_B_ESLINT_RULES` or
  `TIER_C_ESLINT_RULES`. Document it under the matching tier in `docs/cdd-rules.md`, which is
  what `rule-doc` prints; the package's tests fail on a bundled rule that does not resolve.
  Rebuild `dist/` with `npm run build`, since it is committed.

### Testing a rule

ts-qa-ci's own rules are tested with the shared `makeRuleTester()` from
`src/testSupport/ruleTester.ts` (ESLint's `RuleTester` with `@typescript-eslint/parser`, so
fixtures may hold TypeScript and JSX). It is test-only and not shipped. Put the test beside the
rule as `src/rules/<camelCaseName>.test.ts` and run it alone with:

```bash
npx vitest run src/rules/<camelCaseName>.test.ts
```

An existing rule of a similar shape is the best template, for example
`src/rules/requireErrorCause.ts` for a `catch`/`throw` pattern or `src/rules/noClassnameProp.ts`
for a JSX prop pattern.

### Exemptions

Inline suppression is itself a Tier A violation (`ts-qa/no-eslint-disable`). The project's record
of exemptions is `tsQaConfig/tier-a-exemptions.json` (`{ ruleId, files, justification }`), which
`ts-qa rules` prints and every run logs.
