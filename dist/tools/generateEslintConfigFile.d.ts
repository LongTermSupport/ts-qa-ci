import type { RunContext } from "../orchestrator/types.js";
/**
 * Writes a temp ESLint flat-config file that calls resolveEslintConfig() at
 * ESLint's own load time, via a top-level `await` (native ESM, resolved
 * before `export default` is read - no dependency on ESLint's own async-config
 * support). This is the ONLY thing that makes the Tier A merge-and-guard
 * mechanism (resolveEslintConfig.ts) actually apply to a real `eslint` run -
 * without it, `npx eslint` falls back to discovering the consumer's own
 * eslint.config.js natively, silently bypassing Tier A entirely (found while
 * dogfooding on lts-commerce-site, Plan 011 Task 4.2/4.3 - this was the
 * single most load-bearing gap in the whole pipeline).
 *
 * Written under the consumer's own node_modules/.cache so the generated
 * file's `import '@longtermsupport/ts-qa-ci'` resolves via ordinary node_modules
 * lookup, the same way any other file in the consumer project would.
 */
export declare function generateEslintConfigFile(ctx: RunContext): string;
//# sourceMappingURL=generateEslintConfigFile.d.ts.map
