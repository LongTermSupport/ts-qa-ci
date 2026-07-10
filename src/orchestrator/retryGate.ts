import * as readline from 'node:readline/promises';
import type { RunContext, ToolModule, ToolResult } from './types.js';

/**
 * CI-vs-interactive retry gate (phase2-design.md §2.6). Never retries a
 * crash. In CI, fails fast with no prompt (unless --aggregate, handled by the
 * caller). Interactively, offers a retry loop and flags hasBeenRestarted so
 * the end-of-run warning fires ("re-run the whole pipeline to be sure").
 */
export async function retryGate(tool: ToolModule, ctx: RunContext): Promise<ToolResult> {
  const result = await tool.run(ctx);

  if (result.exitClass === 'clean') return result;
  if (result.exitClass === 'crash') return result; // caller aborts on crash, never retries

  // result.exitClass === 'failure'
  if (ctx.ci) return result; // CI: fail-fast unless --aggregate (handled by runPhase.ts)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${tool.name} failed. Try again? (y/n) `);
    if (answer.trim().toLowerCase() === 'y') {
      ctx.hasBeenRestarted = true;
      return retryGate(tool, ctx);
    }
    return result;
  } finally {
    rl.close();
  }
}

export const RESTART_WARNING =
  'RAN WITH RETRIES — re-run the whole pipeline to be sure everything is fine (a retried tool does not re-validate phases that already passed before the fix).';
