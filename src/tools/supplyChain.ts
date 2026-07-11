import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RunContext, ToolModule, ToolResult } from '../orchestrator/types.js';

/**
 * Phase 0 — supply-chain config audit (Plan 00004; doctrine upstreamed from
 * admin-ts's `CLAUDE.md` §Supply chain — the law).
 *
 * WHY: the 2026 npm landscape is hostile. Worm-style attacks weaponise a fresh
 * package version within 5–30 minutes of upload (TanStack May 2026 — 42 packages,
 * 84 malicious versions). A project that installs during that window with no
 * protections is exposed to credential exfiltration on `pnpm install`. These
 * defences are configuration, not code — so they rot silently unless something
 * asserts them. This read-only Phase 0 check fails the pipeline the moment a
 * mandatory protection is missing, exactly like a lint rule fails on a bad
 * pattern.
 *
 * pnpm is REQUIRED: the release-age bake window (`minimumReleaseAge`) is a
 * pnpm-only feature, and mixing in npm/yarn would silently bypass it. The audit
 * therefore fails any project not pinned to pnpm.
 *
 * NOT flagged: first-party, SHA-pinned git dependencies (e.g.
 * `github:LongTermSupport/ts-qa-ci#<sha>`). ts-qa-ci itself is consumed that way
 * — it is not published to the public registry. The registry check governs only
 * the configured `registry=` URL (guarding against a rogue registry redirect),
 * never individual git deps, which are a sanctioned first-party channel.
 *
 * Config sources read from the consumer cwd (pnpm 10.16+ reads its settings from
 * pnpm-workspace.yaml even in a single-package layout; registry lives in .npmrc):
 *   - package.json      → `packageManager` (must be pnpm@<exact version>)
 *   - pnpm-workspace.yaml → minimumReleaseAge, dangerouslyAllowAllBuilds, verifyDepsBeforeRun
 *   - .npmrc            → registry (and kebab-case fallbacks)
 *
 * Tunable via tsQaConfig/ts-qa.json:
 *   { "supplyChain": { "minReleaseAgeMinutes": 10080 } }
 * Disable (rare — e.g. the tooling package itself) via `disabledTools`.
 */

const DEFAULT_MIN_RELEASE_AGE_MINUTES = 4320; // 3 days
const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';

