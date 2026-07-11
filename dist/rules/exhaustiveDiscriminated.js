/**
 * Tier A stub rule: discriminated-union narrowing must be exhaustive.
 *
 * WHY: a discriminated-union narrow that's not exhaustive silently does the
 * wrong thing when a new variant is added. typescript-eslint's
 * `switch-exhaustiveness-check` only covers `switch` statements; this rule's
 * eventual scope is `if (x.kind === '...')` ladders and ternary cascades.
 *
 * Pattern:
 *   type Event = { kind: 'open' } | { kind: 'close' } | { kind: 'pending' };
 *   if (e.kind === 'open') { ... } else if (e.kind === 'close') { ... }
 *   // ^ missing the 'pending' branch — this rule catches that.
 *
 * IMPLEMENTATION STATUS — SCAFFOLDED STUB:
 *   Requires type-aware lint (a TypeScript type checker via
 *   `parserServices.getTypeChecker`) to read the discriminated union's
 *   variants. ts-qa-ci does not wire type-aware lint, so this rule reports
 *   nothing today and is ported faithfully as a stub — same id, meta, and
 *   shape as the source, with a `create()` that registers no reports.
 *
 *   Today: `switch-exhaustiveness-check` (typescript-eslint, inherited) covers
 *   the switch case. Ternary / if-ladder forms are reviewer-enforced until this
 *   rule's body is written against a type-aware-lint pipeline.
 */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Discriminated-union narrowing must be exhaustive (STUB — see file comment).",
    },
    schema: [],
    messages: {
      missingBranches:
        "Discriminated union narrowing is missing branch(es): {{missing}}.",
    },
  },
  create() {
    return {};
  },
};
export default rule;
//# sourceMappingURL=exhaustiveDiscriminated.js.map
