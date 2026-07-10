import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ToolResult } from './types.js';

/**
 * var/qa/ result caching (phase2-design.md §2.3). Keyed on a content hash of
 * the tool's config + input paths, so a rerun with nothing changed can skip
 * straight to the cached result instead of re-invoking the tool. Written
 * fresh for ts-qa-ci (no source available to lift from) - the shape mirrors
 * what Plan 011's research described: var/qa/<tool>/<hash>.<timestamp>.json.
 */

export interface CacheEntry {
  toolName: string;
  hash: string;
  timestamp: string;
  result: ToolResult;
}

function cacheDir(projectRoot: string, toolName: string): string {
  return join(projectRoot, 'var', 'qa', toolName);
}

export function computeCacheKey(inputs: string[]): string {
  const hash = createHash('sha256');
  for (const input of inputs) hash.update(input);
  return hash.digest('hex').slice(0, 16);
}

export function readCache(projectRoot: string, toolName: string, key: string): ToolResult | undefined {
  const dir = cacheDir(projectRoot, toolName);
  const path = join(dir, `${key}.json`);
  if (!existsSync(path)) return undefined;
  const entry = JSON.parse(readFileSync(path, 'utf-8')) as CacheEntry;
  return entry.result;
}

export function writeCache(projectRoot: string, toolName: string, key: string, result: ToolResult): void {
  const dir = cacheDir(projectRoot, toolName);
  mkdirSync(dir, { recursive: true });
  const entry: CacheEntry = { toolName, hash: key, timestamp: new Date().toISOString(), result };
  writeFileSync(join(dir, `${key}.json`), JSON.stringify(entry, null, 2));
}
