import type { Rule } from "eslint";

/**
 * WHY (Defence Before Fix): a ToolModule's run() spawns a subprocess via
 * execTool(). Any tool that needs to tell the subprocess which part of the
 * tree to analyse MUST derive that scope from the RunContext it was given
 * (ctx.cwd, ctx.path) or leave it to the underlying tool's own config file —
 * never bake in a literal guess at the consumer's layout. "src" is the
 * confirmed offender: dependency-cruiser was invoked with a hardcoded `src`
 * positional argument, so it failed outright on any consumer whose source
 * tree is not literally rooted at a top-level `src/` (e.g. `apps/web/src/`).
 *
 * Scope: only src/tools/*.ts, ts-qa-ci's own tool-authoring surface. This is
 * a meta-rule over how a ToolModule is written, not something a consumer's
 * application code could ever trigger (consumers never call execTool()).
 *
 * Narrowing: only the literal "src" is banned, not every bare string literal
 * in an execTool() args array. Other tools legitimately pass bare literal
 * subcommand names (`"eslint"`, `"stryker"`, `"run"`) that are not paths and
 * do not carry the hazard — banning those would be a false positive under
 * clause 3.1's upper bound. "src" is never a legitimate subcommand or flag
 * value for any tool this package spawns, so the literal itself is the
 * complete, precise signal for the hazard.
 */
const TOOLS_DIR_MARKER = "/src/tools/";
const BANNED_LITERAL = "src";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow the literal "src" as a hardcoded project-layout assumption in an execTool() call',
    },
    schema: [],
    messages: {
      hardcodedSrc:
        'Hardcoded "src" passed to execTool() bakes in a project-layout assumption. Derive the scope from ctx.cwd/ctx.path, or let the underlying tool\'s own config own it — see docs/cdd-rules.md#no-hardcoded-tool-source-path.',
    },
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes(TOOLS_DIR_MARKER)) {
      return {};
    }
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "execTool") {
          return;
        }
        for (const arg of node.arguments) {
          if (arg.type !== "ArrayExpression") continue;
          for (const element of arg.elements) {
            if (
              element !== null &&
              element.type === "Literal" &&
              element.value === BANNED_LITERAL
            ) {
              context.report({ node: element, messageId: "hardcodedSrc" });
            }
          }
        }
      },
    };
  },
};

export default rule;
