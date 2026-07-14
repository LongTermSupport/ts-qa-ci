/**
 * Tier A rule: bans template literals that build a `starts_at`-shaped
 * datetime string — `<...>T<...>:00<...>` — with a STATIC (or ABSENT) UTC
 * offset.
 *
 * WHY: an RFC 3339 date-time needs an explicit UTC offset to be unambiguous.
 * A common source of this bug is gluing a bare date and a bare time back
 * together with a template literal once an API/availability endpoint has
 * already split them into separate `HH:MM`-shaped fields. Two naive forms
 * both silently mis-time or reject the result:
 *
 *   - `` `${dateStr}T${timeStr}:00` ``            — no offset at all. A
 *     strict RFC 3339 API rejects this (HTTP 422); a client-side `new
 *     Date(...)` parse silently interprets it in the BROWSER's local
 *     timezone, mis-timing any cross-timezone viewer.
 *   - `` `${dateStr}T${timeStr}:00+00:00` `` / `` `${dateStr}T${timeStr}:00Z` ``
 *     — a HARDCODED UTC offset. Correct only when the subject timezone
 *     happens to be observing UTC at that instant; wrong by the DST offset
 *     otherwise (e.g. UK BST is `+01:00`, not `+00:00`).
 *
 * The only correct construction computes the REAL, DST-aware offset for the
 * relevant timezone at that wall-clock instant and appends it as a DYNAMIC
 * expression: `` `${dateStr}T${timeStr}:00${offset}` ``. That shape — a
 * `${expression}` immediately following the `:00` seconds marker — is NOT
 * flagged: the offset is computed, not hardcoded/absent. Only a STATIC or
 * MISSING offset (nothing, a literal `+00:00`, or a literal `Z`) is banned.
 *
 * NOT flagged (all genuinely safe):
 *   - Plain string literals (not template literals) — e.g. a deliberate test
 *     fixture `"2020-01-01T10:00:00+00:00"`. This rule only inspects
 *     `TemplateLiteral` nodes.
 *   - A call to a sanctioned offset-computing helper (e.g.
 *     `toPracticeLocalIso(...)`) — no template literal is involved at the
 *     call site.
 *   - `` `${dateStr}T${timeStr}:00${offset}` `` — the offset is a DYNAMIC
 *     expression (exactly what a correct offset-computing helper builds).
 *   - Unrelated template literals with no `:00` seconds marker at all (URLs,
 *     file paths, a bare `` `${dateStr}T${timeStr}` `` with no seconds).
 *
 * PORT NOTE (CounselBook → ts-qa-ci): ported from CounselBook's
 * `frontend/eslint-rules/no-naive-datetime-template.js`, written for Plan
 * 00107 BUG-A — a production defect where the public booking flow
 * (`GuestCheckoutPage.tsx`) and a test helper both built a naive/hardcoded
 * datetime template directly instead of using the project's own
 * offset-computing helper (`toPracticeLocalIso` in `@/lib/timezone`),
 * causing HTTP 422s and a BST/GMT mistiming class of bug. The match logic
 * (shape-via-joined-quasis, `T…:00` boundary, trailing-expression carve-out)
 * is preserved exactly; this port is a straight JS→TS conversion with no
 * behavioural change.
 *
 * CONSUMING-PROJECT CONCERN, not part of this rule: the CounselBook original
 * carved out its own canonical helper's definition file (`src/lib/timezone.ts`)
 * file-scoped in ESLint config, because that helper's internal UTC *probe*
 * (used only to ask `Intl` what offset a timezone observes at a given
 * instant — never sent to any API) legitimately builds a static-`Z` template
 * to compute FROM. This rule has no opinion on what your project's helper is
 * named or where it lives — if you have an equivalent probe, grandfather its
 * definition file the same way (a `tsQaConfig/tier-a-exemptions.json` entry,
 * or an `overrides` block scoped to that one file), not by weakening this
 * rule for everyone.
 */
/**
 * Placeholder substituted for each `${expression}` when building the shape.
 * A NUL-adjacent space can never appear as literal text spanning a datetime
 * boundary in realistic source, so collision with real quasi content is not
 * a practical concern here (matching the reference implementation).
 */
const EXPRESSION_PLACEHOLDER = " ";
/**
 * `T` (the RFC 3339 date/time separator), across zero or more interpolated
 * expressions, immediately followed by the literal `:00` seconds marker.
 * Matches both `` `${d}T${t}:00` `` and `` `${d}T${t}:00+00:00` `` shapes —
 * whether the offset is present is decided separately (see below).
 */
const DATETIME_SHAPE_PATTERN = new RegExp(
  `T${EXPRESSION_PLACEHOLDER}*:00`,
  "g",
);
/**
 * Builds the "shape" of a template literal: its quasis' text, joined in
 * source order by a placeholder marker standing in for each `${expression}`.
 * Quasi count is always `expressions.length + 1`, so `Array.join` inserts
 * exactly one placeholder per expression, in the correct position.
 */
function templateLiteralShape(node) {
  return node.quasis
    .map((quasi) => quasi.value.cooked ?? quasi.value.raw)
    .join(EXPRESSION_PLACEHOLDER);
}
/**
 * Returns true if `shape` contains a `T…:00` datetime boundary whose seconds
 * marker is followed by a STATIC or ABSENT offset — i.e. anything other than
 * an immediately-following interpolated expression. A trailing
 * `${expression}` right after `:00` is a computed, DST-aware offset and is
 * not a violation.
 */
function hasNaiveDatetimeShape(shape) {
  for (const match of shape.matchAll(DATETIME_SHAPE_PATTERN)) {
    const charAfterMatch = shape[match.index + match[0].length];
    if (charAfterMatch !== EXPRESSION_PLACEHOLDER) {
      return true;
    }
  }
  return false;
}
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow template literals that build a datetime as `<...>T<...>:00<...>` with a static or absent UTC offset — use a helper that computes the real, DST-aware offset dynamically.",
    },
    schema: [],
    messages: {
      naiveDatetimeTemplate:
        "This template literal builds a datetime as `T…:00` with a static " +
        "or absent UTC offset. A naive datetime with no offset is rejected " +
        "by a strict RFC 3339 API, or silently parsed in the reader's local " +
        "timezone; a hardcoded `+00:00`/`Z` offset is wrong whenever the " +
        "subject isn't observing UTC (the BST/DST class of bug). Compute " +
        "the real, DST-aware offset and append it as a dynamic expression: " +
        "`${dateStr}T${timeStr}:00${offset}`.",
    },
  },
  create(context) {
    return {
      TemplateLiteral(node) {
        const shape = templateLiteralShape(node);
        if (hasNaiveDatetimeShape(shape)) {
          context.report({ node, messageId: "naiveDatetimeTemplate" });
        }
      },
    };
  },
};
export default rule;
//# sourceMappingURL=noNaiveDatetimeTemplate.js.map
