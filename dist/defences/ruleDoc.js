import { readFileSync } from "node:fs";
import { join } from "node:path";
import { builtinRules } from "eslint/use-at-your-own-risk";
import { tsQaPlugin } from "../rules/index.js";
const PLUGIN_PREFIX = "ts-qa/";
const CDD_RULES_DOC = join("docs", "cdd-rules.md");
function describe(rule) {
  const docs = rule.meta?.docs;
  return {
    description: docs?.description ?? "",
    ...(docs?.url !== undefined ? { url: docs.url } : {}),
  };
}
/**
 * The `### \`<name>\`` section of the shipped rules page: from its heading up
 * to the next heading of the same or higher level.
 */
function sectionFor(page, name) {
  const heading = `### \`${name}\``;
  const lines = page.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) return undefined;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("### ") || line.startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trimEnd();
}
export function resolveRuleDoc(identifier, packageRoot) {
  const docPath = join(packageRoot, CDD_RULES_DOC);
  if (identifier.startsWith(PLUGIN_PREFIX)) {
    const name = identifier.slice(PLUGIN_PREFIX.length);
    const rule = tsQaPlugin.rules[name];
    if (rule === undefined) {
      throw new Error(
        `ts-qa: unknown rule identifier "${identifier}". Bundled identifiers are ts-qa/<name> for each rule in ${docPath}`,
      );
    }
    const section = sectionFor(readFileSync(docPath, "utf-8"), name);
    if (section === undefined) {
      throw new Error(
        `ts-qa: "${identifier}" is a bundled rule with no section in ${docPath}; a rule must not block without explaining`,
      );
    }
    return { identifier, ...describe(rule), docPath, section };
  }
  const core = builtinRules.get(identifier);
  if (core !== undefined) {
    return { identifier, ...describe(core), docPath };
  }
  throw new Error(
    `ts-qa: unknown rule identifier "${identifier}": neither a bundled ts-qa/ rule nor an ESLint core rule. A project's own plugin documents its rules itself.`,
  );
}
export function formatRuleDoc(doc) {
  const head = [
    doc.identifier,
    "",
    `Summary: ${doc.description}`,
    ...(doc.url !== undefined ? [`URL:     ${doc.url}`] : []),
  ];
  if (doc.section === undefined) {
    return `${head.join("\n")}\n`;
  }
  return `${head.join("\n")}\nPage:    ${doc.docPath}\n\n${doc.section}\n`;
}
//# sourceMappingURL=ruleDoc.js.map
