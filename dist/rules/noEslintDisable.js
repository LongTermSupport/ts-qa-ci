/**
 * Tier A core rule: bans eslint-disable (and its variants), @ts-ignore, and
 * @ts-expect-error suppression comments repo-wide. The ONLY sanctioned way to override a
 * Tier A rule is a justified tsQaConfig/tier-a-exemptions.json entry
 * (resolveEslintConfig.ts) — never an inline suppression comment. This is
 * why the CDD escape hatch is a glob-exclusion file, not a comment: a
 * governance policy whose own escape hatch is a suppression comment cannot
 * coexist with a rule that bans suppression comments (see Plan 011's
 * pass-2 Fable audit finding S4).
 *
 * The pattern is the UNION of two prior implementations reconciled during the
 * admin-ts adoption (Plan 00004): ts-qa-ci originally matched `eslint-enable`
 * but missed `@ts-nocheck`; admin-ts's dbf/no-lint-suppression matched
 * `@ts-nocheck` but missed `eslint-enable`. This covers both so no coverage is
 * dropped when admin-ts retires its local rule. The TypeScript directives
 * require the leading `@` (as the compiler reads them, and as they appear in a
 * comment's raw value); the earlier bare `ts-ignore` alternative could never
 * match a real directive. `@ts-check` is deliberately NOT banned — it opts INTO
 * type-checking rather than suppressing it; the ban-ts-comment strict-baseline
 * config governs that directive instead.
 *
 * oxlint's directive forms (`oxlint-disable*`, `oxlint-enable`) mirror ESLint's
 * and are banned on the same reasoning: oxlint is the phase 0 pre-filter, and a
 * comment that removes its findings is a suppression route the project record
 * never sees.
 */
const SUPPRESSION_PATTERN =
  /^((eslint|oxlint)-disable(-next-line|-line)?|(eslint|oxlint)-enable|@ts-(ignore|expect-error|nocheck))\b/;
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow eslint-disable*, eslint-enable, oxlint-disable*, oxlint-enable, and @ts-ignore/@ts-expect-error/@ts-nocheck suppression comments",
    },
    schema: [],
    messages: {
      noSuppression:
        "Suppression comments are banned. Fix the underlying issue, or add a justified entry to tsQaConfig/tier-a-exemptions.json.",
    },
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        for (const comment of sourceCode.getAllComments()) {
          const text = comment.value.trim();
          if (SUPPRESSION_PATTERN.test(text)) {
            context.report({ loc: comment.loc, messageId: "noSuppression" });
          }
        }
      },
    };
  },
};
export default rule;
//# sourceMappingURL=noEslintDisable.js.map
