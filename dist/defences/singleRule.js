import { execTool } from "../tools/execTool.js";
import { generateEslintConfigFile } from "../tools/generateEslintConfigFile.js";
function isFileReport(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = value;
  return (
    typeof record["filePath"] === "string" && Array.isArray(record["messages"])
  );
}
/** Every location the identifier fired in ESLint `--format json` output. */
export function firingsOf(json, identifier) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `ts-qa: expected ESLint --format json output: ${error.message}`,
      { cause: error },
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "ts-qa: expected ESLint --format json output (an array of file reports)",
    );
  }
  const firings = [];
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
export function formatFirings(identifier, firings) {
  if (firings.length === 0) return `${identifier} did not fire\n`;
  const lines = firings.map(
    (f) => `${f.file}:${f.line}:${f.column} ${f.message}`,
  );
  return `${identifier} FIRED (${firings.length})\n${lines.join("\n")}\n`;
}
/**
 * Runs ESLint over `path` exactly as the eslintReport tool does (same generated
 * config, same rule set) and reports for `identifier` alone.
 */
export async function runSingleRule(identifier, path, ctx) {
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
  let firings;
  try {
    firings = firingsOf(result.stdout, identifier);
  } catch (error) {
    return {
      fired: false,
      firings: [],
      exitCode: 2,
      output: `${error.message}\n${result.stderr}`,
    };
  }
  return {
    fired: firings.length > 0,
    firings,
    exitCode: firings.length > 0 ? 1 : 0,
    output: formatFirings(identifier, firings),
  };
}
//# sourceMappingURL=singleRule.js.map
