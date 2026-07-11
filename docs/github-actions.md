# GitHub Actions

## Installing `ts-qa-ci` in CI

Before it's published to npm, install via a SHA-pinned git dependency:

```json
// package.json
"devDependencies": {
  "@longtermsupport/ts-qa-ci": "github:LongTermSupport/ts-qa-ci#<commit-sha>"
}
```

Always pin to a commit SHA, never a branch — branches are mutable and unreviewable. `ts-qa-ci` commits its own built `dist/` (an explicit exception to the usual "dist is generated" convention), so this is a clone-and-go install with no build step and no dependency on npm's flaky `prepare` lifecycle hook.

**Peer dependencies aren't installed automatically** for a git dependency the same way they are for a registry package — make sure `typescript`, `eslint`, `@types/node`, and any test runners you use are already in your own `package.json`.

## Shipped archetype workflow (recommended)

`ts-qa-ci` ships a ready-to-use workflow at `configDefaults/github-workflows/ci.yml`. Get it into your project either way:

- **`npx ts-qa init`** scaffolds it to `.github/workflows/ts-qa.yml` (alongside `tsQaConfig/`). Like the rest of `init`, it never overwrites an existing workflow.
- or copy `node_modules/@longtermsupport/ts-qa-ci/configDefaults/github-workflows/ci.yml` there yourself.

It follows the php-qa-ci **auto-fix-and-commit** pattern: it runs `ts-qa --write` so auto-fixable issues (Prettier, ESLint `--fix`) are applied and committed straight back to the branch, and fails the build only on what **cannot** be auto-fixed (type errors, test failures, ESLint errors with no fixer, unresolved links). Fixes are pushed with the default `GITHUB_TOKEN`, which works for same-repo branches and PRs; fork PRs can't be pushed to (a GitHub security boundary), so there the fixes are reported but not committed. `GITHUB_TOKEN` pushes don't retrigger the workflow, so there is no fix→commit→fix loop.

## Minimal read-only workflow

If you'd rather CI never writes to your branch, drop `--write` and let `ts-qa` run in its default CI mode:

```yaml
name: CI
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx ts-qa
```

`GITHUB_ACTIONS=true` is enough for `ts-qa` to auto-detect CI and read-only mode — no extra flags needed. In read-only mode a pending Prettier/ESLint diff **fails the build** rather than being auto-fixed, so you fix it locally and push.

## ts-qa-ci dogfoods itself

`ts-qa-ci`'s own CI (`.github/workflows/ci.yml`) runs `npx ts-qa` on `ts-qa-ci` — the same gate it ships. Its `tsQaConfig/` disables Playwright (no served site) and carries two justified Tier A exemptions (the `as`/enum ban on `src/**` AST/ESLint-API bridging code, and the placeholder-detector rule that must contain the token it detects). This is the reference example of running `ts-qa` on a plain (non-Vite) TypeScript library.

## Updating the pinned SHA

Bumping the dependency requires `npm install` (not `npm ci`) locally to regenerate the lockfile's `resolved`/`integrity` fields for the new commit, then commit that lockfile change like any other dependency bump.
