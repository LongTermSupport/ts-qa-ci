import { detectCi, detectReadOnly } from './detectReadOnly.js';
import { detectPlatform } from './detectPlatform.js';
import { runPhase, type PhaseResult } from './runPhase.js';
import { runPreHook, runPostHook } from './hooks.js';
import { RESTART_WARNING } from './retryGate.js';
import type { PhaseDefinition, RunContext } from './types.js';

export const PHASES: PhaseDefinition[] = [
  // Phase 0 runs unconditionally first, on every full pipeline run (never skipped by
  // --phase 1-4). oxlint is 50-100x faster than ESLint and catches a large class of
  // obvious problems near-instantly - if it fails, abort before paying for anything
  // downstream (Prettier, the full type-aware ESLint pass, tsc, tests). This is the
  // TS-side equivalent of php-qa-ci's verified cheap-before-expensive tool ordering
  // (bin/qa: allCodingStandardsTools -> allLintingTools -> allStaticAnalysisTools ->
  // allTestingTools, with phpLint itself ordered ahead of pricier checks within its
  // own phase). See PLAN.md Decision 7.
  { number: 0, name: 'Fast Fail', tools: ['oxlint'], mutates: true },
  { number: 1, name: 'Code Modification', tools: ['prettier', 'eslintFix'], mutates: true },
  { number: 2, name: 'Lint & Validation', tools: ['eslintReport', 'remarkValidateLinks', 'knip'], mutates: false },
  { number: 3, name: 'Static Analysis', tools: ['tsc', 'dependencyCruiser'], mutates: false },
  { number: 4, name: 'Testing', tools: ['vitest', 'playwright'], mutates: false },
];

export interface PipelineOptions {
  cwd: string;
  packageRoot: string;
  path?: string;
  onlyPhase?: 0 | 1 | 2 | 3 | 4;
  forceWrite?: boolean;
  forceReadOnly?: boolean;
  aggregate?: boolean;
  json?: boolean;
}

export interface PipelineResult {
  phases: PhaseResult[];
  success: boolean;
  hasBeenRestarted: boolean;
}

/**
 * Top-level phase-ladder driver (phase2-design.md §2.2/§2.3): mutate -> lint
 * -> analyse -> test. Fail-fast across phases too - a Phase 1 failure stops
 * the whole run rather than proceeding to lint code that couldn't be fixed.
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const ci = detectCi(process.env, Boolean(process.stdin.isTTY), Boolean(process.stdout.isTTY));

  // CLI --write/--read-only (forceWrite/forceReadOnly) override the env-derived value,
  // equivalent to QA_READONLY=0/1 in php-qa-ci. Both are only ever `true` or `undefined`
  // (set when the corresponding flag is passed, never explicitly `false`).
  let readOnly: boolean;
  if (options.forceReadOnly === true) {
    readOnly = true;
  } else if (options.forceWrite === true) {
    readOnly = false;
  } else {
    readOnly = detectReadOnly(process.env);
  }

  const platform = detectPlatform(options.cwd);

  const ctx: RunContext = {
    cwd: options.cwd,
    // exactOptionalPropertyTypes: only spread `path` in when it's actually defined -
    // `path?: string` means "absent or a string", not "present with value undefined".
    ...(options.path !== undefined ? { path: options.path } : {}),
    platform,
    ci,
    readOnly,
    aggregate: options.aggregate ?? false,
    hasBeenRestarted: false,
    json: options.json ?? false,
  };

  await runPreHook(options.cwd, { phases: PHASES.map((p) => p.number), platform, ci, readOnly, toolResults: {} });

  // Explicit undefined check, not truthiness — options.onlyPhase can legitimately be 0.
  const phasesToRun = options.onlyPhase !== undefined ? PHASES.filter((p) => p.number === options.onlyPhase) : PHASES;
  const results: PhaseResult[] = [];

  for (const phaseDef of phasesToRun) {
    const result = await runPhase(phaseDef, ctx, options.packageRoot, options.cwd);
    results.push(result);
    if (result.failed) {
      return { phases: results, success: false, hasBeenRestarted: ctx.hasBeenRestarted };
    }
  }

  await runPostHook(options.cwd, {
    phases: phasesToRun.map((p) => p.number),
    platform,
    ci,
    readOnly,
    toolResults: Object.assign({}, ...results.map((r) => r.toolResults)),
  });

  if (ctx.hasBeenRestarted) console.warn(`ts-qa: ${RESTART_WARNING}`);

  return { phases: results, success: true, hasBeenRestarted: ctx.hasBeenRestarted };
}
