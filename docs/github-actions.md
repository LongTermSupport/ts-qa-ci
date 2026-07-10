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

## Minimal workflow

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

`GITHUB_ACTIONS=true` is enough for `ts-qa` to auto-detect CI and read-only mode — no extra flags needed. A pending Prettier/ESLint diff **fails the build** in this mode rather than silently passing.

## Updating the pinned SHA

Bumping the dependency requires `npm install` (not `npm ci`) locally to regenerate the lockfile's `resolved`/`integrity` fields for the new commit, then commit that lockfile change like any other dependency bump.
