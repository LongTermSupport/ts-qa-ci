/**
 * Tier A core rule: requires *Props types declared under src/components/
 * to be exported. Generic component-library hygiene — a consumer importing
 * a component should be able to import its prop type too, not redeclare it.
 * Only the default path (src/components/) is configurable via ruleOptions.
 */
const rule = {
    meta: {
        type: 'suggestion',
        docs: { description: 'Require *Props types under src/components/ to be exported' },
        schema: [
            {
                type: 'object',
                properties: { componentsPath: { type: 'string' } },
                additionalProperties: false,
            },
        ],
        messages: {
            mustExport: '"{{name}}" is a component Props type but is not exported.',
        },
    },
    create(context) {
        const options = (context.options[0] ?? {});
        const componentsPath = options.componentsPath ?? 'src/components/';
        if (!context.filename.includes(componentsPath))
            return {};
        // Names re-exported via a program-level `export { FooProps }` specifier.
        // Collected across the whole file so a separate export statement (which may
        // appear after the declaration) still counts as exporting the type.
        const separatelyExported = new Set();
        const candidates = [];
        return {
            ExportNamedDeclaration(node) {
                if (node.declaration)
                    return; // inline `export interface FooProps` — handled below
                for (const spec of node.specifiers) {
                    if (spec.local.type === 'Identifier')
                        separatelyExported.add(spec.local.name);
                }
            },
            'TSInterfaceDeclaration, TSTypeAliasDeclaration'(node) {
                if (!node.id.name.endsWith('Props'))
                    return;
                if (node.parent.type === 'ExportNamedDeclaration')
                    return;
                candidates.push(node);
            },
            'Program:exit'() {
                for (const node of candidates) {
                    if (separatelyExported.has(node.id.name))
                        continue;
                    context.report({ node, messageId: 'mustExport', data: { name: node.id.name } });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=requireExportedComponentTypes.js.map