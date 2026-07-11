# Tools

One page for all 11 tools `ts-qa` orchestrates, rather than 11 near-empty files — jump to the one you need.

## oxlint (Phase 0)

Rust-based fast linter. Runs with `--deny-warnings` (its default exit code is 0 even with warnings present — `ts-qa` always overrides this, or Phase 0 wouldn't actually fail fast). Can't run custom rules, so it's a pre-filter only.

## Prettier (Phase 1)

`--write` locally, `--check` in read-only mode. **peerDependency** — runs through _your_ installed Prettier, not a bundled instance, so it can't disagree with your own `npm run format`.

## ESLint — `eslintFix` and `eslintReport` (Phase 1 and 2)

Same config, two passes: `--fix`/`--fix-dry-run` first, then a pure report pass over whatever's left, including the CDD tier. See [`cdd-rules.md`](cdd-rules.md) for the rule set and [`configuration.md`](configuration.md) for how the config is resolved.

## `tsc --noEmit` (Phase 3)

Non-mutating, always runs — there's no writable mode for a type-checker.

## dependency-cruiser (Phase 3)

Structural/architecture checks (forbidden imports, circular dependencies) — the analogue of PHPArkitect. Runs as its own step, not via an ESLint plugin (that would re-run the whole dependency graph once per linted file).

## knip (Phase 2)

Dead code / unused dependency / unused export detection via a real module graph. Ships with a default single-entry-point config — if your project has multiple entry points (a Vite client build + an SSR build + free-standing scripts, say), you'll need a `tsQaConfig/knip.json` override or the first run will be noisy with false positives.

## remark-validate-links (Phase 2)

Markdown link integrity — relative-file and anchor resolution only. Does **not** check external `http(s)` links (out of scope by design, not a gap).

## Vitest / Playwright (Phase 4)

**peerDependencies** — `ts-qa` orchestrates _your_ configured test setup rather than shipping a default one, the same relationship `tsc` has to your `tsconfig.json`.

## Stryker Mutator (Phase 4, opt-in)

Mutation testing. Never part of the default pipeline — invoke explicitly with `ts-qa -t stryker`.
