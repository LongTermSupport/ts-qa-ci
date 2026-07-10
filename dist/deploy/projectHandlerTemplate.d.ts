/**
 * Generates the Python project-handler file registered with a detected
 * hooks-daemon (phase2-design.md §5.1 step 3). Node-authored (this whole
 * deploy script is, per Decision in phase2-design.md §5) but the OUTPUT is
 * Python, because the daemon itself is Python.
 *
 * IMPORTANT: the exact method contract a project-handler class must
 * implement is daemon-version-specific (the project's own docs note e.g.
 * `get_claude_md` as a requirement introduced by a later daemon version).
 * This template is deliberately minimal and defers to
 * `validate-project-handlers` (run in Task 4.9's verification step) to
 * confirm it actually loads under whatever daemon version the target
 * project runs — do not assume this template is complete without that
 * check.
 */
export declare function generateProjectHandlerSource(): string;
//# sourceMappingURL=projectHandlerTemplate.d.ts.map