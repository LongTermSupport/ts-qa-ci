# Pipeline Architecture

`ts-qa` runs your project through 5 phases, in order, stopping at the first failing phase (unless `--aggregate`):

| Phase | Name              | What                                                       | Mutates?      |
| ----- | ----------------- | ---------------------------------------------------------- | ------------- |
| 0     | Fast Fail         | oxlint — near-instant catch of obvious problems            | Yes (`--fix`) |
| 1     | Code Modification | Prettier, ESLint `--fix`                                   | Yes           |
| 2     | Lint & Validation | ESLint report pass (incl. CDD rules), markdown links, knip | No            |
| 3     | Static Analysis   | `tsc --noEmit`, dependency-cruiser                         | No            |
| 4     | Testing           | Vitest, Playwright, (opt-in) Stryker                       | No            |

That's the whole mental model. Everything below is detail you'll need eventually, not on day one.

## Why Phase 0 exists

oxlint is a Rust-based linter that's roughly 50-100x faster than ESLint, but it can't run custom rules — so it can't enforce this package's own CDD rules. It exists purely so that obvious mistakes (unused variables, undefined references) get caught and the whole run aborts in milliseconds, before you pay for Prettier, the full ESLint pass, `tsc`, or tests on code that was going to fail anyway. This mirrors `php-qa-ci`'s own tool ordering (cheap checks before expensive ones).

## Why ESLint runs twice (Phase 1 and Phase 2)

ESLint mixes auto-fixable rules and report-only rules in one config — there's no clean way to run "just the fixable ones" separately. `ts-qa` resolves this by running ESLint twice: once under the write/read-only gate (`--fix` locally, `--fix-dry-run` + diff-check in CI) to apply what it can, then again as a pure report pass over whatever's left, including the CDD tier (which never auto-fixes — see [`cdd-rules.md`](cdd-rules.md)).

## The read-only / CI-write duality

Every mutating tool (oxlint, Prettier, ESLint's Phase 1 pass) checks two independent signals:

- **Am I in CI?** (`TSQA_CI`) — controls whether failures retry interactively or fail immediately.
- **Am I allowed to write files?** (`TSQA_READONLY`) — controls `--fix` vs `--check`/dry-run.

In GitHub Actions, both are true: a single dry-run pass, and any pending diff **fails the gate**. In a Claude Code session, `TSQA_CI` is true (no interactive retry prompts) but `TSQA_READONLY` is false — changes apply directly. In a real terminal, both are false — writable and interactive.

Override with `--write` / `--read-only` (or `TSQA_READONLY=0`/`1`).

## Running a single phase or tool

```bash
ts-qa --phase 0        # just the fast-fail gate
ts-qa -t eslintReport   # bypass phase grouping entirely, run one tool
ts-qa -t eslintReport -p src/components  # scope to a path (only tools that support it)
ts-qa --skip playwright # run everything EXCEPT the named tool(s); repeatable
```

To disable a tool persistently (e.g. run browser tests in a separate CI job), use `disabledTools` in `tsQaConfig/ts-qa.json` — see [`configuration.md`](configuration.md#disabling-tools-tsqaconfigts-qajson).

## Retry behaviour

Outside CI, a failing tool prompts `(y/n)` to retry. If you retry and it passes, `ts-qa` warns at the end: re-run the whole pipeline, because a retried tool doesn't re-validate phases that already passed before the fix.
