---
name: eslint-fixer
description: |
  Fix ESLint / CDD violations that ts-qa's --fix pass could not auto-resolve.
  Use when:
  - eslintReport (Phase 2) reports failures after the eslintFix (Phase 1) pass
  - User says "fix the eslint errors" / "fix the lint errors" / "fix CDD violations"
  - The ts-qa orchestrator skill needs a fixer for a failing eslintReport result
  Delegates to the ts-qa-ci_eslint-fixer agent (sonnet) to read violations and
  implement fixes. Does NOT run ts-qa - use ts-qa-runner for that.
allowed-tools: Task
---

# ESLint Fixer Skill

This skill fixes ESLint/CDD violations that `ts-qa`'s auto-fix pass (`eslintFix`, Phase 1) could not resolve on its own — the ones that surface as failures in the `eslintReport` (Phase 2) pass, including `ts-qa-ci`'s own CDD rules (see `docs/cdd-rules.md`).

## When to Use This Skill vs Just Re-running `ts-qa`

Most ESLint issues are auto-fixed by Phase 1 already — you should never need this skill for those. This skill exists for the residue: rules that are report-only by design (no auto-fix exists), like most of the CDD tier.

## Workflow

### When user says: "fix the eslint errors"

1. If a recent `--llm` run exists, hand its cache path straight to the fixer:

   ```
   Use Task tool:
     description: "Fix eslintReport violations"
     subagent_type: "ts-qa-ci_eslint-fixer"
     prompt: "Read node_modules/.cache/ts-qa/llm/last-run.json, find eslintReport violations, and fix them"
   ```

2. If no recent run exists, invoke the `ts-qa-runner` skill first (tool: `eslintReport`), then pass its result to the fixer.

3. After fixes, hand back to the caller — do NOT re-run `ts-qa` yourself; that's the runner's job. (If this skill was invoked directly by the user rather than by the `ts-qa` orchestrator, suggest re-running via the `ts-qa-runner` skill to verify.)

### Escalation Triggers

Report to the user rather than looping when the fixer agent reports:

- A fix requires inventing a new component (`no-ad-hoc-html`/`no-ad-hoc-classnames`)
- The same violation persists after 2 attempts
- A suspected rule false-positive (see `docs/configuration.md` Troubleshooting)

## Reference

See `.claude/agents/ts-qa-ci_eslint-fixer.md` for the agent's fix patterns and escalation rules.
