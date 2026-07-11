import type { Rule } from "eslint";

/**
 * WHY: default exports defeat refactor tooling — renaming the symbol in
 * its source file does NOT update import sites because each importer can
 * pick its own name. Find-references is unreliable; auto-rename is
 * unreliable; "go to definition" works but the rest of the toolbox doesn't.
 *
 * Exception (carved by `widget-mount-contract`): widgets MUST default-export
 * their mount function — the wedge loader uses `import(path).then(m => m.default)`
 * to call the mount. The carve-out is just for `src/widgets/<name>/index.{ts,tsx}`.
 *
 * Ported verbatim from admin-ts's dbf/no-default-export (Plan 00004 adoption):
 * a purely syntactic rule over the ExportDefaultDeclaration node — no type
 * information required. The widget-mount carve-out is hard-coded to match the
 * original (no schema options), so `schema: []` is preserved.
 */
const WIDGET_MOUNT_ENTRY = /\/src\/widgets\/[^/]+\/index\.[cm]?tsx?$/;

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `export default` except in widget mount entries.",
    },
    schema: [],
    messages: {
      default:
        "Avoid `export default`. Use a named export so renames propagate cleanly.",
    },
  },
  create(context) {
    const filename = context.filename;
    // Widget mount points are the one allowed shape.
    if (WIDGET_MOUNT_ENTRY.test(filename)) {
      return {};
    }
    return {
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: "default" });
      },
    };
  },
};

export default rule;