interface SupplyChainConfig {
  minReleaseAgeMinutes: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonFile(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadConfig(cwd: string): SupplyChainConfig {
  const tsQa = readJsonFile(join(cwd, 'tsQaConfig', 'ts-qa.json'));
  const raw = tsQa?.['supplyChain'];
  if (isRecord(raw)) {
    const value = raw['minReleaseAgeMinutes'];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return { minReleaseAgeMinutes: value };
    }
  }
  return { minReleaseAgeMinutes: DEFAULT_MIN_RELEASE_AGE_MINUTES };
}

/**
 * Extract a top-level scalar key from a pnpm-workspace.yaml. Deliberately a
 * targeted line scan rather than a full YAML parse: the audited keys are all
 * top-level scalars (`key: value`), so this needs no YAML dependency (a new dep
 * in a supply-chain tool would be self-defeating). Comment lines and indented
 * (nested) keys are ignored.
 */
function readYamlScalar(content: string, key: string): string | null {
  for (const line of content.split('\n')) {
    if (/^\s*#/.test(line) || /^\s/.test(line)) continue; // comment or nested
    const match = new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`).exec(line);
    if (match?.[1] !== undefined) {
      return match[1].replace(/\s+#.*$/, '').trim(); // strip trailing comment
    }
  }
  return null;
}

/** Extract a key from an .npmrc (ini `key=value`, `;`/`#` comments). */
function readIniValue(content: string, key: string): string | null {
  for (const line of content.split('\n')) {
    if (/^\s*[;#]/.test(line)) continue;
    const match = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`).exec(line);
    if (match?.[1] !== undefined) return match[1].trim();
  }
  return null;
}

interface PmConfig {
  workspaceYaml: string | null;
  npmrc: string | null;
}

function readPmConfig(cwd: string): PmConfig {
  const wsPath = join(cwd, 'pnpm-workspace.yaml');
  const npmrcPath = join(cwd, '.npmrc');
  return {
    workspaceYaml: existsSync(wsPath) ? readFileSync(wsPath, 'utf-8') : null,
    npmrc: existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf-8') : null,
  };
}

/** Look a pnpm setting up in pnpm-workspace.yaml first, then .npmrc (kebab-case). */
function readSetting(pm: PmConfig, camelKey: string, kebabKey: string): string | null {
  if (pm.workspaceYaml) {
    const fromYaml = readYamlScalar(pm.workspaceYaml, camelKey);
    if (fromYaml !== null) return fromYaml;
  }
  if (pm.npmrc) {
    const fromNpmrc = readIniValue(pm.npmrc, kebabKey) ?? readIniValue(pm.npmrc, camelKey);
    if (fromNpmrc !== null) return fromNpmrc;
  }
  return null;
}

export function auditSupplyChain(cwd: string, config: SupplyChainConfig): string[] {
  const violations: string[] = [];

  // 1. pnpm required, pinned to an exact version.
  const pkg = readJsonFile(join(cwd, 'package.json'));
  const pmField: unknown = pkg?.['packageManager'];
  const packageManager = typeof pmField === 'string' ? pmField : null;
  if (packageManager === null) {
    violations.push('package.json "packageManager" is not set. Pin it to an exact pnpm version, e.g. "pnpm@11.1.2".');
  } else if (!/^pnpm@\d+\.\d+\.\d+/.test(packageManager)) {
    violations.push(
      `package.json "packageManager" is "${packageManager}". pnpm is required (it is the only package manager that enforces the minimumReleaseAge bake window); pin it to pnpm@<exact version>.`,
    );
  }

  const pm = readPmConfig(cwd);

  // 2. minimumReleaseAge — the bake window.
  const minAgeRaw = readSetting(pm, 'minimumReleaseAge', 'minimum-release-age');
  if (minAgeRaw === null) {
    violations.push(
      `minimumReleaseAge is not configured. Set it in pnpm-workspace.yaml to at least ${config.minReleaseAgeMinutes} (minutes) — the bake window that blocks freshly-published (potentially compromised) versions.`,
    );
  } else {
    const minAge = Number.parseInt(minAgeRaw, 10);
    if (!Number.isFinite(minAge) || minAge < config.minReleaseAgeMinutes) {
      violations.push(`minimumReleaseAge is ${minAgeRaw} but must be at least ${config.minReleaseAgeMinutes} minutes.`);
    }
  }

  // 3. dangerouslyAllowAllBuilds must not be true (install scripts blocked by default).
  const allowAllBuilds = readSetting(pm, 'dangerouslyAllowAllBuilds', 'dangerously-allow-all-builds');
  if (allowAllBuilds === 'true') {
    violations.push(
      'dangerouslyAllowAllBuilds is true — this runs every dependency install script. Set it false and allowlist specific packages via allowBuilds.',
    );
  }

  // 4. verifyDepsBeforeRun must fail (error) on lockfile drift.
  const verifyDeps = readSetting(pm, 'verifyDepsBeforeRun', 'verify-deps-before-run');
  if (verifyDeps !== 'error') {
    violations.push(
      `verifyDepsBeforeRun is ${verifyDeps ?? 'unset'} but must be "error" so a lockfile that drifts from the manifests fails loudly.`,
    );
  }

  // 5. registry, if configured, must be the public npm registry. A rogue registry
  //    redirect is a classic exfiltration vector. Absent = pnpm's public default = OK.
  //    Git deps are NOT governed here — they are a sanctioned first-party channel.
  if (pm.npmrc) {
    const registry = readIniValue(pm.npmrc, 'registry');
    if (registry !== null && registry.replace(/\/$/, '') !== PUBLIC_REGISTRY.replace(/\/$/, '')) {
      violations.push(
        `registry is "${registry}" — only the public npm registry (${PUBLIC_REGISTRY}) is allowed. (First-party SHA-pinned git dependencies are fine — they do not go through the registry.)`,
      );
    }
  }

  return violations;
}

const tool: ToolModule = {
  name: 'supplyChain',
  phase: 0,
  mutates: false,
  pathSupporting: false,

  run(ctx: RunContext): Promise<ToolResult> {
    const config = loadConfig(ctx.cwd);
    const violations = auditSupplyChain(ctx.cwd, config);

    if (violations.length === 0) {
      return Promise.resolve({
        exitClass: 'clean',
        stdout: 'ts-qa supplyChain: all supply-chain protections configured.\n',
        stderr: '',
      });
    }

    const report = [
      'ts-qa supplyChain: supply-chain protections missing or misconfigured:',
      ...violations.map((v) => `  ✗ ${v}`),
      '',
      'See docs/supply-chain.md. Run `ts-qa init` to scaffold a compliant pnpm-workspace.yaml + .npmrc.',
      '',
    ].join('\n');

    return Promise.resolve({ exitClass: 'failure', stdout: report, stderr: '' });
  },
};

export default tool;
