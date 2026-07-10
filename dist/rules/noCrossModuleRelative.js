/**
 * WHY: relative imports across the top-level src/ modules (e.g.
 * `import x from '../../api-client/foo'` from `src/widgets/zoho-tickets/...`)
 * make module boundaries invisible. Refactoring becomes painful — moving
 * a widget directory rewrites all `../../`s, and the import graph is hard
 * to reason about visually.
 *
 * Use the path aliases configured in `tsconfig.json` / `vite.config.ts` /
 * eslint import-x resolver:
 *   ~/core/*       ~/api-client/*   ~/ui/*   ~/auth/*   ~/domain/*
 *
 * Same-module relatives are fine (`./props`, `./Widget`).
 *
 * Ported from admin-ts's eslint-plugin-dbf/rules/no-cross-module-relative.js.
 * The source hardcoded the `~/` alias and the top-level module list; here both
 * are exposed as schema options (`alias`, `modules`) that default to the
 * source's exact behaviour, and `srcMarker` gates which files are policed
 * (default `/src/` — tools/ and config files can import however they like).
 *
 * This is a purely syntactic rule: it inspects `ImportDeclaration` source
 * string literals and `context.filename`, so it needs no type information.
 */
const DEFAULT_TOP_LEVEL_MODULES = ['core', 'api-client', 'ui', 'auth', 'domain', 'widgets'];
const DEFAULT_ALIAS = '~';
const DEFAULT_SRC_MARKER = '/src/';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow ../../ imports that cross top-level src/ module boundaries; use the ~/ path alias instead.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    modules: { type: 'array', items: { type: 'string' } },
                    alias: { type: 'string' },
                    srcMarker: { type: 'string' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            cross: 'Cross-module relative import "{{path}}". Use the `{{alias}}/{{module}}/*` path alias instead — boundary discipline.',
        },
    },
    create(context) {
        const options = (context.options[0] ?? {});
        const modules = options.modules ?? DEFAULT_TOP_LEVEL_MODULES;
        const alias = options.alias ?? DEFAULT_ALIAS;
        const srcMarker = options.srcMarker ?? DEFAULT_SRC_MARKER;
        const filename = context.filename;
        // We only police files inside src/. Tools/ and config files can do
        // whatever.
        if (!filename.includes(srcMarker)) {
            return {};
        }
        return {
            ImportDeclaration(node) {
                const importPath = node.source.value;
                if (typeof importPath !== 'string' || !importPath.startsWith('../')) {
                    return;
                }
                // Walk the ../ segments and see if we end up at a top-level module
                // that is not the importer's own module.
                const segments = importPath.split('/');
                // Find the first non-".." segment that names a known top-level module.
                const firstNonParent = segments.find((s) => s !== '..');
                if (firstNonParent !== undefined && modules.includes(firstNonParent)) {
                    context.report({
                        node: node.source,
                        messageId: 'cross',
                        data: { path: importPath, module: firstNonParent, alias },
                    });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=noCrossModuleRelative.js.map