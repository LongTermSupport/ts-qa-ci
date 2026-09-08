# Pipeline Architecture

`ts-qa` runs your project through 5 phases, in order, stopping at the first failing phase (unless `--aggregate`):

| Phase | Name              | What                                                       | Mutates?      |
| ----- | ----------------- | ---------------------------------------------------------- | ------------- |
| 0     | Fast Fail         | eslintConfigParity (SSoT guard), supplyChain audit, oxlint | Yes (`--fix`) |
| 1     | Code Modification | Prettier, ESLint `--fix`                                   | Yes           |
| 2     | Lint & Validation | ESLint report pass (incl. CDD rules), markdown links, knip | No            |
| 3     | Static Analysis   | `tsc --noEmit`, dependency-cruiser                         | No            |
| 4     | Testing           | Vitest, Playwright, (opt-in) Stryker                       | No            |

That's the whole mental model. Everything below is detail you'll need eventually, not on day one.

## Why Phase 0 exists

`eslintConfigParity` runs first — a near-instant SSoT guard. If your project keeps a root `eslint.config.js`, it proves the file delegates to ts-qa's resolved config, so `npx eslint`/your editor and `npx ts-qa` run identical rules. A divergent root config is caught here, before any result is measured against the wrong rule set. See [configuration.md](configuration.md#eslint-one-config-two-entrypoints-ssot).

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

## Working with a single rule

Three commands answer questions about defences without running the pipeline. Each accepts `--json`.

```bash
ts-qa rules                                   # every active rule, derived from the resolved config
ts-qa rule-doc ts-qa/no-eslint-disable        # the documentation for a printed identifier
ts-qa rule ts-qa/no-eslint-disable src/a.ts   # did this ONE rule fire on this path, and where
```

`rules` lists each active rule's identifier, severity, summary and documentation route, then the
project record (`tsQaConfig/tier-a-exemptions.json`) alongside them. It is computed from the same
resolved configuration `eslint` runs with, so a project's own plugin rules appear next to the
bundled ones and the list cannot drift from what is enforced.

`rule-doc` takes the identifier exactly as a failure prints it. A bundled `ts-qa/<name>` resolves
to its section of [`cdd-rules.md`](cdd-rules.md), shipped in the package, so it works offline and
at the installed version; an ESLint core rule resolves to its description and upstream URL. An
identifier that cannot be resolved is an error, and the package's own tests audit every bundled
rule for that.

`rule` is the single-rule harness: it runs the ordinary `eslintReport` lane over one path with the
project's own configuration and narrows the report to one identifier. Exit 0 means it did not fire,
1 means it fired with every location printed, 2 means ESLint did not produce a run. Use it to prove
a new rule sees its fixture before trusting a green full run.

## The conformance declaration

`package.json` carries a `defenceBeforeFix` key naming the version of the Defence Before Fix method
specification and of its toolchain specification that this package implements, with a `knownGaps`
list. A gap the package learns of, from its own self-checks or from a practitioner's report, is
recorded there against the clause it fails, and the package does not claim conformance whilst that
list is non-empty. The key is machine-readable so a consumer can check the claim against the
installed artefact rather than against a sentence in a README. Failure output names the method
too: every failing tool, and a `--llm` FAIL verdict, is followed by the line
`Defence Before Fix: https://longtermsupport.github.io/defence-before-fix/` linking the canonical specification.

## Output modes (`--llm`, `--json`)

By default `ts-qa` prints each tool's captured output inline as it runs. Two flags change what lands on stdout:

```bash
ts-qa --json   # dump the entire structured PipelineResult to stdout as JSON
ts-qa --llm    # compact summary to stdout, full result persisted to a cache file
```

`--llm` is the mode for agent-driven QA. Instead of flooding an agent's context with the full result (which also gets truncated the moment it's piped to `head`), it prints a small deterministic summary — a per-phase PASS/FAIL table, the failing tool(s) and their exit class, and a one-line verdict — while writing the **full** `PipelineResult` (every phase, every tool's `exitClass`/`stdout`/`stderr`/`diffPending`) to a stable cache file:

```
node_modules/.cache/ts-qa/llm/last-run.json
```

The summary ends with `jq` hints for pulling detail out of that file, e.g. the failing tool's stderr:

```bash
jq -r '.phases[].toolResults | to_entries[] | select(.value.exitClass != "clean") | .value.stderr' \
  node_modules/.cache/ts-qa/llm/last-run.json
```

`--llm` composes with `--aggregate` (which forces read-only and collects every failure in a phase). It is **mutually exclusive with `--json`**: both own stdout with opposite contracts (full dump vs. compact summary), so combining them is rejected.

### When `--llm` turns on automatically

You rarely need to pass `--llm` by hand — like CI mode, it auto-detects an agent environment (the same idea as the "Claude Code environment detected" line). Activation is resolved from four layers, **highest precedence first**:

1. **CLI** — `--llm` forces it on, `--no-llm` forces it off (the two are mutually exclusive).
2. **Env** — `TSQA_LLM=1` / `TSQA_LLM=0` (exact `1`/`0`, like `TSQA_READONLY`).
3. **Config** — `"llmOutput"` in `tsQaConfig/ts-qa.json`: `"always"` | `"never"` | `"auto"` (default `"auto"`).
4. **Auto-detect** (the `"auto"` case) — on when an agent marker is present: `CLAUDECODE=1`, or any of `CLAUDE_CODE`, `CLAUDE_CODE_ENTRYPOINT`, `AGENT`, `AI_AGENT` set.

So an agent gets compact summary + cached detail automatically, a human in a terminal keeps the current rich output, and either can force the mode. Auto-detect is an explicit env allowlist only — it never infers from a non-TTY or a pipe, so piping a human run to a file does **not** silently switch it to summary mode. An explicit `--json` always wins over auto-detection (it is never silently overridden by an agent environment).

## Retry behaviour

Outside CI, a failing tool prompts `(y/n)` to retry. If you retry and it passes, `ts-qa` warns at the end: re-run the whole pipeline, because a retried tool doesn't re-validate phases that already passed before the fix.
