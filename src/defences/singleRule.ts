import { execTool } from "../tools/execTool.js";
import { generateEslintConfigFile } from "../tools/generateEslintConfigFile.js";
import type { RunContext } from "../orchestrator/types.js";

/**
 * `ts-qa rule <identifier> <path>`: the single-rule harness. Runs the ordinary
 * ESLint report lane over ONE path with the project's resolved configuration
 * and narrows the answer to ONE rule identifier: did it fire, and where.
 *
 * A rule author proves a new rule by making it go red on a fixture before
 * trusting a green full run; without this a green run is indistinguishable
 * from a run in which the rule was never loaded. Exit codes: 0 the rule did
 * not fire, 1 it fired (locations printed), 2 ESLint did not produce a run.
 */
export interface Firing {
  file: string;
  line: number;
  column: number;
  message: string;
}

interface EslintMessage {
  ruleId: string | null;
  line?: number;
  column?: number;
  message: string;
}

interface EslintFileReport {
  filePath: string;
  messages: EslintMessage[];
}

function isFileReport(value: unknown): value is EslintFileReport {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["filePath"] === "string" && Array.isArray(record["messages"])
  );
}

/** Every location the identifier fired in ESLint `--format json` output. */
export function firingsOf(json: string, identifier: string): Firing[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `ts-qa: expected ESLint --format json output: ${(error as Error).message}`,
      { cause: error },
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "ts-qa: expected ESLint --format json output (an array of file reports)",
    );
  }

  const firings: Firing[] = [];
  for (const report of parsed) {
    if (!isFileReport(report)) continue;
    for (const message of report.messages) {
      if (message.ruleId !== identifier) continue;
      firings.push({
        file: report.filePath,
        line: message.line ?? 0,
        column: message.column ?? 0,
        message: message.message,
      });
    }
  }
  return firings;
}

export function formatFirings(identifier: string, firings: Firing[]): string {
  if (firings.length === 0) return `${identifier} did not fire\n`;
  const lines = firings.map(
    (f) => `${f.file}:${f.line}:${f.column} ${f.message}`,
  );
  return `${identifier} FIRED (${firings.length})\n${lines.join("\n")}\n`;
}

export interface SingleRuleResult {
  fired: boolean;
  firings: Firing[];
  /** 0 did not fire, 1 fired, 2 no ESLint run. */
  exitCode: 0 | 1 | 2;
  output: string;
}

/**
 * Runs ESLint over `path` exactly as the eslintReport tool does (same generated
 * config, same rule set) and reports for `identifier` alone.
 */
export async function runSingleRule(
  identifier: string,
  path: string,
  ctx: RunContext,
): Promise<SingleRuleResult> {
  const configPath = generateEslintConfigFile(ctx);
  // The generated config re-enters resolveEslintConfig in the ESLint process;
  // TSQA_JSON keeps its exemption diagnostics off the JSON stdout.
  process.env["TSQA_JSON"] = "1";
  const result = await execTool(
    "npx",
    ["eslint", "--config", configPath, "--format", "json", path],
    ctx.cwd,
  );
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    return {
      fired: false,
      firings: [],
      exitCode: 2,
      output: `ts-qa: ESLint did not produce a run for ${path} (exit ${String(result.exitCode)}).\n${result.stderr}`,
    };
  }
  let firings: Firing[];
  try {
    firings = firingsOf(result.stdout, identifier);
  } catch (error) {
    return {
      fired: false,
      firings: [],
      exitCode: 2,
      output: `${(error as Error).message}\n${result.stderr}`,
    };
  }
  return {
    fired: firings.length > 0,
    firings,
    exitCode: firings.length > 0 ? 1 : 0,
    output: formatFirings(identifier, firings),
  };
}
