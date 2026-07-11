/**
 * Tier B rule: `someValue ?? []` (and the `||` form) silently swallows the
 * difference between "loading", "empty result", "transport error", and
 * "intentional null". Every caller downstream sees a normal empty array and
 * behaves as if the upstream completed successfully. The 2026-05-20 wedge
 * audit (admin-ts Plan 025 §3.1) found four live instances in
 * `widgets/zoho-tickets/Widget.tsx` and `Modal.tsx` where this shape masked
 * exactly that distinction.
 *
 * Policy (user directive 2026-05-20): no error hiding. Fail fast on error.
 *
 * Banned shapes (inside `src/widgets/**`, `src/core/**`,
 * `src/api-client/hooks/**`, excluding `src/api-client/generated/**` and test
 * files):
 *
 *   <expr> ?? []        <expr> || []
 *   <expr> ?? {}        <expr> || {}
 *   <expr> ?? 0         <expr> || 0
 *   <expr> ?? ''        <expr> || ''
 *   <expr> ?? null      <expr> || null
 *   <expr> ?? false     <expr> || false
 *   <expr> ?? undefined <expr> || undefined
 *
 * Allowlist:
 *
 *   - `(map.get(k) ?? 0)` followed by `.set(...)` — the standard Map upsert
 *     idiom is not an error-hider.
 *
 * PORT NOTE (admin-ts → ts-qa-ci): the source rule also honoured a
 * `// dbf-fallback-justification: <reason>` inline-comment escape hatch. That
 * hatch is deliberately DROPPED here to match ts-qa-ci authoring convention —
 * a governance policy whose escape hatch is an inline comment cannot coexist
 * with `no-eslint-disable`, which bans suppression comments (see
 * noEslintDisable.ts). The sanctioned override is a config-based `allow` option
 * (Plan 00004): a reviewable list of path substrings for files with a genuinely
 * legitimate empty-literal default (e.g. a nullable prop's `?? {}` initial state,
 * not a masked query error). It lives in the ESLint config, visible in diffs —
 * the same "config carve-out, not inline comment" model as no-dom-classname-mutation.
 *
 * Future rule extensions could narrow to TanStack-Query shapes specifically;
 * current breadth is intentional to make the policy unambiguous.
 */
const SCOPE_INCLUDES = [
    "/src/widgets/",
    "/src/core/",
    "/src/api-client/hooks/",
];
const SCOPE_EXCLUDES = ["/src/api-client/generated/"];
const TEST_FILE_PATTERN = /\.test\.[cm]?[jt]sx?$/;
function isEmptyLiteralFallback(node) {
    if (node.type === "ArrayExpression" && node.elements.length === 0)
        return true;
    if (node.type === "ObjectExpression" && node.properties.length === 0)
        return true;
    if (node.type === "Literal") {
        const v = node.value;
        if (v === null)
            return true;
        if (v === 0)
            return true;
        if (v === "")
            return true;
        if (v === false)
            return true;
    }
    if (node.type === "Identifier" && node.name === "undefined")
        return true;
    return false;
}
/**
 * True for the Map upsert idiom `(m.get(k) ?? 0)` whose result feeds — possibly
 * through a chain of Binary/Unary arithmetic — back into an `m.set(...)` call.
 * That shape is a counting/accumulation pattern, not an error-hider.
 */
function isMapUpsertIdiom(node) {
    const left = node.left;
    if (left.type !== "CallExpression" ||
        left.callee.type !== "MemberExpression" ||
        left.callee.property.type !== "Identifier" ||
        left.callee.property.name !== "get") {
        return false;
    }
    // Walk up through arithmetic to the enclosing call: BinaryExpression /
    // UnaryExpression → CallExpression{ .set(...) }.
    let p = node.parent;
    while (p !== null &&
        (p.type === "BinaryExpression" || p.type === "UnaryExpression")) {
        p = p.parent;
    }
    return (p !== null &&
        p.type === "CallExpression" &&
        p.callee.type === "MemberExpression" &&
        p.callee.property.type === "Identifier" &&
        p.callee.property.name === "set");
}
const rule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow `?? <empty literal>` and `|| <empty literal>` fallbacks that hide error/missing-data states.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    allow: { type: "array", items: { type: "string" } },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            hiding: "Error-hiding fallback `{{op}} {{value}}`. Branch on the query state explicitly (isSuccess/isPending/isError) or fail-fast.",
        },
    },
    create(context) {
        const filename = context.filename;
        const options = (context.options[0] ?? {});
        const allow = options.allow ?? [];
        // Config-based escape (reviewable in eslint config): files with a genuinely
        // legitimate empty-literal default are allow-listed by path substring.
        if (allow.some((entry) => filename.includes(entry)))
            return {};
        const inScope = SCOPE_INCLUDES.some((p) => filename.includes(p)) &&
            !SCOPE_EXCLUDES.some((p) => filename.includes(p));
        if (!inScope)
            return {};
        // Exclude test files within scope.
        if (TEST_FILE_PATTERN.test(filename))
            return {};
        const sourceCode = context.sourceCode;
        return {
            LogicalExpression(node) {
                if (node.operator !== "??" && node.operator !== "||")
                    return;
                if (!isEmptyLiteralFallback(node.right))
                    return;
                if (isMapUpsertIdiom(node))
                    return;
                const valueText = node.right.type === "ArrayExpression"
                    ? "[]"
                    : node.right.type === "ObjectExpression"
                        ? "{}"
                        : sourceCode.getText(node.right);
                context.report({
                    node: node,
                    messageId: "hiding",
                    data: { op: node.operator, value: valueText },
                });
            },
        };
    },
};
export default rule;
//# sourceMappingURL=noErrorHidingFallback.js.map