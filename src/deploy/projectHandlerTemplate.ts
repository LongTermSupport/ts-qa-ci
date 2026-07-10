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
 * `matches()`/`handle()`, not just `get_claude_md()` - confirmed by reading
 * a real working example handler already present in the target project.
 * `deploySkills.ts` writes this into `session_start/` accordingly: pure
 * context-injection, so `matches()` always returns True and `handle()` is a
 * plain ALLOW no-op.
 */
export function generateProjectHandlerSource(): string {
  return `"""
ts-qa-ci project handler, deployed by \`ts-qa deploy-skills\`.
Regenerate via that command rather than hand-editing - manual edits will
be overwritten on the next deploy.
"""

from typing import Any

from claude_code_hooks_daemon.core import Handler, HookResult
from claude_code_hooks_daemon.core.hook_result import Decision


class TsQaCiHandler(Handler):
    """Advisory handler surfacing ts-qa-ci pipeline status to Claude Code sessions."""

    def __init__(self) -> None:
        super().__init__(
            handler_id="ts-qa-ci",
            priority=55,
            terminal=False,
            tags=["project", "qa", "ts-qa-ci"],
        )

    def matches(self, hook_input: dict[str, Any]) -> bool:
        return True

    def handle(self, hook_input: dict[str, Any]) -> HookResult:
        return HookResult(decision=Decision.ALLOW)

    def get_claude_md(self) -> str | None:
        return (
            "## ts-qa-ci\\n\\n"
            "This project uses \`ts-qa-ci\` for QA/CI. Run \`npx ts-qa\` for the full "
            "pipeline, or \`npx ts-qa -t <tool>\` to run a single tool. See "
            "\`node_modules/@longtermsupport/ts-qa-ci/docs/\` for the full docs set.\\n"
        )
`;
}
