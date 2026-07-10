import type { Rule } from 'eslint';

/**
 * Tier A core rule: bans eslint-disable (and its variants), @ts-ignore, and
 * @ts-expect-error suppression comments repo-wide. The ONLY sanctioned way to override a
 * Tier A rule is a justified tsQaConfig/tier-a-exemptions.json entry
 * (resolveEslintConfig.ts) — never an inline suppression comment. This is
 * why the CDD escape hatch is a glob-exclusion file, not a comment: a
 * governance policy whose own escape hatch is a suppression comment cannot
 * coexist with a rule that bans suppression comments (see Plan 011's
 * pass-2 Fable audit finding S4).
 */
const SUPPRESSION_PATTERN = /^(eslint-disable|eslint-enable|ts-ignore|ts-expect-error)/;

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow eslint-disable* and @ts-ignore/@ts-expect-error suppression comments',
    },
    schema: [],
    messages: {
      noSuppression:
        'Suppression comments are banned. Fix the underlying issue, or add a justified entry to tsQaConfig/tier-a-exemptions.json.',
    },
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        for (const comment of sourceCode.getAllComments()) {
          const text = comment.value.trim();
          if (SUPPRESSION_PATTERN.test(text)) {
            context.report({ loc: comment.loc!, messageId: 'noSuppression' });
          }
        }
      },
    };
  },
};

export default rule;
