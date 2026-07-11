import { detectPlatform } from './detectPlatform.js';
import { detectCi, detectReadOnly } from './detectReadOnly.js';
import { runPostHook, runPreHook } from './hooks.js';
import { resolveDisabledTools } from './resolveDisabledTools.js';
import { RESTART_WARNING } from './retryGate.js';
import { runPhase } from './runPhase.js';
import { runSingleTool } from './runSingleTool.js';
const PHASES = [
    // Phase 0 runs unconditionally first, on every full pipeline run (never skipped by
    // --phase 1-4). oxlint is 50-100x faster than ESLint and catches a large class of
    // obvious problems near-instantly - if it fails, abort before paying for anything
    // downstream (Prettier, the full type-aware ESLint pass, tsc, tests). This is the
    // TS-side equivalent of php-qa-ci's verified cheap-before-expensive tool ordering
    // (bin/qa: allCodingStandardsTools -> allLintingTools -> allStaticAnalysisTools ->
    // allTestingTools, with phpLint itself ordered ahead of pricier checks within its
    // own phase). See PLAN.md Decision 7.
    // supplyChain runs first: a near-instant read-only audit of the consumer's
    // package-manager supply-chain config (bake window, blocked install scripts,
    // lockfile-drift failure, public registry, pinned pnpm). If the project isn't
    // protected, fail before doing anything else. See src/tools/supplyChain.ts.
    { number: 0, name: 'Fast Fail', tools: ['supplyChain', 'oxlint'], mutates: true },
    { number: 1, name: 'Code Modification', tools: ['prettier', 'eslintFix'], mutates: true },
    {
        number: 2,
        name: 'Lint & Validation',
        tools: ['eslintReport', 'remarkValidateLinks', 'knip'],
        mutates: false,
    },
    { number: 3, name: 'Static Analysis', tools: ['tsc', 'dependencyCruiser'], mutates: false },
    { number: 4, name: 'Testing', tools: ['vitest', 'playwright'], mutates: false },
];
/**
 * Top-level phase-ladder driver (phase2-design.md §2.2/§2.3): mutate -> lint
 * -> analyse -> test. Fail-fast across phases too - a Phase 1 failure stops
 * the whole run rather than proceeding to lint code that couldn't be fixed.
 */
export async function runPipeline(options) {
    const ci = detectCi(process.env, Boolean(process.stdin.isTTY), Boolean(process.stdout.isTTY));
    // BUG A: surface CLAUDECODE-triggered CI mode, but never on `--json` runs
    // (an unconditional log in detectCi prepended non-JSON text to stdout). The
    // condition mirrors detectCi: CI=true wins first, so this only fires when
    // CLAUDECODE alone enabled CI mode.
    if (!options.json && process.env.CI !== 'true' && process.env.CLAUDECODE === '1') {
        console.log('Claude Code environment detected - enabling CI mode');
    }
    // BUG A: the eslint tools re-enter resolveEslintConfig inside a spawned
    // subprocess (via the generated flat config), which inherits this process's
    // env but not `options.json`. Propagate the json flag through the environment
    // so the subprocess suppresses its Tier A exemption diagnostics too.
    if (options.json)
        process.env.TSQA_JSON = '1';
    // CLI --write/--read-only (forceWrite/forceReadOnly) override the env-derived value,
    // equivalent to QA_READONLY=0/1 in php-qa-ci. Both are only ever `true` or `undefined`
    // (set when the corresponding flag is passed, never explicitly `false`).
    let readOnly;
    if (options.forceReadOnly === true) {
        readOnly = true;
    }
    else if (options.forceWrite === true) {
        readOnly = false;
    }
    else {
        readOnly = detectReadOnly(process.env);
    }
    const platform = detectPlatform(options.cwd);
    const ctx = {
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
        packageRoot: options.packageRoot,
    };
    // `-t <tool>` bypasses phase grouping entirely (docs/pipeline.md "Running a
    // single phase or tool") - this is issue #1's fix: `options.tool` used to
    // be parsed by bin/ts-qa.js and then never read here, so `-t` silently ran
    // the whole phase ladder instead of the one requested tool.
    //
    // Both hooks are skipped for a single-tool run, deliberately:
    //   - hookPre's HookContext carries `phases: number[]` describing the
    //     phases about to run, which doesn't describe a bypass.
    //   - hookPost specifically means "every phase in this run succeeded";
    //     firing it after one arbitrary tool (e.g. `-t stryker`, which isn't
    //     in any phase at all) would misrepresent that guarantee to a
    //     consumer's hookPost.ts script.
    // This keeps `-t` minimal and unsurprising rather than trying to make the
    // hook contract mean two different things.
    if (options.tool !== undefined) {
        const result = await runSingleTool(options.tool, ctx, options.packageRoot, options.cwd);
        return { phases: [result], success: !result.failed, hasBeenRestarted: ctx.hasBeenRestarted };
    }
    await runPreHook(options.cwd, {
        phases: PHASES.map((p) => p.number),
        platform,
        ci,
        readOnly,
        toolResults: {},
    });
    // Explicit undefined check, not truthiness — options.onlyPhase can legitimately be 0.
    const selectedPhases = options.onlyPhase !== undefined ? PHASES.filter((p) => p.number === options.onlyPhase) : PHASES;
    // Tool opt-out (tsQaConfig/ts-qa.json `disabledTools` + CLI `--skip`). Filter each
    // phase's tool list; a phase whose every tool is disabled is dropped entirely. The
    // canonical case is Playwright, which needs a served instance and is often run as a
    // separate served-instance CI job. Log each disabled tool once, like Tier A exemptions
    // are logged — never silently skip a tool.
    const { disabled, sources } = resolveDisabledTools(options.cwd, options.skipTools ?? []);
    if (!ctx.json && disabled.size > 0) {
        for (const name of disabled) {
            const via = sources.get(name) === 'cli' ? '--skip' : 'tsQaConfig/ts-qa.json';
            console.log(`ts-qa: ${name}: disabled (${via})`);
        }
    }
    const phasesToRun = selectedPhases
        .map((p) => ({ ...p, tools: p.tools.filter((t) => !disabled.has(t)) }))
        .filter((p) => p.tools.length > 0);
    const results = [];
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
    if (ctx.hasBeenRestarted)
        console.warn(`ts-qa: ${RESTART_WARNING}`);
    return { phases: results, success: true, hasBeenRestarted: ctx.hasBeenRestarted };
}
//# sourceMappingURL=runPipeline.js.map