import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RunContext, ToolResult } from './types.js';

/**
 * tsQaConfig/hookPre.ts / hookPost.ts (phase2-design.md §2.7). Pre-hook runs
 * after config resolution but before any tool executes; post-hook runs only
 * after every phase succeeds (unreached on any upstream failure - the
 * pipeline is fail-fast by default).
 */

export interface HookContext {
  phases: number[];
  platform: RunContext['platform'];
  ci: boolean;
  readOnly: boolean;
  toolResults: Record<string, ToolResult>;
}

type HookFn = (ctx: HookContext) => Promise<void> | void;

async function loadHook(projectRoot: string, fileName: 'hookPre.ts' | 'hookPost.ts'): Promise<HookFn | undefined> {
  const hookPath = join(projectRoot, 'tsQaConfig', fileName);
  if (!existsSync(hookPath)) return undefined;
  const mod = (await import(pathToFileURL(hookPath).href)) as { default: HookFn };
  return mod.default;
}

export async function runPreHook(projectRoot: string, ctx: HookContext): Promise<void> {
  const hook = await loadHook(projectRoot, 'hookPre.ts');
  if (hook) await hook(ctx);
}

export async function runPostHook(projectRoot: string, ctx: HookContext): Promise<void> {
  const hook = await loadHook(projectRoot, 'hookPost.ts');
  if (hook) await hook(ctx);
}
