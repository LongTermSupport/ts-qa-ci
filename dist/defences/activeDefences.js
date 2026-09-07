import { join } from "node:path";
import { builtinRules } from "eslint/use-at-your-own-risk";
import {
  loadExemptions,
  resolveEslintConfig,
} from "../orchestrator/resolveEslintConfig.js";
function severityOf(value) {
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
function ruleModuleFor(identifier, plugins) {
  const slash = identifier.lastIndexOf("/");
  if (slash === -1) return builtinRules.get(identifier);
  const pluginName = identifier.slice(0, slash);
  const ruleName = identifier.slice(slash + 1);
  return plugins.get(pluginName)?.rules?.[ruleName];
}
function docRouteFor(identifier, rule, packageRoot) {
  if (identifier.startsWith("ts-qa/")) {
    return `${join(packageRoot, "docs", "cdd-rules.md")}#${identifier.slice("ts-qa/".length)}`;
  }
  return rule?.meta?.docs?.url ?? "(no documentation route declared)";
}
export async function listActiveDefences(projectRoot, platform, packageRoot) {
  const entries = await resolveEslintConfig(
    projectRoot,
    platform,
    packageRoot,
    true,
  );
  // Per rule: the last unscoped entry wins everywhere; a `files`-scoped entry
  // only speaks for its globs. A scoped "off" over a rule that is on
  // elsewhere is an exemption, not a removal, and the project record lists
  // those; the rule stays in the listing with its widest active scope.
  const plugins = new Map();
  const global = new Map();
  const scoped = new Map();
  for (const entry of entries) {
    const entryPlugins = entry["plugins"];
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
  const resolved = new Map();
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
  const defences = [];
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
export function formatDefenceListing(listing) {
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
//# sourceMappingURL=activeDefences.js.map
