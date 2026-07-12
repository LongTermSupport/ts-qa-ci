import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { isResolvedEslintConfig } from "../orchestrator/resolvedConfigMarker.js";
import type {
  RunContext,
  ToolModule,
  ToolResult,
} from "../orchestrator/types.js";

/**
 * SSoT parity check (Fable audit 3). The single ESLint config guarantee is that
 * `npx eslint` (native flat-config discovery → the project-root eslint.config.js)
 * and `npx ts-qa` (its generated `--config` → resolveEslintConfig) run the
 * IDENTICAL rule set. Two independent configs = "green" from either is meaningless.
 *
 * A project-root config is OPTIONAL — a project may lint solely through ts-qa. But
 * IF a project keeps a root `eslint.config.js`, it MUST be a thin delegator to
 * `projectEslintConfig` (which routes through resolveEslintConfig and stamps the
 * resolved-config marker). This phase-0 check dynamic-imports the root config and:
 *
 *   - no root config found            → clean (qaConfig-only is a valid setup)
 *   - root config carries the marker  → clean (it delegates; both entrypoints agree)
 *   - root config present but unmarked→ FAILURE (it hand-rolls a divergent rule set)
 *   - root config throws on import    → FAILURE (surfaced with the underlying error)
 *
 * It runs first in Phase 0, before any real work: if the two entrypoints disagree,
 * every later result is reported against the wrong rules, so fail immediately.
 */

const ROOT_CONFIG_CANDIDATES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
] as const;

const DELEGATOR_SNIPPET = `import { projectEslintConfig } from "@longtermsupport/ts-qa-ci";
export default await projectEslintConfig(import.meta.url);`;

function findRootConfig(cwd: string): string | undefined {
  for (const candidate of ROOT_CONFIG_CANDIDATES) {
    const full = join(cwd, candidate);
    if (existsSync(full)) return full;
  }
  return undefined;
}

const tool: ToolModule = {
  name: "eslintConfigParity",
  phase: 0,
  mutates: false,
  // The check is about config TOPOLOGY, not a file set — it ignores ctx.path, so
  // it is safe (and must stay runnable) under `-p`/--path scoped runs.
  pathSupporting: true,

  async run(ctx: RunContext): Promise<ToolResult> {
    // Self-hosting: ts-qa-ci linting its own repo has no consumer root config and
    // enforces via its generated config directly (see generateEslintConfigFile.ts).
    if (ctx.cwd === ctx.packageRoot) {
      return { exitClass: "clean", stdout: "", stderr: "" };
    }

    const rootConfigPath = findRootConfig(ctx.cwd);

    // A stray eslint.config.ts we cannot dynamic-import without a TS loader — do not
    // pretend it is absent (that would let a divergent config through). Fail with guidance.
    if (!rootConfigPath && existsSync(join(ctx.cwd, "eslint.config.ts"))) {
      return {
        exitClass: "failure",
        stdout:
          "ts-qa: eslint.config.ts cannot be verified by the SSoT parity check " +
          "(no TS loader at config-resolution time). Use eslint.config.js delegating to " +
          "projectEslintConfig, or remove it and rely on ts-qa's generated config.\n",
        stderr: "",
      };
    }

    if (!rootConfigPath) {
      // No project-root config at all — a valid, in-sync-by-absence setup. `npx eslint`
      // and editors won't run ts-qa's rules, but nothing can silently diverge either.
      return {
        exitClass: "clean",
        stdout: ctx.json
          ? ""
          : "ts-qa: no project-root eslint.config.js (linting via ts-qa only) — OK.\n",
        stderr: "",
      };
    }

    let defaultExport: unknown;
    try {
      const mod = (await import(pathToFileURL(rootConfigPath).href)) as {
        default: unknown;
      };
      defaultExport = mod.default;
    } catch (error) {
      return {
        exitClass: "failure",
        stdout:
          `ts-qa: project-root ${rootConfigPath.replace(ctx.cwd + "/", "")} failed to load, ` +
          `so it cannot be proven in sync with ts-qa's config: ${(error as Error).message}\n`,
        stderr: "",
      };
    }

    if (isResolvedEslintConfig(defaultExport)) {
      return {
        exitClass: "clean",
        stdout: ctx.json
          ? ""
          : "ts-qa: project-root eslint.config.js delegates to ts-qa — in sync.\n",
        stderr: "",
      };
    }

    const rel = rootConfigPath.replace(ctx.cwd + "/", "");
    return {
      exitClass: "failure",
      stdout:
        `ts-qa: project-root ${rel} does NOT delegate to ts-qa's resolved config.\n` +
        `\n` +
        `  \`npx eslint\` (which discovers ${rel}) and \`npx ts-qa\` are therefore running\n` +
        `  DIFFERENT rule sets — a "clean" result from either proves nothing. A root config\n` +
        `  is optional, but if present it must be a delegator. Replace ${rel} with:\n` +
        `\n` +
        DELEGATOR_SNIPPET.split("\n")
          .map((line) => `      ${line}`)
          .join("\n") +
        `\n\n` +
        `  Move any project-specific rules (local plugins, strict-TS, per-dir overrides)\n` +
        `  into tsQaConfig/eslint.config.js — the single home ts-qa composes for BOTH\n` +
        `  entrypoints. Or delete ${rel} entirely to lint solely through ts-qa.\n`,
      stderr: "",
    };
  },
};

export default tool;
