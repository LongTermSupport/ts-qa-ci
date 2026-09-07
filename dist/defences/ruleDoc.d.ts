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
export declare function resolveRuleDoc(
  identifier: string,
  packageRoot: string,
): RuleDoc;
export declare function formatRuleDoc(doc: RuleDoc): string;
//# sourceMappingURL=ruleDoc.d.ts.map
