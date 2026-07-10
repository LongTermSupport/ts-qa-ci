/**
 * Tier A rule: `{x && <Foo/>}` short-circuits to the falsy value of `x` when
 * `x` is falsy. For a string `''` or a number `0`, React renders that literal
 * as text in some versions and as nothing in others — a silently-different
 * output across React major versions. For primitives that could legitimately be
 * `0` (counts, prices), the widget renders `0` in the DOM where the author
 * intended nothing.
 *
 * Idiomatic correction:
 *   `{x != null && <Foo/>}`   — narrows out both undefined and null
 *   `{x !== null && <Foo/>}`  — narrows out null only
 *   `{x ? <Foo/> : null}`     — ternary; works for any truthy/falsy
 *
 * The rule allows boolean-shape LHS (`isOpen`, comparisons, `Boolean()` calls,
 * `!`-prefix). It flags identifier / property-access / call shapes where the LHS
 * could be a primitive.
 *
 * TYPE-AWARENESS CAVEAT: knowing whether an LHS is truly boolean needs the type
 * checker, but ts-qa-ci rules are non-type-aware by design. This port reproduces
 * the source's SYNTACTIC approximation verbatim — a naming-convention heuristic
 * (`is`/`has`/`should`/… prefixes) plus AST-shape checks (comparisons, `!`,
 * `typeof`, `Boolean()`, boolean literals). It cannot see actual types, so a
 * boolean stored in a non-conventionally-named variable is flagged, and a
 * non-boolean named `isFoo` is not. This mirrors the original rule exactly.
 */
const BOOLEAN_NAME = /^(is|has|should|can|did|was|will|are)[A-Z]/;
const isBooleanShape = (node) => {
    if (node === undefined || node === null)
        return false;
    if (node.type === 'ChainExpression') {
        // ESTree wraps the root of an optional chain (`foo?.bar`) in a
        // ChainExpression; unwrap to the inner expression so the member-name
        // heuristic still applies to `user?.isActive`.
        return isBooleanShape(node.expression);
    }
    if (node.type === 'BinaryExpression')
        return true; // ===, !==, >, <, in, instanceof
    if (node.type === 'LogicalExpression')
        return isBooleanShape(node.right);
    if (node.type === 'UnaryExpression' && (node.operator === '!' || node.operator === 'typeof'))
        return true;
    if (node.type === 'Literal' && typeof node.value === 'boolean')
        return true;
    if (node.type === 'CallExpression') {
        // Boolean(x) / Array.isArray(x) / String.includes(...) etc are bool-ish;
        // rather than maintain an allowlist, accept anything whose callee is the
        // identifier `Boolean`.
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'Boolean')
            return true;
        return false;
    }
    if (node.type === 'Identifier') {
        // Naming-convention heuristic: identifiers matching common boolean-prefix
        // patterns are treated as boolean. Conservative — type-aware lint would do
        // better.
        return BOOLEAN_NAME.test(node.name);
    }
    if (node.type === 'MemberExpression') {
        // Same heuristic on the property side: `foo.isOpen`, `e.hasAttach`,
        // `props.canEdit`. Computed access (`foo['bar']`) skipped — we can't
        // introspect the key safely.
        const member = node;
        if (member.computed)
            return false;
        if (member.property.type !== 'Identifier')
            return false;
        return BOOLEAN_NAME.test(member.property.name);
    }
    return false;
};
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'JSX `{x && <Foo/>}` short-circuits with primitive falsy values rendering as DOM text; use `x != null && ...` or a ternary.',
        },
        schema: [],
        messages: {
            truthy: "JSX `&&` short-circuit on a non-boolean LHS — primitive falsy values (`0`, `''`) leak to the DOM. Use `<expr> != null && <Foo/>` or `<expr> ? <Foo/> : null`.",
        },
    },
    create(context) {
        const filename = context.filename;
        if (filename.includes('/src/api-client/generated/'))
            return {};
        if (/\.test\.[cm]?[jt]sx?$/.test(filename))
            return {};
        return {
            'JSXExpressionContainer > LogicalExpression'(node) {
                if (node.operator !== '&&')
                    return;
                if (isBooleanShape(node.left))
                    return;
                context.report({ node: node, messageId: 'truthy' });
            },
        };
    },
};
export default rule;
//# sourceMappingURL=jsxTruthyNarrow.js.map