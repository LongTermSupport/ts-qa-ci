import type { Rule } from 'eslint';

/**
 * Tier B (opt-in CDD): variant-API enforcement — every styleable component
 * must expose typed variant props; internal class resolution is the only
 * place raw classes may appear.
 *
 * SCAFFOLD ONLY (Task 3.3 / pass-2 Fable audit finding S6). The
 * naming/typing/exhaustiveness conventions this rule is meant to enforce
 * don't exist until Task 4.6 builds the variant-prop catalogue against this
 * repo's real components — there is no precedent to adapt (the one CVA
 * pilot component known from research is a single instance, not a mature
 * convention). Do NOT flesh out this rule's real AST logic ahead of Task
 * 4.6 — it would be inventing the convention it's supposed to enforce.
 *
 * This file exists so the rule ID is registered and the config wiring
 * (Tier B, ships `recommended: false`) is in place; `create()` intentionally
 * reports nothing yet.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce the variant-prop API pattern (typed variant props, exhaustive internal class resolution) — NOT YET IMPLEMENTED, see Task 4.6',
    },
    schema: [],
    messages: {
      notYetImplemented:
        'variant-api-enforcement is a scaffold — real logic lands after Task 4.6 builds the variant-prop catalogue.',
    },
  },
  create() {
    return {};
  },
};

export default rule;
