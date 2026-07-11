---
name: ts-qa-runner
description: |
  Run ts-qa (full pipeline, a phase, or a single tool) and get back a concise
  pass/fail summary. Use when user requests to:
  - Run the QA pipeline / "run ts-qa" / "run qa"
  - Run a specific tool ("run eslint", "run tsc", "run vitest")
  - Run a specific phase ("run phase 2", "run static analysis")
  - Check whether the pipeline is clean before committing
  Delegates to the ts-qa-ci_ts-qa-runner agent (haiku) for execution, keeping
  the verbose tool output out of the main context.
allowed-tools: Task
---

# ts-qa Runner Skill

This skill runs `ts-qa` through the `ts-qa-ci_ts-qa-runner` agent (haiku model) and returns a concise summary. It does NOT fix anything — see `eslint-fixer` / `tsc-fixer` for that, or the `ts-qa` orchestrator skill for the full run→fix→run cycle.

## Why delegate instead of running `ts-qa` via Bash directly

`ts-qa`'s own output (even in `--llm` mode) still runs through Bash and reaches the main context if invoked directly. Delegating to a cheap haiku agent keeps that noise out of the expensive main agent's context — the agent parses the compact `--llm` summary and returns only what matters.

## Workflow

### When user says: "run ts-qa" / "run qa" / "run the pipeline"

```
Use Task tool:
  description: "Run ts-qa full pipeline"
  subagent_type: "ts-qa-ci_ts-qa-runner"
  prompt: "Run the full ts-qa pipeline (npx ts-qa --llm) and report the per-phase summary"
```

### When user says: "run eslint" / "run tsc" / "run vitest" / etc.

Map the request to a tool name (`oxlint`, `prettier`, `eslintFix`, `eslintReport`, `remarkValidateLinks`, `knip`, `tsc`, `dependencyCruiser`, `vitest`, `playwright`, `stryker`):

```
Use Task tool:
  description: "Run ts-qa tool: eslintReport"
  subagent_type: "ts-qa-ci_ts-qa-runner"
  prompt: "Run npx ts-qa -t eslintReport --llm and report the summary"
```

### When user says: "run phase 2" / "run static analysis"

Map to a phase number (0 Fast Fail, 1 Code Modification, 2 Lint & Validation, 3 Static Analysis, 4 Testing):

```
Use Task tool:
  description: "Run ts-qa phase 3"
  subagent_type: "ts-qa-ci_ts-qa-runner"
  prompt: "Run npx ts-qa --phase 3 --llm and report the summary"
```

### Optional path scoping

If the user names a directory/file and the tool supports `-p` (see `docs/pipeline.md` — not every tool is path-supporting), pass it through in the prompt: `"Run npx ts-qa -t tsc -p src/components --llm"`.

## Parse the Agent's Output

The runner agent returns:

- **Verdict**: PASS, or FAIL at phase N
- **Per-phase table**: each tool's `exitClass` (`clean` | `failure` | `crash`)
- **Failing tools list**, if any
- **Cache file path** (`node_modules/.cache/ts-qa/llm/last-run.json`) for deeper detail

Report this to the user as-is. If the caller is the `ts-qa` orchestrator skill, hand the failing-tools list to the appropriate fixer skill instead of stopping.

## Reference

See `.claude/agents/ts-qa-ci_ts-qa-runner.md` for the agent's execution and parsing details.
