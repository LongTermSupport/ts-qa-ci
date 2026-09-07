import { type TierAExemption } from "../orchestrator/resolveEslintConfig.js";
import type { Platform } from "../orchestrator/types.js";
/**
 * `ts-qa rules`: the defences active in a project, derived from the resolved
 * ESLint configuration on every call, never from a hand-maintained page, with
 * the project record (Tier A exemptions) listed alongside them.
 *
 * Severity is resolved the way ESLint resolves it: last matching entry wins,
 * per rule. An entry restricted by `files` is reported with that scope, since
 * a rule that is on for `src/**` and off for tests is a different fact from
 * one that is on everywhere. The listing covers the project's own plugin
 * rules with no extra work, because they arrive through the same config.
 */
export interface ActiveDefence {
  identifier: string;
  severity: "warn" | "error";
  /** `files` globs of the entry that set the severity; empty means everywhere. */
  scope: string[];
  description: string;
  docRoute: string;
}
export interface DefenceListing {
  defences: ActiveDefence[];
  exemptions: TierAExemption[];
}
export declare function listActiveDefences(
  projectRoot: string,
  platform: Platform,
  packageRoot: string,
): Promise<DefenceListing>;
export declare function formatDefenceListing(listing: DefenceListing): string;
//# sourceMappingURL=activeDefences.d.ts.map
