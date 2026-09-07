#!/usr/bin/env node

/**
 * ts-qa CLI entry point (phase2-design.md §2.1). Parses args, then delegates
 * to the compiled orchestrator in dist/. Kept deliberately thin - all real
 * logic lives in src/orchestrator/, compiled to dist/orchestrator/.
 */
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Reads the operand that must follow a value-taking flag (e.g. `-t <tool>`).
 * BUG C: `-t`/`-p` used to swallow whatever came next, so `ts-qa -t` set the
 * value to `undefined` and silently fell back to the whole pipeline. Fail loudly
 * when the operand is missing or is itself another flag.
 */
function requireOperand(argv, index, flag) {
  const value = argv[index];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(
      `ts-qa: ${flag} requires a value (got ${value === undefined ? "nothing" : `"${value}"`})`,
    );
  }
  return value;
}

export function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    packageRoot,
    aggregate: false,
    json: false,
    // llm is intentionally tri-state: undefined = neither flag (resolve from
    // env/config/auto-detect later), true = --llm, false = --no-llm.
  };
  let command;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "deploy-skills":
      case "init":
      case "rules":
        command = arg;
        break;
      case "rule-doc":
        command = arg;
        options.identifier = requireOperand(argv, ++i, "rule-doc");
        break;
      case "rule":
        command = arg;
        options.identifier = requireOperand(argv, ++i, "rule");
        options.rulePath = requireOperand(argv, ++i, "rule <identifier>");
        break;
      case "-t":
        options.tool = requireOperand(argv, ++i, "-t");
        break;
      case "-p":
        options.path = requireOperand(argv, ++i, "-p");
        break;
      case "--skip":
        (options.skipTools ??= []).push(argv[++i]);
        break;
      case "--phase": {
        const phase = Number(argv[++i]);
        if (![0, 1, 2, 3, 4].includes(phase)) {
          throw new Error(
            `ts-qa: --phase must be 0, 1, 2, 3, or 4 (got "${argv[i]}")`,
          );
        }
        options.onlyPhase = phase;
        break;
      }
      case "--write":
        options.forceWrite = true;
        break;
      case "--read-only":
        options.forceReadOnly = true;
        break;
      case "--aggregate":
        options.aggregate = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--llm":
        if (options.llm === false) {
          throw new Error("ts-qa: --llm and --no-llm are mutually exclusive");
        }
        options.llm = true;
        break;
      case "--no-llm":
        if (options.llm === true) {
          throw new Error("ts-qa: --llm and --no-llm are mutually exclusive");
        }
        options.llm = false;
        break;
      default:
        throw new Error(`ts-qa: unrecognized argument "${arg}"`);
    }
  }

  if (options.forceWrite && options.forceReadOnly) {
    throw new Error("ts-qa: --write and --read-only are mutually exclusive");
  }
  if (options.aggregate && options.forceWrite) {
    throw new Error(
      "ts-qa: --aggregate is only valid for read-only runs (it conflicts with --write)",
    );
  }
  // --json and --llm both own stdout but with opposite contracts: --json dumps
  // the whole PipelineResult, --llm prints a compact summary and writes the full
  // result to a cache file. Combining them is contradictory, so reject it.
  if (options.json && options.llm === true) {
    throw new Error(
      "ts-qa: --json and --llm are mutually exclusive — --json dumps the full result to stdout, " +
        "--llm prints a compact summary and writes the full result to node_modules/.cache/ts-qa/llm/",
    );
  }
  if (options.tool && options.onlyPhase !== undefined) {
    throw new Error(
      "ts-qa: -t (single-tool bypass) and --phase are mutually exclusive — -t skips phase grouping entirely",
    );
  }

  // BUG D: --aggregate is a read-only reporting mode by contract (--write is
  // rejected above), but off-CI in a normal terminal detectReadOnly returns
  // false, which would let mutating Phase 1 tools run while aggregating. Force
  // read-only whenever aggregating and not explicitly writing.
  if (options.aggregate && !options.forceWrite) {
    options.forceReadOnly = true;
  }

  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "deploy-skills") {
    const { deploySkills } = await import("../dist/deploy/deploySkills.js");
    await deploySkills(options);
    return;
  }

  if (command === "init") {
    const { init } = await import("../dist/deploy/init.js");
    await init(options);
    return;
  }

  // The three defence commands (docs/pipeline.md "Working with a single rule"):
  // `rules` lists the active defences and the project record, `rule-doc`
  // resolves a printed identifier to its documentation, `rule` is the
  // single-rule harness. None runs the pipeline.
  if (command === "rules") {
    const { detectPlatform } =
      await import("../dist/orchestrator/detectPlatform.js");
    const { listActiveDefences, formatDefenceListing } =
      await import("../dist/defences/activeDefences.js");
    const listing = await listActiveDefences(
      options.cwd,
      detectPlatform(options.cwd),
      packageRoot,
    );
    process.stdout.write(
      options.json
        ? `${JSON.stringify(listing, null, 2)}\n`
        : formatDefenceListing(listing),
    );
    return;
  }

  if (command === "rule-doc") {
    const { resolveRuleDoc, formatRuleDoc } =
      await import("../dist/defences/ruleDoc.js");
    const doc = resolveRuleDoc(options.identifier, packageRoot);
    process.stdout.write(
      options.json ? `${JSON.stringify(doc, null, 2)}\n` : formatRuleDoc(doc),
    );
    return;
  }

  if (command === "rule") {
    const { detectPlatform } =
      await import("../dist/orchestrator/detectPlatform.js");
    const { runSingleRule } = await import("../dist/defences/singleRule.js");
    const result = await runSingleRule(options.identifier, options.rulePath, {
      cwd: options.cwd,
      platform: detectPlatform(options.cwd),
      ci: true,
      readOnly: true,
      aggregate: false,
      hasBeenRestarted: false,
      json: true,
      llm: false,
      packageRoot,
    });
    process.stdout.write(
      options.json ? `${JSON.stringify(result, null, 2)}\n` : result.output,
    );
    process.exit(result.exitCode);
  }

  // Resolve the tri-state CLI flag into a definite on/off decision, applying the
  // env/config/auto-detect precedence ladder (docs/pipeline.md). Doing it here,
  // before runPipeline, means both the pipeline (passthrough suppression) and the
  // post-run emit below read the same resolved boolean.
  const { resolveLlm, resolveLlmOutputMode } =
    await import("../dist/orchestrator/resolveLlm.js");
  options.llm = resolveLlm({
    cli: options.llm,
    json: options.json,
    env: process.env,
    mode: resolveLlmOutputMode(options.cwd),
  });

  const { runPipeline } = await import("../dist/orchestrator/runPipeline.js");
  const result = await runPipeline(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.llm) {
    const { emitLlmOutput } = await import("../dist/orchestrator/llmOutput.js");
    emitLlmOutput(result, options.cwd);
  }

  process.exit(result.success ? 0 : 1);
}

// Only run the CLI when executed directly (`ts-qa ...`), not when imported by a
// test that exercises parseArgs — importing must have no side effects.
//
// Compare REAL paths, not URLs: a package manager installs this package behind a
// symlink (pnpm's virtual store `.pnpm/…`, npm/yarn workspace links), so the
// invoked argv[1] path (through the symlink) differs from import.meta.url (Node
// resolves the module URL to its realpath). A naive URL comparison is therefore
// false for every symlink-installed consumer — main() never runs and `ts-qa` /
// `ts-qa init` silently no-op. Resolving both sides with realpathSync collapses
// the symlink so the comparison holds. (Self-hosting missed this: the repo runs
// its own un-symlinked bin, where the URLs already matched.)
function isInvokedDirectly() {
  if (process.argv[1] === undefined) return false;
  try {
    return (
      realpathSync(fileURLToPath(import.meta.url)) ===
      realpathSync(process.argv[1])
    );
  } catch {
    return false;
  }
}
if (isInvokedDirectly()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  });
}
