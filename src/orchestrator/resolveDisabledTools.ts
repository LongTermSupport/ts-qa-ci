import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every tool name the pipeline can run, across all phases plus the opt-in
 * Stryker. Used to validate `disabledTools` / `--skip` inputs so a typo fails
 * loudly instead of silently disabling nothing (or hiding a heavy tool the
 * author only *thought* was still on). Keep in sync with the PHASES table in
 * runPipeline.ts and the opt-in tools.
 */
export const KNOWN_TOOLS = [
  "supplyChain",
  "oxlint",
  "prettier",
  "eslintFix",
  "eslintReport",
  "remarkValidateLinks",
  "knip",
  "tsc",
  "dependencyCruiser",
  "vitest",
  "playwright",
  "stryker",
] as const;

type KnownTool = (typeof KNOWN_TOOLS)[number];

export interface DisabledToolsResult {
  /** Tool names to skip. */
  disabled: Set<string>;
  /** Where each disabled tool came from, for transparency logging. */
  sources: Map<string, "config" | "cli">;
}

function isKnownTool(name: string): name is KnownTool {
  return (KNOWN_TOOLS as readonly string[]).includes(name);
}

/**
 * Resolves the set of tools to skip for this run, from
 * `tsQaConfig/ts-qa.json` (`"disabledTools": [...]`) merged with any CLI
 * `--skip <tool>` values.
 *
 * The canonical use case is Playwright: it needs a served instance, so a
 * project can run browser tests as a separate served-instance CI job and keep
 * `ts-qa` scoped to the static + unit surface (`disabledTools: ["playwright"]`).
 *
 * Every name is validated against {@link KNOWN_TOOLS}; an unknown name throws
 * (a typo must not silently disable nothing). A missing config file is fine;
 * a present-but-malformed one throws rather than being silently ignored.
 */
export function resolveDisabledTools(
  projectRoot: string,
  cliSkip: string[] = [],
): DisabledToolsResult {
  const sources = new Map<string, "config" | "cli">();

  const configPath = join(projectRoot, "tsQaConfig", "ts-qa.json");
  if (existsSync(configPath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch (cause) {
      throw new Error(`ts-qa: could not parse ${configPath} as JSON`, {
        cause,
      });
    }

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "disabledTools" in parsed
    ) {
      const configDisabled = (parsed as { disabledTools: unknown })
        .disabledTools;
      if (!Array.isArray(configDisabled)) {
        throw new Error(
          `ts-qa: "disabledTools" in ${configPath} must be an array of tool names`,
        );
      }
      for (const name of configDisabled) {
        if (typeof name !== "string") {
          throw new Error(
            `ts-qa: "disabledTools" entries must be strings (got ${JSON.stringify(name)} in ${configPath})`,
          );
        }
        if (!sources.has(name)) sources.set(name, "config");
      }
    }
  }

  // CLI --skip wins the source label if a tool is named in both places.
  for (const name of cliSkip) sources.set(name, "cli");

  const unknown = [...sources.keys()].filter((name) => !isKnownTool(name));
  if (unknown.length > 0) {
    throw new Error(
      `ts-qa: unknown tool(s) in disabledTools/--skip: ${unknown.join(", ")}. Known tools: ${KNOWN_TOOLS.join(", ")}`,
    );
  }

  return { disabled: new Set(sources.keys()), sources };
}
