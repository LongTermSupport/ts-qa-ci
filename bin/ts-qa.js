#!/usr/bin/env node

/**
 * ts-qa CLI entry point (phase2-design.md §2.1). Parses args, then delegates
 * to the compiled orchestrator in dist/. Kept deliberately thin - all real
 * logic lives in src/orchestrator/, compiled to dist/orchestrator/.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    packageRoot,
    aggregate: false,
    json: false,
  };
  let command;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case 'deploy-skills':
      case 'init':
        command = arg;
        break;
      case '-t':
        options.tool = argv[++i];
        break;
      case '-p':
        options.path = argv[++i];
        break;
      case '--skip':
        (options.skipTools ??= []).push(argv[++i]);
        break;
      case '--phase': {
        const phase = Number(argv[++i]);
        if (![0, 1, 2, 3, 4].includes(phase)) {
          throw new Error(`ts-qa: --phase must be 0, 1, 2, 3, or 4 (got "${argv[i]}")`);
        }
        options.onlyPhase = phase;
        break;
      }
      case '--write':
        options.forceWrite = true;
        break;
      case '--read-only':
        options.forceReadOnly = true;
        break;
      case '--aggregate':
        options.aggregate = true;
        break;
      case '--json':
        options.json = true;
        break;
      default:
        throw new Error(`ts-qa: unrecognized argument "${arg}"`);
    }
  }

  if (options.forceWrite && options.forceReadOnly) {
    throw new Error('ts-qa: --write and --read-only are mutually exclusive');
  }
  if (options.aggregate && options.forceWrite) {
    throw new Error('ts-qa: --aggregate is only valid for read-only runs (it conflicts with --write)');
  }
  if (options.tool && options.onlyPhase !== undefined) {
    throw new Error('ts-qa: -t (single-tool bypass) and --phase are mutually exclusive — -t skips phase grouping entirely');
  }

  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === 'deploy-skills') {
    const { deploySkills } = await import('../dist/deploy/deploySkills.js');
    await deploySkills(options);
    return;
  }

  if (command === 'init') {
    const { init } = await import('../dist/deploy/init.js');
    await init(options);
    return;
  }

  const { runPipeline } = await import('../dist/orchestrator/runPipeline.js');
  const result = await runPipeline(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
