/**
 * Generates the Python project-handler file registered with a detected
 * hooks-daemon (phase2-design.md §5.1 step 3). Node-authored (this whole
 * deploy script is, per Decision in phase2-design.md §5) but the OUTPUT is
 * Python, because the daemon itself is Python.
 *
 * Confirmed empirically against a real daemon install while dogfooding on
 * lts-commerce-site (Plan 011 Task 4.9): the daemon's project-handler
 * loader (`project_loader.py`) only scans known event-type subdirectories
 * (`pre_tool_use/`, `session_start/`, etc.) under `.claude/project-handlers/`
 * - a handler file placed at the directory root, as the original version of
 * this template produced, is silently never discovered. It also requires
 * every handler to extend the daemon's `Handler` ABC and implement
 * `matches()`/`handle()`/`get_acceptance_tests()`, not just
 * `get_claude_md()` - confirmed by reading a real working example handler
 * already present in the target project, and by the daemon's own
 * `validate-project-handlers` output naming the exact missing method one at
 * a time across two dogfooding iterations. `deploySkills.ts` writes this
 * into `session_start/` accordingly: pure context-injection, so `matches()`
 * always returns True, `handle()` is a plain ALLOW no-op, and
 * `get_acceptance_tests()` returns an empty list (no blocking/matching
 * behaviour exists here worth exercising).
 */
export declare function generateProjectHandlerSource(): string;
//# sourceMappingURL=projectHandlerTemplate.d.ts.map