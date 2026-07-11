---
name: ts-qa
description: |
  🔄 TS-QA-CI PIPELINE ORCHESTRATOR - Automatic run→fix→run cycling for
  ts-qa-ci tools.

  **ONLY for ts-qa-ci pipeline tools** (`ts-qa` / `npx ts-qa`)
  NOT for ad-hoc tool execution outside ts-qa-ci (e.g. calling `eslint`
  directly bypasses the generated Tier A config - see docs/configuration.md).

  Use when user requests QA via ts-qa-ci:
  - "run ts-qa", "run qa", "run the pipeline"
  - "run eslint", "fix the lint errors", "run tsc", "fix type errors"
  - "run phase 2", "run static analysis"
  - "is the pipeline clean", "get this ready to commit"

  **CRITICAL**: MUST cycle automatically until the pipeline reports clean OR
  escalation is needed. DO NOT stop after one fix to ask "what next?" - KEEP
  CYCLING.

  Supports the full pipeline, any single phase (0-4), or any single tool
  (oxlint, prettier, eslintFix, eslintReport, remarkValidateLinks, knip, tsc,
  dependencyCruiser, vitest, playwright, stryker) via `ts-qa -t <tool>` /
  `--phase <n>`.

  Automatically detects which failing tools have a fixer and invokes it.
allowed-tools: Skill, Task
---

# ts-qa-ci Pipeline Orchestrator Skill

**THIS SKILL IS EXCLUSIVELY FOR THE `ts-qa` PIPELINE**

