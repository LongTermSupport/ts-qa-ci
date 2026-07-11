import * as readline from "node:readline/promises";
/**
 * CI-vs-interactive retry gate (phase2-design.md §2.6). Never retries a
 * crash. In CI, fails fast with no prompt (unless --aggregate, handled by the
 * caller). Interactively, offers a retry loop and flags hasBeenRestarted so
 * the end-of-run warning fires ("re-run the whole pipeline to be sure").
 */
export async function retryGate(tool, ctx) {
  let result = await tool.run(ctx);
  // BUG E: an interactive retry loop — the previous form recursed inside the
  // try{} *before* finally{rl.close()}, so each retry opened a new readline
  // interface without closing the previous one (stacked live stdin listeners
  // → MaxListenersExceededWarning and multi-delivery of keystrokes). Looping
  // keeps exactly one interface open at a time.
  for (;;) {
    if (result.exitClass === "clean") return result;
    if (result.exitClass === "crash") return result; // caller aborts on crash, never retries
    // result.exitClass === 'failure'
    if (ctx.ci) return result; // CI: fail-fast unless --aggregate (handled by runPhase.ts)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let answer;
    try {
      answer = await rl.question(`${tool.name} failed. Try again? (y/n) `);
    } finally {
      rl.close();
    }
    if (answer.trim().toLowerCase() !== "y") return result;
    ctx.hasBeenRestarted = true;
    result = await tool.run(ctx);
  }
}
export const RESTART_WARNING =
  "RAN WITH RETRIES — re-run the whole pipeline to be sure everything is fine (a retried tool does not re-validate phases that already passed before the fix).";
//# sourceMappingURL=retryGate.js.map
