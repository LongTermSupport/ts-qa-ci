import { join } from "node:path";

import type { Rule } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";

import {
  type FlatConfigEntry,
  type TierAExemption,
  loadExemptions,
  resolveEslintConfig,
} from "../orchestrator/resolveEslintConfig.js";
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

type Severity = "off" | "warn" | "error";

function severityOf(value: unknown): Severity | undefined {
  const head = Array.isArray(value) ? value[0] : value;
  switch (head) {
    case 0:
    case "off":
      return "off";
    case 1:
    case "warn":
      return "warn";
    case 2:
    case "error":
      return "error";
    default:
      return undefined;
  }
}

interface PluginLike {
  rules?: Record<string, Rule.RuleModule>;
}

function ruleModuleFor(
  identifier: string,
  plugins: Map<string, PluginLike>,
): Rule.RuleModule | undefined {
  const slash = identifier.lastIndexOf("/");
  if (slash === -1) return builtinRules.get(identifier);
  const pluginName = identifier.slice(0, slash);
  const ruleName = identifier.slice(slash + 1);
  return plugins.get(pluginName)?.rules?.[ruleName];
}

function docRouteFor(
  identifier: string,
  rule: Rule.RuleModule | undefined,
  packageRoot: string,
): string {
  if (identifier.startsWith("ts-qa/")) {
    return `${join(packageRoot, "docs", "cdd-rules.md")}#${identifier.slice("ts-qa/".length)}`;
  }
  return rule?.meta?.docs?.url ?? "(no documentation route declared)";
}

export async function listActiveDefences(
  projectRoot: string,
  platform: Platform,
  packageRoot: string,
): Promise<DefenceListing> {
  const entries: FlatConfigEntry[] = await resolveEslintConfig(
    projectRoot,
    platform,
    packageRoot,
    true,
  );

  // Per rule: the last unscoped entry wins everywhere; a `files`-scoped entry
  // only speaks for its globs. A scoped "off" over a rule that is on
  // elsewhere is an exemption, not a removal, and the project record lists
  // those; the rule stays in the listing with its widest active scope.
  const plugins = new Map<string, PluginLike>();
  const global = new Map<string, Severity>();
  const scoped = new Map<string, { severity: Severity; scope: string[] }>();
  for (const entry of entries) {
    const entryPlugins = entry["plugins"] as
      Record<string, PluginLike> | undefined;
    for (const [name, plugin] of Object.entries(entryPlugins ?? {})) {
      plugins.set(name, plugin);
    }
    for (const [identifier, value] of Object.entries(entry.rules ?? {})) {
      const severity = severityOf(value);
      if (severity === undefined) continue;
      if (entry.files === undefined || entry.files.length === 0) {
        global.set(identifier, severity);
      } else if (severity !== "off") {
        scoped.set(identifier, { severity, scope: entry.files });
      }
    }
  }

  const resolved = new Map<string, { severity: Severity; scope: string[] }>();
  for (const [identifier, { severity, scope }] of scoped) {
    resolved.set(identifier, { severity, scope });
  }
  for (const [identifier, severity] of global) {
    if (severity === "off") {
      resolved.delete(identifier);
    } else {
      resolved.set(identifier, { severity, scope: [] });
    }
  }

  const defences: ActiveDefence[] = [];
  for (const [identifier, { severity, scope }] of resolved) {
    if (severity === "off") continue;
    const rule = ruleModuleFor(identifier, plugins);
    defences.push({
      identifier,
      severity,
      scope,
      description: rule?.meta?.docs?.description ?? "",
      docRoute: docRouteFor(identifier, rule, packageRoot),
    });
  }
  defences.sort((a, b) => a.identifier.localeCompare(b.identifier));

  return { defences, exemptions: loadExemptions(projectRoot) };
}

export function formatDefenceListing(listing: DefenceListing): string {
  const width = Math.max(
    ...listing.defences.map((d) => d.identifier.length),
    10,
  );
  const lines = listing.defences.map((d) => {
    const scope = d.scope.length > 0 ? ` [${d.scope.join(",")}]` : "";
    const summary = d.description === "" ? "(no description)" : d.description;
    return `${d.identifier.padEnd(width)}  ${d.severity.padEnd(5)}  ${summary}${scope}\n${"".padEnd(width)}         -> ${d.docRoute}`;
  });
  const record =
    listing.exemptions.length === 0
      ? ["(none)"]
      : listing.exemptions.map(
          (e) => `${e.ruleId} on ${e.files.join(",")}\n    ${e.justification}`,
        );
  return [
    `Active defences (${listing.defences.length}), derived from the resolved ESLint configuration:`,
    "",
    ...lines,
    "",
    `Project record (tsQaConfig/tier-a-exemptions.json, ${listing.exemptions.length}):`,
    "",
    ...record,
    "",
  ].join("\n");
}
