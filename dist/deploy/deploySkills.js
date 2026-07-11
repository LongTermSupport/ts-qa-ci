import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectHooksDaemon } from "./detectHooksDaemon.js";
import { copyDirIdempotent, writeIfChanged } from "./fsUtils.js";
import { generateProjectHandlerSource } from "./projectHandlerTemplate.js";
const TRUTHY = new Set(["true", "1", "yes", "on"]);
function isDeployDisabled(env) {
  const value = env.TSQA_DISABLE_DEPLOY;
  return value !== undefined && TRUTHY.has(value.toLowerCase());
}
/**
 * ts-qa deploy-skills (phase2-design.md §5). Manual deploy only for v1 - no
 * postinstall auto-deploy (npm's --ignore-scripts / pnpm's default
 * lifecycle-script blocking make that an unreliable default-on mechanism).
 */
export async function deploySkills(options) {
  // Step 7: opt-out env var, logged on every run whether set or not (proactive-discovery UX).
  console.log(
    "ts-qa: TSQA_DISABLE_DEPLOY=1 skips this deploy entirely (checked first, accepts true/1/yes/on).",
  );
  if (isDeployDisabled(process.env)) {
    console.log("ts-qa: TSQA_DISABLE_DEPLOY is set — skipping deploy-skills.");
    return;
  }
  const claudeDir = join(options.cwd, ".claude");
  // Step 1: copy skills/*, agents/*.md into the consumer's .claude/skills/, .claude/agents/.
  const skillsResult = copyDirIdempotent(
    join(options.packageRoot, "skills"),
    join(claudeDir, "skills"),
  );
  const agentsResult = copyDirIdempotent(
    join(options.packageRoot, "agents"),
    join(claudeDir, "agents"),
  );
  console.log(
    `ts-qa: skills — ${skillsResult.copied.length} written, ${skillsResult.unchanged.length} unchanged; ` +
      `agents — ${agentsResult.copied.length} written, ${agentsResult.unchanged.length} unchanged.`,
  );
  // Step 2-4: does NOT write classic .claude/hooks/*.py files. Detect daemon presence and
  // branch: daemon consumers get a project-handler; non-daemon consumers get the classic
  // hooks + settings.json fallback.
  const hasHooksDaemon = detectHooksDaemon(options.cwd);
  if (hasHooksDaemon) {
    // Step 3: register as a project-handler, not a classic hook. Must land in the
    // session_start/ event-type subdirectory - the daemon's project-handler loader
    // only scans known event-type subdirectories, never the project-handlers/ root
    // (confirmed empirically while dogfooding on lts-commerce-site, Plan 011 Task 4.9).
    const handlerPath = join(
      claudeDir,
      "project-handlers",
      "session_start",
      "ts_qa_ci_handler.py",
    );
    const { written } = writeIfChanged(
      handlerPath,
      generateProjectHandlerSource(),
    );
    console.log(
      `ts-qa: project-handler ${written ? "written" : "unchanged"} at ${handlerPath}.`,
    );
    console.log(
      "ts-qa: restart the hooks daemon to load it, then run `validate-project-handlers` to confirm it loads cleanly.",
    );
  } else {
    // Fallback: classic .claude/hooks/*.py + settings.json entries for non-daemon consumers.
    console.log(
      "ts-qa: no hooks-daemon detected — classic hook deploy is not yet implemented in this scaffold (Task 3.4 follow-up).",
    );
  }
  // Step 5: must never write to settings.local.json — only settings.json and project-handlers/.
  const settingsLocalPath = join(claudeDir, "settings.local.json");
  if (existsSync(settingsLocalPath)) {
    // This file is only read for an advisory "hooks key present" warning, so a
    // malformed or empty settings.local.json must never abort the deploy: guard
    // the read+parse, warn, and continue.
    let settingsLocal;
    try {
      settingsLocal = JSON.parse(readFileSync(settingsLocalPath, "utf-8"));
    } catch (cause) {
      console.warn(
        `ts-qa: WARNING — could not parse ${settingsLocalPath} — skipping hooks-key advisory ` +
          `(${cause instanceof Error ? cause.message : String(cause)}).`,
      );
    }
    if (settingsLocal !== undefined && "hooks" in settingsLocal) {
      console.warn(
        `ts-qa: WARNING — ${settingsLocalPath} contains a "hooks" key. ts-qa-ci will never write there; ` +
          "this pre-existing entry is a policy violation independent of this deploy (see hook_registration_checker).",
      );
    }
  }
  console.log("ts-qa: deploy-skills complete.");
}
//# sourceMappingURL=deploySkills.js.map
