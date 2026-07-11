import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
/**
 * `--llm` output mode. Where `--json` dumps the whole PipelineResult to stdout
 * (flooding an agent's context, and truncated the moment it's piped to head),
 * `--llm` prints a small deterministic summary to stdout and persists the FULL
 * structured result to a cache file, with `jq` hints for querying the detail on
 * disk. Ported from the consumer-repo `llm:*` wrappers (see the migration
 * assessment); this is the strictly-better shape for agent-driven QA.
 *
 * The cache lives under the consumer's own `node_modules/.cache/ts-qa/`, the
 * same tree `generateEslintConfigFile` already writes to, under a stable
 * `llm/last-run.json` name — never a Date.now()/random name, so the path is
 * predictable and a query hint can name it verbatim.
 */
const LLM_CACHE_FILENAME = "last-run.json";
/** Absolute path of the full-result cache file for a given consumer cwd. */
export function llmCachePath(cwd) {
  return join(
    cwd,
    "node_modules",
    ".cache",
    "ts-qa",
    "llm",
    LLM_CACHE_FILENAME,
  );
}
/** Persists the FULL PipelineResult to the stable cache file; returns its path. */
export function writeLlmCache(result, cwd) {
  const filePath = llmCachePath(cwd);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return filePath;
}
function collectFailingTools(phases) {
  const failing = [];
  for (const phase of phases) {
    for (const [tool, res] of Object.entries(phase.toolResults)) {
      if (res.exitClass !== "clean") {
        failing.push({ phase: phase.phase, tool, exitClass: res.exitClass });
      }
    }
  }
  return failing;
}
/**
 * Renders a compact, deterministic (no timestamps, no randomness) summary of a
 * PipelineResult: a one-line verdict, a per-phase PASS/FAIL table with each
 * tool's exitClass, the failing tool(s), the cache file path, and jq examples
 * for pulling detail out of the cache.
 */
export function formatLlmSummary(result, cachePath) {
  const lines = [];
  const failing = collectFailingTools(result.phases);
  lines.push("ts-qa --llm summary");
  lines.push("===================");
  if (result.success) {
    lines.push("Verdict: PASS — all phases clean");
  } else {
    const firstFail = result.phases.find((p) => p.failed);
    const where = firstFail !== undefined ? ` at phase ${firstFail.phase}` : "";
    lines.push(`Verdict: FAIL${where}`);
  }
  if (result.hasBeenRestarted) {
    lines.push(
      "Note: a tool was retried — re-run the full pipeline to re-validate earlier phases.",
    );
  }
  lines.push("");
  lines.push("Phase  Result  Tools");
  for (const phase of result.phases) {
    const res = phase.failed ? "FAIL" : "PASS";
    const tools = Object.entries(phase.toolResults)
      .map(([name, r]) => `${name}:${r.exitClass}`)
      .join(" ");
    lines.push(`${String(phase.phase).padEnd(5)}  ${res.padEnd(6)}  ${tools}`);
  }
  lines.push("");
  if (failing.length > 0) {
    lines.push("Failing tools:");
    for (const f of failing) {
      lines.push(`  ${f.tool} (${f.exitClass}) — phase ${f.phase}`);
    }
    lines.push("");
  }
  lines.push(`Full result: ${cachePath}`);
  lines.push("Query the full result with jq:");
  lines.push(`  jq '.success' ${cachePath}`);
  lines.push(
    `  jq -r '.phases[].toolResults | to_entries[] | select(.value.exitClass != "clean") | .key' ${cachePath}`,
  );
  lines.push(
    `  jq -r '.phases[].toolResults | to_entries[] | select(.value.exitClass != "clean") | .value.stderr' ${cachePath}`,
  );
  return lines.join("\n");
}
/**
 * `--llm` entry point (called from bin/ts-qa.js after the pipeline completes):
 * writes the full result to the cache file, then prints the compact summary to
 * stdout. Returns the cache path (handy for tests and callers).
 */
export function emitLlmOutput(result, cwd) {
  const cachePath = writeLlmCache(result, cwd);
  console.log(formatLlmSummary(result, cachePath));
  return cachePath;
}
//# sourceMappingURL=llmOutput.js.map
