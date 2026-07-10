import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
/**
 * Tier A core rule: validates React.lazy(() => import('...')) paths
 * resolve to a real file. TypeScript does not validate dynamic import()
 * paths at all — a typo here is a silent runtime 404, not a build error.
 * Completely generic; only `@/` alias resolution needs to match the
 * consumer's real tsconfig paths (configurable via ruleOptions).
 */
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
function resolveImportPath(fromFile, importPath, aliasRoot) {
    let basePath;
    if (importPath.startsWith('@/') && aliasRoot) {
        basePath = join(aliasRoot, importPath.slice(2));
    }
    else if (importPath.startsWith('.')) {
        basePath = resolve(dirname(fromFile), importPath);
    }
    else {
        return undefined; // bare package specifier - not this rule's concern
    }
    if (existsSync(basePath))
        return basePath;
    for (const ext of EXTENSIONS) {
        if (existsSync(`${basePath}${ext}`))
            return `${basePath}${ext}`;
        if (existsSync(join(basePath, `index${ext}`)))
            return join(basePath, `index${ext}`);
    }
    return undefined;
}
const rule = {
    meta: {
        type: 'problem',
        docs: { description: "Validate React.lazy(() => import('...')) paths resolve to a real file" },
        schema: [
            {
                type: 'object',
                properties: { aliasRoot: { type: 'string' } },
                additionalProperties: false,
            },
        ],
        messages: {
            unresolvedImport: 'React.lazy() import path "{{path}}" does not resolve to any file.',
        },
    },
    create(context) {
        const options = (context.options[0] ?? {});
        const aliasRoot = options.aliasRoot ? resolve(context.cwd, options.aliasRoot) : undefined;
        return {
            CallExpression(node) {
                if (node.callee.type !== 'MemberExpression')
                    return;
                if (node.callee.object.type !== 'Identifier' || node.callee.object.name !== 'React')
                    return;
                if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'lazy')
                    return;
                const arg = node.arguments[0];
                if (!arg || (arg.type !== 'ArrowFunctionExpression' && arg.type !== 'FunctionExpression'))
                    return;
                // Dynamic import() is its own ESTree node type (ImportExpression), not a
                // CallExpression with callee.type 'Import' - that was an older/non-standard
                // representation some parsers used.
                const body = arg.body.type === 'ImportExpression' ? arg.body : undefined;
                if (!body)
                    return;
                const pathArg = body.source;
                if (pathArg.type !== 'Literal' || typeof pathArg.value !== 'string')
                    return;
                const resolved = resolveImportPath(context.filename, pathArg.value, aliasRoot);
                if (!resolved) {
                    context.report({ node: node, messageId: 'unresolvedImport', data: { path: pathArg.value } });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=validateLazyImports.js.map