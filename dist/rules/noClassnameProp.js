function pathIncludesAny(filename, globs) {
    return globs.some((glob) => filename.includes(glob.replace(/\*+$/, '')));
}
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: '`className` may not be passed to a custom component. Express presentation via variant/size/tone/density props on the component itself.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    scopeGlobs: { type: 'array', items: { type: 'string' } },
                    uiDirs: { type: 'array', items: { type: 'string' } },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            classNameOnComponent: "`className` may not be passed to `<{{component}}>`. Use the component's variant props (variant/size/tone/density/align/gap/wrap/justify). If the desired visual isn't expressible as a variant, extend the component rather than overriding at the call site.",
        },
    },
    create(context) {
        const options = (context.options[0] ?? {});
        const scopeGlobs = options.scopeGlobs ?? ['src/'];
        const uiDirs = options.uiDirs ?? ['src/ui/'];
        if (!pathIncludesAny(context.filename, scopeGlobs))
            return {};
        const insideUi = pathIncludesAny(context.filename, uiDirs);
        return {
            JSXAttribute(node) {
                if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'className')
                    return;
                const opening = node.parent;
                if (!opening || opening.type !== 'JSXOpeningElement')
                    return;
                const name = opening.name;
                // `<Foo.Bar />` — always a component, never raw HTML.
                if (name.type === 'JSXMemberExpression') {
                    if (insideUi)
                        return; // third-party compound passthrough carve-out
                    const src = context.sourceCode.getText(name);
                    context.report({ node: node, messageId: 'classNameOnComponent', data: { component: src } });
                    return;
                }
                if (name.type !== 'JSXIdentifier')
                    return;
                const tag = name.name;
                if (tag.length === 0)
                    return;
                // Lowercase first char → raw HTML/SVG; native className is allowed.
                if (/^[a-z]/.test(tag))
                    return;
                context.report({ node: node, messageId: 'classNameOnComponent', data: { component: tag } });
            },
        };
    },
};
export default rule;
//# sourceMappingURL=noClassnameProp.js.map