import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Rule } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";

import { tsQaPlugin } from "../rules/index.js";

/**
 * `ts-qa rule-doc <identifier>`: resolves the identifier exactly as ESLint
 * prints it (`ts-qa/no-eslint-disable`, `no-unused-vars`) to documentation,
 * offline, from the installed package.
 *
 * Bundled rules resolve to their section of docs/cdd-rules.md, which ships in
 * the package at the same version as the rule. ESLint core rules resolve to
 * their own description and upstream URL. Anything else is an error, which is
 * the point: an identifier that cannot be resolved is a defence that blocks
 * without explaining, and ruleDoc.test.ts audits every bundled rule for it.
 */
export interface RuleDoc {
  identifier: string;
  description: string;
  url?: string;
  /** Absolute path of the shipped page holding `section`, for bundled rules. */
  docPath: string;
  /** The rule's own section of the shipped page, for bundled rules. */
  section?: string;
}

const PLUGIN_PREFIX = "ts-qa/";
const CDD_RULES_DOC = join("docs", "cdd-rules.md");

function describe(rule: Rule.RuleModule): {
  description: string;
  url?: string;
} {
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
function sectionFor(page: string, name: string): string | undefined {
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

export function resolveRuleDoc(
  identifier: string,
  packageRoot: string,
): RuleDoc {
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

export function formatRuleDoc(doc: RuleDoc): string {
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
