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
        return {
            'TSInterfaceDeclaration, TSTypeAliasDeclaration'(node) {
                if (!/Props$/.test(node.id.name))
                    return;
                if (node.parent.type === 'ExportNamedDeclaration')
                    return;
                context.report({ node, messageId: 'mustExport', data: { name: node.id.name } });
            },
        };
    },
};
export default rule;
//# sourceMappingURL=requireExportedComponentTypes.js.map