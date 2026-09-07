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
/** Every location the identifier fired in ESLint `--format json` output. */
export declare function firingsOf(json: string, identifier: string): Firing[];
export declare function formatFirings(
  identifier: string,
  firings: Firing[],
): string;
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
export declare function runSingleRule(
  identifier: string,
  path: string,
  ctx: RunContext,
): Promise<SingleRuleResult>;
//# sourceMappingURL=singleRule.d.ts.map