All tool execution MUST go through `ts-qa` (via the runner skill/agent below), never a bare `eslint`/`tsc`/`vitest` invocation. `ts-qa` resolves Tier A rules into a generated ESLint config, applies the read-only/CI-write duality, and writes the `--llm` cache — bypassing it loses all of that (see `docs/configuration.md`'s "ESLint seems to ignore your config" troubleshooting entry for exactly what goes wrong).

## 🚨 CRITICAL INSTRUCTION — READ FIRST

**YOU MUST CYCLE AUTOMATICALLY WITHOUT STOPPING**

**Forbidden**:

- ❌ Running once, fixing once, then asking "should I run again?"
- ❌ Stopping to report status between iterations
- ❌ Using the Bash tool to run `ts-qa` yourself (burns main-context tokens on tool output that a cheap agent should absorb)

**Required**:

- ✅ Detect what the user wants (full pipeline / phase / tool) from their request
- ✅ Invoke the **`ts-qa-runner` skill** (NOT Bash) to execute
- ✅ If the result has failures with a matching fixer skill, invoke that fixer skill
- ✅ Keep cycling: run → fix → run → ... until clean or escalation
- ✅ Report a final summary only when done

## Phase → Tool Map

| Phase | Name              | Tools                                         | Mutates? |
| ----- | ----------------- | --------------------------------------------- | -------- |
| 0     | Fast Fail         | `supplyChain`, `oxlint`                       | fix      |
| 1     | Code Modification | `prettier`, `eslintFix`                       | yes      |
| 2     | Lint & Validation | `eslintReport`, `remarkValidateLinks`, `knip` | no       |
| 3     | Static Analysis   | `tsc`, `dependencyCruiser`                    | no       |
| 4     | Testing           | `vitest`, `playwright`, (opt-in) `stryker`    | no       |

Full detail: `docs/pipeline.md`.

## Tool → Fixer Map

| Failing tool                                                      | Has a fixer skill?                           | Fixer                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `eslintReport` (or `eslintFix` residue)                           | ✅                                           | `eslint-fixer` skill                                                          |
| `tsc`                                                             | ✅                                           | `tsc-fixer` skill                                                             |
| `oxlint`, `prettier`, `eslintFix`                                 | self-fixing                                  | re-run via `ts-qa-runner` (writes apply automatically)                        |
| `remarkValidateLinks`, `knip`, `dependencyCruiser`, `supplyChain` | ❌ report-only                               | report to user, no auto-fix                                                   |
| `vitest`, `playwright`                                            | ❌ report-only (out of scope for this suite) | report to user; fixing test failures is ordinary code work, not a QA-rule fix |
| `stryker`                                                         | ❌ opt-in, report-only                       | report MSI, ask user for next steps                                           |

## Universal Iteration Loop

```
INITIALIZE:
  iteration = 0
  max_iterations = 5
  previous_failing_tools = []
  scope = detect_scope_from_user_request()   # full pipeline | phase N | tool X

LOOP:
  1. [Skill] Invoke ts-qa-runner skill with `scope`
     → Runner skill launches ts-qa-ci_ts-qa-runner agent (haiku)
     → Agent runs: npx ts-qa [--phase N | -t X] --llm
     → Agent returns verdict + per-phase/per-tool table + failing tools

  2. Parse result:
     - PASS (verdict clean)? → Report success, EXIT
     - CRASH exitClass on any tool? → Escalate immediately, EXIT (a crash is a
       tool/config error, not "found issues" - retrying/fixing won't help)
     - FAILURE exitClass present? → continue to step 3

  3. Check escalation:
     - iteration >= max_iterations? → Escalate, EXIT
     - failing_tools == previous_failing_tools (no change since last cycle)? → Escalate, EXIT

  4. For each failing tool, in phase order (fix earlier phases first - a
     Phase 1 fix can change what Phase 2/3 even see):
     - eslintReport → [Skill] Invoke eslint-fixer skill
     - tsc → [Skill] Invoke tsc-fixer skill
     - oxlint/prettier/eslintFix → self-fixing, nothing to invoke; the NEXT
       run picks up the applied fix automatically
     - remarkValidateLinks/knip/dependencyCruiser/supplyChain/vitest/
       playwright/stryker → no fixer available; report and EXIT (ask user)

  5. iteration++, previous_failing_tools = failing_tools
  6. IMMEDIATELY goto LOOP (no pause, no questions)
END
```

## Step Summaries

### After Runner Execution

```markdown
## 🔄 Iteration X - Runner Results

**Scope**: full pipeline | phase N | tool X
**Verdict**: PASS | FAIL at phase N
**Failing tools**: eslintReport (failure), tsc (failure)
**Next action**: Launching eslint-fixer, tsc-fixer
```

### After Fixer Execution

```markdown
## 🔧 Iteration X - Fixer Results

**Fixer**: eslint-fixer
**Fixes applied**: X
**Files modified**: Y
**Next action**: Re-running to verify
```

### Final Summary (Clean)

```markdown
## ✅ ts-qa Pipeline Complete

**Scope**: full pipeline
**Total iterations**: X
**Final status**: All phases clean
**Cache file**: node_modules/.cache/ts-qa/llm/last-run.json

Pipeline succeeded!
```

### Escalation Summary (Stuck)

```markdown
## ⚠️ Escalation Needed

**Scope**: full pipeline
**Iterations attempted**: X
**Issue**: Same failing tools persisting | Max iterations reached | Tool crashed | No fixer available
**Remaining failing tools**: tsc (failure) - 4 errors requiring an API contract decision

**Recommendation**: Human review required.
```

## Example: Full Pipeline Workflow

```
User: "get this ready to commit"

Iteration 1:
  [Skill] ts-qa-runner (full pipeline)
    → Verdict: FAIL at phase 2 - eslintReport:failure, tsc:failure (phase 3 not reached)
  [Skill] eslint-fixer → fixed 5 violations
  [Skill] tsc-fixer → fixed 2 errors
  [AUTO-CONTINUE - NO PAUSE]

Iteration 2:
  [Skill] ts-qa-runner (full pipeline)
    → Verdict: FAIL at phase 4 - vitest:failure (phases 0-3 now clean)
  [No fixer for vitest - test failures are ordinary code work]
  [ESCALATE]

Report:
"⚠️ Phases 0-3 clean after 2 iterations (5 ESLint + 2 tsc fixes applied).
Phase 4 (vitest) has failing tests - no auto-fixer for this; needs
human/code-level investigation of the actual test failures."
```

## Escalation Triggers

Stop cycling and report when:

1. **Max iterations reached (5)** - tool keeps finding issues
2. **Same failing tools persist across 2 iterations** - a fixer couldn't resolve them
3. **A tool crashes** (`exitClass: "crash"`) - configuration/tool error, not "found issues"; never retry a crash expecting a different result
4. **No fixer available** for the failing tool - report and ask the user
5. **`ts-qa-runner` itself errors** (e.g. `ts-qa` not installed, `package.json` missing the peer dependency) - this is an environment problem, escalate immediately

## Reference

- `ts-qa-runner` skill → `ts-qa-ci_ts-qa-runner` agent (haiku)
- `eslint-fixer` skill → `ts-qa-ci_eslint-fixer` agent (sonnet)
- `tsc-fixer` skill → `ts-qa-ci_tsc-fixer` agent (sonnet)
- `defence-before-fix` skill — invoke separately once a bug is fixed, to ratchet a rule against it recurring (not part of this orchestrator's auto-cycle)
- `docs/pipeline.md`, `docs/tools.md`, `docs/configuration.md` — full pipeline reference
