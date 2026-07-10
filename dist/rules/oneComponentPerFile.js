/**
 * Tier B rule: one component per file, named after the file.
 *
 * WHY: the wedge doctrine (admin-ts CLAUDE/Plan/024) says: one component per
 * file, named after the file. The driving incident was `widgets/zoho-tickets/
 * Widget.tsx` accumulating three module-scope helper components (`Frame`,
 * `StatsBar`, `TicketRow`) — anonymous-feeling things that hid as
 * implementation details of one file when they should have been first-class
 * `~/ui/` primitives reusable across widgets.
 *
 * One file = one component makes the structure unambiguous:
 *   - Devtools shows `<Frame>` not `<div>`
 *   - Refactor renaming is mechanical (rename file → component renames)
 *   - The decision "is this a real component?" gets answered at file-creation
 *     time, not buried in another file's body
 *
 * Rule: in a `.tsx` file under `src/widgets/**` or `src/ui/**`, count
 * component-like exports (PascalCase identifier on a `const` or `function`
 * declaration, or a PascalCase re-export specifier). Require exactly one,
 * named after the file basename.
 *
 * Scope exclusions:
 *   - `index.{ts,tsx}` (re-export pivot files, never define a component)
 *   - `.test.{ts,tsx}` / `.spec.{ts,tsx}` (test files)
 *   - files whose basename starts with a lowercase letter (`cn.ts`,
 *     `props.ts` — utility / type-only)
 *   - `.ts` files (only `.tsx` is in scope; types and helpers live in `.ts`)
 *
 * Type-only exports (`export type Foo = …`, `export interface Foo {…}`) are
 * NOT counted as component exports.
 *
 * The scope (which directories are enforced) is configurable via the
 * `enforcePattern` option (a RegExp source string); the source default matches
 * `.tsx` files under `src/widgets/` or `src/ui/`.
 */
const DEFAULT_ENFORCE_PATTERN = '/src/(widgets|ui)/.+\\.tsx$';
const INDEX_PATTERN = /\/index\.tsx?$/;
const TEST_PATTERN = /\.(test|spec)\.tsx?$/;
const basenameWithoutExt = (filename) => {
    const slash = filename.lastIndexOf('/');
    const base = slash === -1 ? filename : filename.slice(slash + 1);
    const dot = base.lastIndexOf('.');
    return dot === -1 ? base : base.slice(0, dot);
};
const isPascalCase = (name) => {
    if (name.length === 0)
        return false;
    const first = name.charAt(0);
    return first !== first.toLowerCase() && first === first.toUpperCase();
};
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Each `.tsx` file under `src/widgets/` or `src/ui/` exports exactly one component, named after the file.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    enforcePattern: { type: 'string' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            tooMany: 'File `{{file}}.tsx` exports multiple components: {{names}}. Doctrine: one component per file. Move helpers into their own files (and consider whether they belong in `~/ui/`). See ts/CLAUDE.md §Component-driven design.',
            none: 'File `{{file}}.tsx` exports no component. Either rename to a lowercase filename (utility) or add the `{{file}}` component export.',
            wrongName: 'File `{{file}}.tsx` exports component `{{exportedName}}` but should export `{{file}}` (one component per file, named after the file).',
        },
    },
    create(context) {
        const options = (context.options[0] ?? {});
        const enforcePattern = new RegExp(options.enforcePattern ?? DEFAULT_ENFORCE_PATTERN);
        const filename = context.filename;
        if (!enforcePattern.test(filename))
            return {};
        if (INDEX_PATTERN.test(filename))
            return {};
        if (TEST_PATTERN.test(filename))
            return {};
        const expected = basenameWithoutExt(filename);
        if (!isPascalCase(expected))
            return {};
        const componentExportNames = [];
        return {
            ExportNamedDeclaration(node) {
                const decl = node.declaration;
                if (decl === null || decl === undefined) {
                    // `export { Foo, Bar }` — re-export form. Count any PascalCase
                    // specifier as a component export.
                    for (const spec of node.specifiers) {
                        const exported = spec.exported;
                        if (exported.type !== 'Identifier')
                            continue;
                        if (isPascalCase(exported.name))
                            componentExportNames.push(exported.name);
                    }
                    return;
                }
                if (decl.type === 'VariableDeclaration') {
                    for (const declarator of decl.declarations) {
                        const id = declarator.id;
                        if (id.type !== 'Identifier')
                            continue;
                        if (isPascalCase(id.name))
                            componentExportNames.push(id.name);
                    }
                    return;
                }
                if (decl.type === 'FunctionDeclaration') {
                    if (decl.id !== null && decl.id !== undefined && isPascalCase(decl.id.name)) {
                        componentExportNames.push(decl.id.name);
                    }
                    return;
                }
                // Type-only declarations (TSTypeAliasDeclaration, TSInterfaceDeclaration,
                // TSEnumDeclaration, ClassDeclaration) are NOT counted as components.
            },
            'Program:exit'(node) {
                if (componentExportNames.length === 0) {
                    context.report({
                        node,
                        messageId: 'none',
                        data: { file: expected },
                    });
                    return;
                }
                if (componentExportNames.length > 1) {
                    context.report({
                        node,
                        messageId: 'tooMany',
                        data: { file: expected, names: componentExportNames.join(', ') },
                    });
                    return;
                }
                const only = componentExportNames[0];
                if (only !== expected) {
                    context.report({
                        node,
                        messageId: 'wrongName',
                        data: { file: expected, exportedName: only },
                    });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=oneComponentPerFile.js.map