---
name: tsc-fixer
description: |
  Resolve tsc --noEmit type errors reported by ts-qa's Phase 3 static analysis.
  Use when:
  - The tsc tool reports failures
  - User says "fix the type errors" / "fix tsc errors" / "fix the type check"
  - The ts-qa orchestrator skill needs a fixer for a failing tsc result
  Delegates to the ts-qa-ci_tsc-fixer agent (sonnet) to read errors and
  implement fixes. Does NOT run ts-qa - use ts-qa-runner for that.
allowed-tools: Task
---

# tsc Fixer Skill

This skill fixes `tsc --noEmit` type errors surfaced by `ts-qa`'s Phase 3 static analysis. It never suppresses an error (`@ts-ignore`/`as any`) — see this project's own type-safety principle: types are proofs, not annotations.

## Workflow

### When user says: "fix the type errors"

1. If a recent `--llm` run exists, hand its cache path straight to the fixer:

   ```
   Use Task tool:
     description: "Fix tsc errors"
     subagent_type: "ts-qa-ci_tsc-fixer"
     prompt: "Read node_modules/.cache/ts-qa/llm/last-run.json, find tsc errors, and fix them"
   ```

2. If no recent run exists, invoke the `ts-qa-runner` skill first (tool: `tsc`), then pass its result to the fixer.

3. After fixes, hand back to the caller — do NOT re-run `ts-qa` yourself; that's the runner's job. (If this skill was invoked directly by the user rather than by the `ts-qa` orchestrator, suggest re-running via the `ts-qa-runner` skill to verify.)

### Escalation Triggers

Report to the user rather than looping when the fixer agent reports:

- A public API / exported type change with unclear blast radius
- The same error persisting after 2 attempts
- A generated file (`src/generated/`, `dist/`) itself carrying the error

## Reference

See `.claude/agents/ts-qa-ci_tsc-fixer.md` for the agent's fix patterns and escalation rules.
